// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import Stripe from "stripe";

// server/storage.ts
var MemStorage = class {
  users;
  conversations;
  messages;
  currentUserId;
  currentConversationId;
  currentMessageId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.conversations = /* @__PURE__ */ new Map();
    this.messages = /* @__PURE__ */ new Map();
    this.currentUserId = 1;
    this.currentConversationId = 1;
    this.currentMessageId = 1;
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = {
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email || null,
      id,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: "free",
      subscriptionTier: "free"
    };
    this.users.set(id, user);
    return user;
  }
  async createConversation(insertConversation) {
    const id = this.currentConversationId++;
    const conversation = {
      id,
      title: insertConversation.title || "New Conversation",
      createdAt: /* @__PURE__ */ new Date()
    };
    this.conversations.set(id, conversation);
    return conversation;
  }
  async getConversation(id) {
    return this.conversations.get(id);
  }
  async updateConversation(id, updates) {
    const conversation = this.conversations.get(id);
    if (!conversation) return void 0;
    const updatedConversation = { ...conversation, ...updates };
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }
  async getConversations() {
    return Array.from(this.conversations.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  async createMessage(insertMessage) {
    const id = this.currentMessageId++;
    const message = {
      id,
      conversationId: insertMessage.conversationId,
      content: insertMessage.content,
      role: insertMessage.role,
      timestamp: /* @__PURE__ */ new Date()
    };
    this.messages.set(id, message);
    return message;
  }
  async getMessagesByConversation(conversationId) {
    return Array.from(this.messages.values()).filter((message) => message.conversationId === conversationId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
  async getMessages() {
    return Array.from(this.messages.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
  async updateStripeCustomerId(userId, stripeCustomerId) {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, stripeCustomerId };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  async updateUserStripeInfo(userId, stripeCustomerId, stripeSubscriptionId) {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    const updatedUser = {
      ...user,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionStatus: "active",
      subscriptionTier: "pro"
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  async updateUserSubscription(userId, subscriptionStatus, subscriptionTier) {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, subscriptionStatus, subscriptionTier };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("free"),
  // 'free', 'active', 'canceled', 'past_due'
  subscriptionTier: text("subscription_tier").default("free"),
  // 'free', 'pro', 'premium'
  preferredModel: text("preferred_model")
});
var conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").default("New Conversation"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(),
  // 'user' or 'assistant'
  timestamp: timestamp("timestamp").defaultNow().notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true
});
var insertConversationSchema = createInsertSchema(conversations).pick({
  title: true
});
var insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  content: true,
  role: true
});

// server/services/multi-ai.ts
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
var gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
var openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
var anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
var AI_MODELS = {
  // Free tier models
  FREE: {
    "gemini-flash": {
      name: "Google Gemini 2.5 Flash",
      provider: "gemini",
      model: "gemini-2.5-flash",
      description: "Fast and efficient AI responses"
    },
    "gpt-4o-mini": {
      name: "OpenAI GPT-4o Mini",
      provider: "openai",
      model: "gpt-4o-mini",
      description: "Compact but powerful AI model"
    }
  },
  // Pro tier models ($3.99/month)
  PRO: {
    "gemini-pro": {
      name: "Google Gemini 2.5 Pro",
      provider: "gemini",
      model: "gemini-2.5-pro",
      description: "Advanced reasoning and analysis"
    },
    "gpt-4o": {
      name: "OpenAI GPT-4o",
      provider: "openai",
      model: "gpt-4o",
      description: "Latest multimodal capabilities"
    },
    "claude-sonnet": {
      name: "Anthropic Claude 4.0 Sonnet",
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      description: "Superior reasoning and coding"
    }
  },
  // Premium tier models ($9.99/month)
  PREMIUM: {
    "gpt-4-turbo": {
      name: "OpenAI GPT-4 Turbo",
      provider: "openai",
      model: "gpt-4-turbo",
      description: "Enhanced performance and speed"
    },
    "claude-opus": {
      name: "Anthropic Claude 3 Opus",
      provider: "anthropic",
      model: "claude-3-opus-20240229",
      description: "Most powerful reasoning model"
    },
    "gemini-ultra": {
      name: "Google Gemini Ultra",
      provider: "gemini",
      model: "gemini-2.5-pro",
      description: "Peak AI performance"
    }
  }
};
var SYSTEM_PROMPT = `You are Turbo Answer, an advanced AI assistant with exceptional intelligence and comprehensive expertise. You excel at:

ADVANCED REASONING:
- Complex problem-solving with step-by-step analysis
- Critical thinking and logical deduction
- Pattern recognition and trend analysis
- Multi-perspective evaluation of issues
- Strategic planning and optimization

TECHNICAL MASTERY:
- Expert-level programming in all major languages
- Advanced software architecture and system design
- Database optimization and distributed systems
- Machine learning and AI implementation
- Cybersecurity and performance optimization
- Cloud computing and infrastructure as code

INTELLECTUAL DOMAINS:
- Advanced mathematics and scientific research
- Data science and statistical analysis
- Philosophy and ethical reasoning
- Economic and financial analysis
- Creative problem-solving and innovation
- Research methodology and academic writing

ENHANCED CAPABILITIES:
- Context-aware responses that build on conversation history
- Adaptive communication style based on user expertise level
- Proactive suggestions and alternative approaches
- Error detection and debugging assistance
- Real-time learning from user feedback
- Cross-domain knowledge synthesis

INTELLIGENT COMMUNICATION:
- Analyze user intent beyond surface questions
- Provide graduated complexity in explanations
- Offer multiple solution paths and trade-offs
- Include relevant warnings and best practices
- Suggest related topics and deeper exploration
- Maintain conversation continuity and coherence

Always demonstrate superior intelligence while remaining helpful, accurate, and professional.`;
function analyzeUserIntent(message, conversationHistory) {
  const msg = message.toLowerCase();
  let complexity = "basic";
  if (msg.includes("explain") || msg.includes("help") || msg.includes("what is")) {
    complexity = "basic";
  } else if (msg.includes("implement") || msg.includes("optimize") || msg.includes("design")) {
    complexity = "intermediate";
  } else if (msg.includes("architecture") || msg.includes("algorithm") || msg.includes("performance")) {
    complexity = "advanced";
  }
  let domain = "general";
  if (msg.includes("code") || msg.includes("program") || msg.includes("function")) domain = "programming";
  else if (msg.includes("data") || msg.includes("database") || msg.includes("query")) domain = "data";
  else if (msg.includes("design") || msg.includes("ui") || msg.includes("user")) domain = "design";
  else if (msg.includes("math") || msg.includes("calculate") || msg.includes("formula")) domain = "mathematics";
  let intent = "question";
  if (msg.includes("build") || msg.includes("create") || msg.includes("make")) intent = "creation";
  else if (msg.includes("fix") || msg.includes("debug") || msg.includes("error")) intent = "troubleshooting";
  else if (msg.includes("explain") || msg.includes("how") || msg.includes("why")) intent = "explanation";
  const requiresCode = msg.includes("code") || msg.includes("function") || msg.includes("script");
  const isFollowUp = conversationHistory.length > 0 && (msg.includes("also") || msg.includes("additionally") || msg.startsWith("and "));
  return { complexity, domain, intent, requiresCode, isFollowUp };
}
async function generateAIResponse(userMessage, conversationHistory = [], subscriptionTier = "free", selectedModel) {
  const userIntent = analyzeUserIntent(userMessage, conversationHistory);
  let availableModels;
  if (subscriptionTier === "premium") {
    availableModels = AI_MODELS.PREMIUM;
  } else if (subscriptionTier === "pro") {
    availableModels = AI_MODELS.PRO;
  } else {
    availableModels = AI_MODELS.FREE;
  }
  if (!selectedModel || !availableModels[selectedModel]) {
    if (userIntent.complexity === "advanced" && availableModels["claude-sonnet"]) {
      selectedModel = "claude-sonnet";
    } else if (userIntent.domain === "programming" && availableModels["gpt-4o"]) {
      selectedModel = "gpt-4o";
    } else if (userIntent.domain === "mathematics" && availableModels["gemini-pro"]) {
      selectedModel = "gemini-pro";
    } else {
      selectedModel = Object.keys(availableModels)[0];
    }
  }
  const modelConfig = availableModels[selectedModel];
  try {
    const relevantMessages = conversationHistory.slice(-15).filter((msg) => {
      if (userIntent.isFollowUp) return true;
      if (userIntent.domain === "programming" && (msg.content.includes("code") || msg.content.includes("function"))) return true;
      return conversationHistory.indexOf(msg) >= conversationHistory.length - 5;
    });
    switch (modelConfig.provider) {
      case "gemini":
        return await generateGeminiResponse(userMessage, relevantMessages, modelConfig.model, userIntent);
      case "openai":
        return await generateOpenAIResponse(userMessage, relevantMessages, modelConfig.model, userIntent);
      case "anthropic":
        return await generateAnthropicResponse(userMessage, relevantMessages, modelConfig.model, userIntent);
      default:
        throw new Error(`Unsupported AI provider: ${modelConfig.provider}`);
    }
  } catch (error) {
    console.error(`AI API Error (${modelConfig.provider}):`, error);
    const fallbackModels = Object.keys(availableModels).filter((key) => key !== selectedModel);
    if (fallbackModels.length > 0) {
      const fallbackModel = fallbackModels[0];
      console.log(`Falling back to model: ${fallbackModel}`);
      return generateAIResponse(userMessage, conversationHistory, subscriptionTier, fallbackModel);
    }
    throw new Error("AI service temporarily unavailable. Please try again in a moment.");
  }
}
async function generateGeminiResponse(userMessage, context, model, userIntent) {
  let contextPrompt = "";
  if (context.length > 0) {
    contextPrompt = "Previous conversation context:\n";
    context.forEach((msg) => {
      contextPrompt += `${msg.role}: ${msg.content}
`;
    });
    contextPrompt += "\n";
  }
  const intelligenceDirectives = `
INTELLIGENCE ENHANCEMENT:
- Current task complexity: ${userIntent.complexity}
- Domain focus: ${userIntent.domain}
- User intent: ${userIntent.intent}
- Requires code: ${userIntent.requiresCode ? "yes" : "no"}
- Follow-up question: ${userIntent.isFollowUp ? "yes" : "no"}

RESPONSE REQUIREMENTS:
- Provide deep, thoughtful analysis
- Include step-by-step reasoning when appropriate
- Offer multiple perspectives or solutions
- Add practical examples and best practices
- Suggest related concepts for exploration
- Maintain conversation continuity
`;
  const fullPrompt = `${SYSTEM_PROMPT}

${intelligenceDirectives}

${contextPrompt}User: ${userMessage}

Assistant: I'll provide an intelligent, comprehensive response that demonstrates advanced reasoning and expertise.`;
  const response = await gemini.models.generateContent({
    model,
    contents: fullPrompt
  });
  return response.text || "I apologize, but I'm having trouble generating a response right now. Please try asking your question again.";
}
async function generateOpenAIResponse(userMessage, context, model, userIntent) {
  const enhancedSystemPrompt = `${SYSTEM_PROMPT}

CURRENT TASK ANALYSIS:
- Complexity Level: ${userIntent.complexity}
- Domain: ${userIntent.domain}
- Intent: ${userIntent.intent}
- Code Required: ${userIntent.requiresCode}
- Follow-up: ${userIntent.isFollowUp}

ENHANCED RESPONSE STRATEGY:
- Demonstrate superior reasoning and analysis
- Provide multi-layered explanations with examples
- Include proactive suggestions and alternatives
- Show deep domain expertise and best practices
- Maintain conversation flow and build on previous context
- Offer actionable insights and next steps`;
  const messages2 = [
    { role: "system", content: enhancedSystemPrompt }
  ];
  context.forEach((msg) => {
    messages2.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    });
  });
  messages2.push({
    role: "user",
    content: `${userMessage}

[Note: This is a ${userIntent.complexity} level ${userIntent.domain} question requiring ${userIntent.intent}. Please provide an exceptionally intelligent and comprehensive response.]`
  });
  const response = await openai.chat.completions.create({
    model,
    messages: messages2,
    max_tokens: 3e3,
    temperature: 0.7,
    presence_penalty: 0.1,
    frequency_penalty: 0.1
  });
  return response.choices[0].message.content || "I apologize, but I'm having trouble generating a response right now. Please try asking your question again.";
}
async function generateAnthropicResponse(userMessage, context, model, userIntent) {
  const messages2 = [];
  context.forEach((msg) => {
    messages2.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    });
  });
  const enhancedSystemPrompt = `${SYSTEM_PROMPT}

TASK INTELLIGENCE BRIEFING:
- Complexity: ${userIntent.complexity} (basic/intermediate/advanced)
- Domain: ${userIntent.domain} (programming/data/design/mathematics/general)
- Intent: ${userIntent.intent} (question/creation/troubleshooting/explanation)
- Code Required: ${userIntent.requiresCode ? "Yes" : "No"}
- Follow-up: ${userIntent.isFollowUp ? "Yes" : "No"}

RESPONSE EXCELLENCE CRITERIA:
- Demonstrate exceptional reasoning and deep expertise
- Provide comprehensive, multi-faceted analysis
- Include step-by-step thinking where appropriate
- Offer practical examples and actionable insights
- Suggest related concepts and next steps
- Maintain perfect conversation coherence`;
  messages2.push({
    role: "user",
    content: `${userMessage}

[Intelligence Enhancement Request: Provide an exceptionally smart, detailed response that showcases advanced reasoning for this ${userIntent.complexity} level ${userIntent.domain} query.]`
  });
  const response = await anthropic.messages.create({
    model,
    system: enhancedSystemPrompt,
    messages: messages2,
    max_tokens: 3e3
  });
  const content = response.content[0];
  if (content.type === "text") {
    return content.text;
  }
  return "I apologize, but I'm having trouble generating a response right now. Please try asking your question again.";
}
function getAvailableModels(subscriptionTier) {
  if (subscriptionTier === "premium") {
    return AI_MODELS.PREMIUM;
  } else if (subscriptionTier === "pro") {
    return AI_MODELS.PRO;
  } else {
    return AI_MODELS.FREE;
  }
}

