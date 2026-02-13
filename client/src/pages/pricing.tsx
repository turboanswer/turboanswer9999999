import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Check, Crown, Zap, MessageSquare, Headphones, Loader2, Heart, HandHeart } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  apiPlan?: 'pro' | 'research' | 'ultimate' | 'enterprise';
}

const plans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with basic AI conversations',
    features: [
      'Google Gemini 2.5 Flash',
      'Voice commands',
      'Unlimited conversations',
      'Community support',
      'Basic conversation history'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$6.99',
    period: 'per month',
    description: 'Advanced AI with Gemini Pro power',
    features: [
      'Google Gemini Flash Pro',
      'Advanced AI reasoning',
      'Superior code analysis',
      'Enhanced problem solving',
      'Priority support',
      'Everything in Free'
    ],
    popular: true,
    apiPlan: 'pro'
  },
  {
    id: 'research',
    name: 'Research',
    price: '$15',
    period: 'per month',
    description: 'Ultimate AI with deep research capabilities',
    features: [
      'Google Gemini 2.5 Pro',
      'Deep research & analysis',
      'Comprehensive reasoning',
      'All Pro features included',
      'Maximum AI intelligence',
      'Priority support'
    ],
    apiPlan: 'research'
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: '$25',
    period: 'per month',
    description: 'GPT-4o powered AI for superior coding & reasoning',
    features: [
      'OpenAI GPT-4o model',
      'Superior coding & reasoning',
      'All Research + Pro features',
      'Best-in-class code generation',
      'Advanced multimodal understanding',
      'Priority support'
    ],
    apiPlan: 'ultimate'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$50',
    period: 'per month',
    description: 'Team access with shareable code — save 33% vs individual plans',
    features: [
      'All Research features included',
      'Shareable 6-digit team code',
      'Up to 5 team members',
      'Research-level access for all members',
      'Save 33% compared to 5 individual Research plans',
      'Priority enterprise support'
    ],
    apiPlan: 'enterprise'
  }
];

