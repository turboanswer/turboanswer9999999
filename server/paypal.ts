import { Request, Response } from "express";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const PAYPAL_BASE_URL = "https://api-m.paypal.com";

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60000) {
    return cachedAccessToken.token;
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

async function paypalRequest(method: string, path: string, body?: any): Promise<any> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (method === "POST") {
    headers["PayPal-Request-Id"] = `turbo-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  }

  const res = await fetch(`${PAYPAL_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal API error ${res.status}: ${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

let planIds: { pro: string; research: string; enterprise: string } | null = null;

export async function ensureSubscriptionPlans(): Promise<{ pro: string; research: string; enterprise: string }> {
  if (planIds) return planIds;

  const token = await getAccessToken();

  const plans = await paypalRequest("GET", "/v1/billing/plans?page_size=20&page=1&total_required=true");
  
  let proPlanId: string | null = null;
  let researchPlanId: string | null = null;
  let enterprisePlanId: string | null = null;

  const deactivatePlan = async (id: string, reason: string) => {
    console.log(`[PayPal] Deactivating plan ${id}: ${reason}`);
    await paypalRequest("POST", `/v1/billing/plans/${id}/deactivate`, {}).catch(() => {});
  };

  for (const plan of plans.plans || []) {
    if (plan.status !== "ACTIVE") continue;

    if (plan.name === "Turbo Answer Pro") {
      try {
        const details = await paypalRequest("GET", `/v1/billing/plans/${plan.id}`);
        const hasTrial = details?.billing_cycles?.some((c: any) => c.tenure_type === "TRIAL");
        if (hasTrial) {
          proPlanId = plan.id;
        } else {
          await deactivatePlan(plan.id, "no 7-day trial — will recreate");
        }
      } catch { proPlanId = plan.id; }
    }

    if (plan.name === "Turbo Answer Research") {
      try {
        const details = await paypalRequest("GET", `/v1/billing/plans/${plan.id}`);
        const hasTrial = details?.billing_cycles?.some((c: any) => c.tenure_type === "TRIAL");
        const regularCycle = details?.billing_cycles?.find((c: any) => c.tenure_type === "REGULAR");
        const price = regularCycle?.pricing_scheme?.fixed_price?.value;
        if (hasTrial && price && parseFloat(price) === 30) {
          researchPlanId = plan.id;
        } else {
          await deactivatePlan(plan.id, `missing trial or wrong price ($${price}, expected $30) — will recreate`);
        }
      } catch { researchPlanId = plan.id; }
    }

    if (plan.name === "Turbo Answer Enterprise") {
      try {
        const details = await paypalRequest("GET", `/v1/billing/plans/${plan.id}`);
        const hasTrial = details?.billing_cycles?.some((c: any) => c.tenure_type === "TRIAL");
        const regularCycle = details?.billing_cycles?.find((c: any) => c.tenure_type === "REGULAR");
        const price = regularCycle?.pricing_scheme?.fixed_price?.value;
        if (hasTrial && price && parseFloat(price) === 100) {
          enterprisePlanId = plan.id;
        } else {
          await deactivatePlan(plan.id, `missing trial or wrong price ($${price}, expected $100) — will recreate`);
        }
      } catch { enterprisePlanId = plan.id; }
    }
  }

  if (!proPlanId || !researchPlanId || !enterprisePlanId) {
    let productId: string | null = null;
    const products = await paypalRequest("GET", "/v1/catalogs/products?page_size=20&page=1&total_required=true");
    for (const product of products.products || []) {
      if (product.name === "TurboAnswer AI") {
        productId = product.id;
        break;
      }
    }

    if (!productId) {
      const product = await paypalRequest("POST", "/v1/catalogs/products", {
        name: "TurboAnswer AI",
        description: "AI-powered assistant with multiple subscription tiers",
        type: "SERVICE",
        category: "SOFTWARE",
      });
      productId = product.id;
      console.log("[PayPal] Created product:", productId);
    }

    const trialCycle = {
      frequency: { interval_unit: "DAY", interval_count: 7 },
      tenure_type: "TRIAL",
      sequence: 1,
      total_cycles: 1,
      pricing_scheme: { fixed_price: { value: "0", currency_code: "USD" } },
    };

    if (!proPlanId) {
      const plan = await paypalRequest("POST", "/v1/billing/plans", {
        product_id: productId,
        name: "Turbo Answer Pro",
        description: "Pro tier - Gemini 2.5 Flash Pro with advanced AI. 7-day free trial.",
        status: "ACTIVE",
        billing_cycles: [
          trialCycle,
          {
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            tenure_type: "REGULAR",
            sequence: 2,
            total_cycles: 0,
            pricing_scheme: { fixed_price: { value: "6.99", currency_code: "USD" } },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          payment_failure_threshold: 3,
          setup_fee: { value: "0", currency_code: "USD" },
          setup_fee_failure_action: "CONTINUE",
        },
      });
      proPlanId = plan.id;
      console.log("[PayPal] Created Pro plan (with 7-day trial):", proPlanId);
    }

    if (!researchPlanId) {
      const plan = await paypalRequest("POST", "/v1/billing/plans", {
        product_id: productId,
        name: "Turbo Answer Research",
        description: "Research tier - Antigravity + Gemini 3.1 Pro + AI Video Studio. 7-day free trial.",
        status: "ACTIVE",
        billing_cycles: [
          trialCycle,
          {
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            tenure_type: "REGULAR",
            sequence: 2,
            total_cycles: 0,
            pricing_scheme: { fixed_price: { value: "30.00", currency_code: "USD" } },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          payment_failure_threshold: 3,
          setup_fee: { value: "0", currency_code: "USD" },
          setup_fee_failure_action: "CONTINUE",
        },
      });
      researchPlanId = plan.id;
      console.log("[PayPal] Created Research plan (with 7-day trial):", researchPlanId);
    }

    if (!enterprisePlanId) {
      const plan = await paypalRequest("POST", "/v1/billing/plans", {
        product_id: productId,
        name: "Turbo Answer Enterprise",
        description: "Enterprise tier - 5 members, Antigravity, Research + Video Studio. 7-day free trial.",
        status: "ACTIVE",
        billing_cycles: [
          trialCycle,
          {
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            tenure_type: "REGULAR",
            sequence: 2,
            total_cycles: 0,
            pricing_scheme: { fixed_price: { value: "100.00", currency_code: "USD" } },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          payment_failure_threshold: 3,
          setup_fee: { value: "0", currency_code: "USD" },
          setup_fee_failure_action: "CONTINUE",
        },
      });
      enterprisePlanId = plan.id;
      console.log("[PayPal] Created Enterprise plan (with 7-day trial):", enterprisePlanId);
    }
  }

  planIds = { pro: proPlanId!, research: researchPlanId!, enterprise: enterprisePlanId! };
  console.log("[PayPal] Subscription plans ready:", planIds);
  return planIds;
}

export async function createSubscription(
  planTier: "pro" | "research" | "enterprise",
  userEmail: string | null,
  userId: string,
  returnUrl: string,
  cancelUrl: string,
  priceOverride?: string,
): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const plans = await ensureSubscriptionPlans();
  const planId = planTier === "enterprise" ? plans.enterprise : planTier === "research" ? plans.research : plans.pro;

  const body: any = {
    plan_id: planId,
    application_context: {
      brand_name: "TurboAnswer",
      locale: "en-US",
      shipping_preference: "NO_SHIPPING",
      user_action: "SUBSCRIBE_NOW",
      payment_method: {
        payer_selected: "PAYPAL",
        payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
      },
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
    custom_id: JSON.stringify({ userId, tier: planTier }),
  };

  if (priceOverride) {
    body.plan = {
      billing_cycles: [{
        frequency: { interval_unit: "MONTH", interval_count: 1 },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: { value: priceOverride, currency_code: "USD" },
        },
      }],
    };
    console.log(`[PayPal] Price override applied: $${priceOverride}/mo`);
  }

  if (userEmail) {
    body.subscriber = { email_address: userEmail };
  }

  const subscription = await paypalRequest("POST", "/v1/billing/subscriptions", body);

  const approvalLink = subscription.links?.find((l: any) => l.rel === "approve");
  if (!approvalLink) {
    throw new Error("No approval URL returned from PayPal");
  }

  return {
    subscriptionId: subscription.id,
    approvalUrl: approvalLink.href,
  };
}

export async function getSubscriptionDetails(subscriptionId: string): Promise<any> {
  return paypalRequest("GET", `/v1/billing/subscriptions/${subscriptionId}`);
}

export async function cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
  await paypalRequest("POST", `/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    reason,
  });
}

export async function getSubscriptionTransactions(subscriptionId: string): Promise<any[]> {
  const now = new Date().toISOString();
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const result = await paypalRequest(
      "GET",
      `/v1/billing/subscriptions/${subscriptionId}/transactions?start_time=${startDate}&end_time=${now}`
    );
    return result.transactions || [];
  } catch (e: any) {
    console.log('[PayPal] Could not fetch transactions:', e.message?.substring(0, 100));
    return [];
  }
}

export async function refundCapture(captureId: string, amount?: { value: string; currency_code: string }): Promise<any> {
  const body = amount ? { amount } : {};
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "PayPal-Request-Id": `refund-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
  };

  const res = await fetch(`${PAYPAL_BASE_URL}/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal refund error ${res.status}: ${text}`);
  }

  if (res.status === 204) return { status: 'COMPLETED' };
  return res.json();
}

let codeStudioAddonPlanId: string | null = null;

export async function getOrCreateAddonPlan(): Promise<string> {
  if (codeStudioAddonPlanId) return codeStudioAddonPlanId;

  const plans = await paypalRequest("GET", "/v1/billing/plans?page_size=20&page=1&total_required=true");

  for (const plan of plans.plans || []) {
    if (plan.status !== "ACTIVE" || plan.name !== "Turbo Answer Code Studio") continue;
    try {
      const details = await paypalRequest("GET", `/v1/billing/plans/${plan.id}`);
      const regularCycle = details?.billing_cycles?.find((c: any) => c.tenure_type === "REGULAR");
      const price = regularCycle?.pricing_scheme?.fixed_price?.value;
      if (price && parseFloat(price) === 10) {
        codeStudioAddonPlanId = plan.id;
        console.log("[PayPal] Found existing Code Studio add-on plan:", codeStudioAddonPlanId);
        return codeStudioAddonPlanId;
      } else {
        await paypalRequest("POST", `/v1/billing/plans/${plan.id}/deactivate`, {}).catch(() => {});
      }
    } catch {
      codeStudioAddonPlanId = plan.id;
      return codeStudioAddonPlanId;
    }
  }

  let productId: string | null = null;
  const products = await paypalRequest("GET", "/v1/catalogs/products?page_size=20&page=1&total_required=true");
  for (const product of products.products || []) {
    if (product.name === "TurboAnswer AI") { productId = product.id; break; }
  }
  if (!productId) {
    const product = await paypalRequest("POST", "/v1/catalogs/products", {
      name: "TurboAnswer AI",
      description: "AI-powered assistant with multiple subscription tiers",
      type: "SERVICE",
      category: "SOFTWARE",
    });
    productId = product.id;
  }

  const plan = await paypalRequest("POST", "/v1/billing/plans", {
    product_id: productId,
    name: "Turbo Answer Code Studio",
    description: "Code Studio add-on — Full AI-powered IDE. $10/month add-on for any plan.",
    status: "ACTIVE",
    billing_cycles: [
      {
        frequency: { interval_unit: "MONTH", interval_count: 1 },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: "10.00", currency_code: "USD" } },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      payment_failure_threshold: 3,
      setup_fee: { value: "0", currency_code: "USD" },
      setup_fee_failure_action: "CONTINUE",
    },
  });
  codeStudioAddonPlanId = plan.id;
  console.log("[PayPal] Created Code Studio add-on plan:", codeStudioAddonPlanId);
  return codeStudioAddonPlanId;
}

export async function createAddonSubscription(
  userEmail: string | null,
  userId: string,
  returnUrl: string,
  cancelUrl: string,
): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const planId = await getOrCreateAddonPlan();

  const body: any = {
    plan_id: planId,
    application_context: {
      brand_name: "TurboAnswer",
      locale: "en-US",
      shipping_preference: "NO_SHIPPING",
      user_action: "SUBSCRIBE_NOW",
      payment_method: {
        payer_selected: "PAYPAL",
        payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
      },
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
    custom_id: JSON.stringify({ userId, tier: "code-studio-addon" }),
  };

  if (userEmail) body.subscriber = { email_address: userEmail };

  const subscription = await paypalRequest("POST", "/v1/billing/subscriptions", body);
  const approvalUrl = subscription.links?.find((l: any) => l.rel === "approve")?.href;
  if (!approvalUrl) throw new Error("No approval URL returned from PayPal for add-on");
  return { subscriptionId: subscription.id, approvalUrl };
}

export function getPayPalClientId(): string {
  return PAYPAL_CLIENT_ID;
}