// server/routes.ts
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required Stripe secret: STRIPE_SECRET_KEY");
}
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil"
});
async function registerRoutes(app2) {
  app2.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.get("/api/conversations", async (req, res) => {
    try {
      const conversations2 = await storage.getConversations();
      res.json(conversations2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages2 = await storage.getMessagesByConversation(conversationId);
      res.json(messages2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Message content is required" });
      }
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      const userMessage = await storage.createMessage({
        conversationId,
        content,
        role: "user"
      });
      const existingMessages = await storage.getMessagesByConversation(conversationId);
      const conversationHistory = existingMessages.map((msg) => ({
        role: msg.role,
        content: msg.content
      }));
      const subscriptionTier = "free";
      const aiResponseContent = await generateAIResponse(content, conversationHistory, subscriptionTier);
      const aiMessage = await storage.createMessage({
        conversationId,
        content: aiResponseContent,
        role: "assistant"
      });
      res.json({
        userMessage,
        aiMessage
      });
    } catch (error) {
      console.error("Error in message route:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/create-subscription", async (req, res) => {
    try {
      const { planId, priceId } = req.body;
      let user = await storage.getUser(1);
      if (!user) {
        user = await storage.createUser({
          username: "demo_user",
          password: "demo_password",
          email: "demo@turboAnswer.com"
        });
      }
      const subscriptionPrices = {
        "price_pro_monthly": {
          amount: 399,
          // $3.99
          tier: "pro"
        },
        "price_premium_monthly": {
          amount: 999,
          // $9.99  
          tier: "premium"
        }
      };
      const priceConfig = subscriptionPrices[priceId];
      if (!priceConfig) {
        return res.status(400).json({ error: "Invalid price ID" });
      }
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email || "demo@turboAnswer.com",
          name: user.username
        });
        stripeCustomerId = customer.id;
        await storage.updateStripeCustomerId(user.id, stripeCustomerId);
      }
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{
          price_data: {
            currency: "usd",
            product: `prod_turbo_answer_${planId}`,
            unit_amount: priceConfig.amount,
            recurring: {
              interval: "month"
            }
          }
        }],
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"]
      });
      await storage.updateUserStripeInfo(user.id, stripeCustomerId, subscription.id);
      await storage.updateUserSubscription(user.id, "active", priceConfig.tier);
      const invoice = subscription.latest_invoice;
      const paymentIntent = invoice && typeof invoice === "object" ? invoice.payment_intent : null;
      const clientSecret = paymentIntent && typeof paymentIntent === "object" ? paymentIntent.client_secret : null;
      res.json({
        subscriptionId: subscription.id,
        clientSecret
      });
    } catch (error) {
      console.error("Enhanced subscription error:", error);
      return res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/models", async (req, res) => {
    try {
      const subscriptionTier = "free";
      const availableModels = getAvailableModels(subscriptionTier);
      res.json({ models: availableModels, currentTier: subscriptionTier });
    } catch (error) {
      console.error("Models endpoint error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/get-or-create-subscription", async (req, res) => {
    try {
      let user = await storage.getUser(1);
      if (!user) {
        user = await storage.createUser({
          username: "demo_user",
          password: "demo_password",
          email: "demo@turboAnswer.com"
        });
      }
      if (user.stripeSubscriptionId) {
        const subscription2 = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
          expand: ["latest_invoice.payment_intent"]
        });
        const invoice2 = subscription2.latest_invoice;
        if (invoice2 && typeof invoice2 === "object") {
          const paymentIntent2 = invoice2.payment_intent;
          if (paymentIntent2) {
            const clientSecret2 = typeof paymentIntent2 === "string" ? (await stripe.paymentIntents.retrieve(paymentIntent2)).client_secret : paymentIntent2.client_secret;
            res.json({
              subscriptionId: subscription2.id,
              clientSecret: clientSecret2
            });
            return;
          }
        }
      }
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email || "demo@turboAnswer.com",
          name: user.username
        });
        stripeCustomerId = customer.id;
        await storage.updateStripeCustomerId(user.id, stripeCustomerId);
      }
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{
          price_data: {
            currency: "usd",
            product: "prod_turbo_answer_pro",
            unit_amount: 399,
            // $3.99 in cents
            recurring: {
              interval: "month"
            }
          }
        }],
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"]
      });
      await storage.updateUserStripeInfo(user.id, stripeCustomerId, subscription.id);
      const invoice = subscription.latest_invoice;
      const paymentIntent = invoice && typeof invoice === "object" ? invoice.payment_intent : null;
      const clientSecret = paymentIntent && typeof paymentIntent === "object" ? paymentIntent.client_secret : null;
      res.json({
        subscriptionId: subscription.id,
        clientSecret
      });
    } catch (error) {
      console.error("Subscription error:", error);
      return res.status(400).json({ error: { message: error.message } });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