export default function Pricing() {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState<{ price: string; label: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const applyPromoMutation = useMutation({
    mutationFn: async ({ promoCode }: { promoCode: string }) => {
      const promoResponse = await apiRequest('POST', '/api/apply-promo', {
        promoCode: promoCode.toUpperCase()
      });
      
      return await promoResponse.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      setPromoCode('');
      setShowPromoCode(false);
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Code",
        description: error.message || "This promo code is not valid",
        variant: "destructive",
      });
    }
  });

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await apiRequest("POST", "/api/validate-coupon", { coupon: couponCode.trim().toUpperCase() });
      const data = await res.json();
      if (data.valid) {
        setCouponApplied(true);
        setCouponDiscount({ price: data.discountedPrice, label: data.label });
        toast({ title: "Coupon Applied!", description: data.label });
      }
    } catch (error: any) {
      toast({ title: "Invalid Coupon", description: error.message || "This coupon is not valid.", variant: "destructive" });
      setCouponApplied(false);
      setCouponDiscount(null);
    }
  };

  const handleCheckout = async (plan: PricingPlan) => {
    if (!plan.apiPlan) return;
    setCheckoutLoading(plan.id);
    try {
      const body: any = { plan: plan.apiPlan };
      if (plan.id === 'enterprise' && couponApplied && couponCode.trim()) {
        body.coupon = couponCode.trim().toUpperCase();
      }
      const res = await apiRequest("POST", "/api/checkout", body);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      toast({
        title: "Checkout Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
      setCheckoutLoading(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: 'white',
      padding: '40px 20px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: '#2563eb',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)'
        }}>
          <Crown size={32} color="white" />
        </div>
        
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, #60a5fa, #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Choose Your Plan
        </h1>
        
        <p style={{
          fontSize: '20px',
          color: '#9ca3af',
          maxWidth: '600px',
          margin: '0 auto 24px'
        }}>
          Unlock the full power of AI with our premium plans. Start free or upgrade for unlimited access.
        </p>

        <button
          onClick={() => setShowPromoCode(!showPromoCode)}
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: '#60a5fa',
            border: '1px solid #60a5fa',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          Have a promo code?
        </button>

        {showPromoCode && (
          <div style={{
            maxWidth: '400px',
            margin: '0 auto 32px',
            padding: '20px',
            backgroundColor: '#111111',
            borderRadius: '8px',
            border: '1px solid #333333'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333333',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '16px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => applyPromoMutation.mutate({ promoCode })}
                disabled={!promoCode.trim() || applyPromoMutation.isPending}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: applyPromoMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: (!promoCode.trim() || applyPromoMutation.isPending) ? 0.5 : 1
                }}
              >
                {applyPromoMutation.isPending ? 'Applying...' : 'Apply Code'}
              </button>
              <button
                onClick={() => { setShowPromoCode(false); setPromoCode(''); }}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  color: '#9ca3af',
                  border: '1px solid #333333',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '30px',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            style={{
              backgroundColor: plan.popular ? '#1e1b4b' : '#111111',
              border: plan.popular ? '2px solid #3b82f6' : '1px solid #333333',
              borderRadius: '16px',
              padding: '32px',
              position: 'relative',
              transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.2s'
            }}
          >
            {plan.popular && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '6px 20px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Most Popular
              </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                {plan.name}
              </h3>
              <div style={{ marginBottom: '8px' }}>
                <span style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: plan.popular ? '#60a5fa' : '#ffffff'
                }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: '16px', color: '#9ca3af', marginLeft: '8px' }}>
                  {plan.period}
                </span>
              </div>
              <p style={{ fontSize: '16px', color: '#9ca3af' }}>
                {plan.description}
              </p>
            </div>

            <div style={{ marginBottom: '32px' }}>
              {plan.features.map((feature, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <Check size={20} style={{ color: '#10b981', marginRight: '12px', flexShrink: 0 }} />
                  <span style={{ fontSize: '16px' }}>{feature}</span>
                </div>
              ))}
            </div>

            {plan.id === 'free' ? (
              <button
                onClick={() => { window.location.href = '/'; }}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Start Free
              </button>
            ) : (
              <>
                {plan.id === 'enterprise' && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Coupon code"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value); if (couponApplied) { setCouponApplied(false); setCouponDiscount(null); } }}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          backgroundColor: '#1f2937',
                          color: 'white',
                          border: couponApplied ? '1px solid #10b981' : '1px solid #374151',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || couponApplied}
                        style={{
                          padding: '10px 16px',
                          backgroundColor: couponApplied ? '#10b981' : '#6366f1',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: !couponCode.trim() || couponApplied ? 'not-allowed' : 'pointer',
                          opacity: !couponCode.trim() ? 0.5 : 1
                        }}
                      >
                        {couponApplied ? '✓ Applied' : 'Apply'}
                      </button>
                    </div>
                    {couponApplied && couponDiscount && (
                      <p style={{ fontSize: '13px', color: '#10b981', marginTop: '6px', textAlign: 'center' }}>
                        {couponDiscount.label}
                      </p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => handleCheckout(plan)}
                  disabled={checkoutLoading === plan.id}
                  style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: plan.popular ? '#3b82f6' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: checkoutLoading === plan.id ? 'not-allowed' : 'pointer',
                    opacity: checkoutLoading === plan.id ? 0.7 : 1
                  }}
                >
                  {checkoutLoading === plan.id ? 'Loading...' : (
                    plan.id === 'enterprise' && couponApplied && couponDiscount
                      ? `Subscribe with PayPal - ${couponDiscount.price}/mo`
                      : `Subscribe with PayPal - ${plan.price}/mo`
                  )}
                </button>
                <p style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                  Cancel anytime. Secure payment via PayPal.
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{
        maxWidth: '600px',
        margin: '40px auto 0',
        padding: '0 20px',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          borderRadius: '16px',
          padding: '28px 32px',
          border: '1px solid rgba(148, 163, 184, 0.15)'
        }}>
          <h3 style={{ color: '#f8fafc', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
            Need more than 5 team members?
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
            We offer custom team plans for larger organizations. Get in touch and we'll create a plan that fits your team.
          </p>
          <a
            href="mailto:support@turboanswer.it.com?subject=Custom%20Enterprise%20Plan%20Inquiry"
            style={{
              display: 'inline-block',
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            Contact support@turboanswer.it.com
          </a>
        </div>
      </div>

      <div style={{
        maxWidth: '700px',
        margin: '60px auto 0',
        padding: '0 20px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #831843, #312e81)',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          border: '1px solid rgba(236, 72, 153, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#ec4899',
            color: 'white',
            padding: '6px 20px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Always Free
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(236, 72, 153, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <HandHeart size={28} color="#f472b6" />
          </div>
          <h3 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
            Crisis Support
          </h3>
          <p style={{ fontSize: '16px', color: '#e2d1f0', marginBottom: '20px', maxWidth: '500px', margin: '0 auto 20px' }}>
            24/7 private, encrypted mental health companion. A caring AI that truly listens and talks through what you're going through - not just a hotline list.
          </p>
          <div style={{ marginBottom: '24px', textAlign: 'left', maxWidth: '400px', margin: '0 auto 24px' }}>
            {[
              'AES-256 encrypted private conversations',
              'Warm, conversational AI companion',
              'Anxiety, depression, grief & more',
              'Zero judgment, zero data sharing',
              'Delete all data permanently anytime',
              'Available 24/7, no appointment needed'
            ].map((feature, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <Check size={18} style={{ color: '#f472b6', marginRight: '10px', flexShrink: 0 }} />
                <span style={{ fontSize: '15px', color: '#e2d1f0' }}>{feature}</span>
              </div>
            ))}
          </div>
          <a
            href="/crisis-info"
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #ec4899, #6366f1)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none'
            }}
          >
            <Heart size={18} />
            Learn More
          </a>
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#c4b5d0', marginTop: '10px' }}>
            Free for all users. No subscription required.
          </p>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '80px auto 0',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '48px' }}>
          Why Choose Turbo AI?
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '32px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <Zap size={48} style={{ color: '#3b82f6', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              Lightning Fast
            </h3>
            <p style={{ color: '#9ca3af' }}>
              Get instant responses from the most advanced AI models
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <MessageSquare size={48} style={{ color: '#10b981', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              Unlimited Conversations
            </h3>
            <p style={{ color: '#9ca3af' }}>
              Chat as much as you want with no daily limits
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <Headphones size={48} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              Priority Support
            </h3>
            <p style={{ color: '#9ca3af' }}>
              Get help when you need it with our dedicated support team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
