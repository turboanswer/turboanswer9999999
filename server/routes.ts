import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import multer from "multer";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { generateCustomAIResponse } from "./services/custom-ai";
import { 
  extractTextFromFile, 
  analyzeDocument, 
  validateFile, 
  getAnalysisOptions,
  SUPPORTED_FILE_TYPES 
} from "./services/document-analysis";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Single file upload
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a new conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get all conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get conversation by ID
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send a message and get AI response
  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Verify conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Create user message
      const userMessage = await storage.createMessage({
        conversationId,
        content,
        role: "user"
      });

      // Get conversation history for context
      const existingMessages = await storage.getMessagesByConversation(conversationId);
      const conversationHistory = existingMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Generate AI response using custom AI
      const aiResponseContent = await generateCustomAIResponse(content, conversationHistory);

      // Create AI message
      const aiMessage = await storage.createMessage({
        conversationId,
        content: aiResponseContent,
        role: "assistant"
      });

      // Return both messages
      res.json({
        userMessage,
        aiMessage
      });
    } catch (error: any) {
      console.error("Error in message route:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Enhanced subscription endpoint with multiple tiers
  app.post('/api/create-subscription', async (req, res) => {
    try {
      const { planId, priceId } = req.body;
      
      // For demo purposes, create a demo user
      let user = await storage.getUser(1);
      if (!user) {
        user = await storage.createUser({
          username: "demo_user",
          password: "demo_password",
          email: "demo@turboAnswer.com"
        });
      }

      // Define subscription prices
      const subscriptionPrices = {
        'price_pro_monthly': {
          amount: 399, // $3.99
          tier: 'pro'
        },
        'price_premium_monthly': {
          amount: 999, // $9.99  
          tier: 'premium'
        }
      };

      const priceConfig = subscriptionPrices[priceId as keyof typeof subscriptionPrices];
      if (!priceConfig) {
        return res.status(400).json({ error: 'Invalid price ID' });
      }

      // Create Stripe customer if doesn't exist
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email || "demo@turboAnswer.com",
          name: user.username,
        });
        stripeCustomerId = customer.id;
        await storage.updateStripeCustomerId(user.id, stripeCustomerId);
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{
          price_data: {
            currency: 'usd',
            product: `prod_turbo_answer_${planId}`,
            unit_amount: priceConfig.amount,
            recurring: {
              interval: 'month'
            }
          }
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user subscription info
      await storage.updateUserStripeInfo(user.id, stripeCustomerId, subscription.id);
      await storage.updateUserSubscription(user.id, 'active', priceConfig.tier);

      const invoice = subscription.latest_invoice;
      const paymentIntent = invoice && typeof invoice === 'object' ? (invoice as any).payment_intent : null;
      const clientSecret = paymentIntent && typeof paymentIntent === 'object' ? paymentIntent.client_secret : null;

      res.json({
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
      });

    } catch (error: any) {
      console.error('Enhanced subscription error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Get available AI models for user's subscription tier
  app.get('/api/models', async (req, res) => {
    try {
      // For demo, assume free tier - in real app get from authenticated user
      const subscriptionTier = "free";
      const availableModels = getAvailableModels(subscriptionTier);
      res.json({ models: availableModels, currentTier: subscriptionTier });
    } catch (error: any) {
      console.error('Models endpoint error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Legacy Pro plan endpoint
  app.post('/api/get-or-create-subscription', async (req, res) => {
    try {
      // For demo purposes, create a demo user
      // In real app, this would use authenticated user
      let user = await storage.getUser(1);
      if (!user) {
        user = await storage.createUser({
          username: "demo_user",
          password: "demo_password",
          email: "demo@turboAnswer.com"
        });
      }

      // Check if user already has an active subscription
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
          expand: ['latest_invoice.payment_intent']
        });
        
        const invoice = subscription.latest_invoice;
        if (invoice && typeof invoice === 'object') {
          const paymentIntent = (invoice as any).payment_intent;
          if (paymentIntent) {
            const clientSecret = typeof paymentIntent === 'string' 
              ? (await stripe.paymentIntents.retrieve(paymentIntent)).client_secret
              : paymentIntent.client_secret;
              
            res.json({
              subscriptionId: subscription.id,
              clientSecret: clientSecret,
            });
            return;
          }
        }
      }

      // Create Stripe customer if doesn't exist
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email || "demo@turboAnswer.com",
          name: user.username,
        });
        stripeCustomerId = customer.id;
        await storage.updateStripeCustomerId(user.id, stripeCustomerId);
      }

      // Create subscription for $3.99/month
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{
          price_data: {
            currency: 'usd',
            product: 'prod_turbo_answer_pro',
            unit_amount: 399, // $3.99 in cents
            recurring: {
              interval: 'month'
            }
          }
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user with subscription info
      await storage.updateUserStripeInfo(user.id, stripeCustomerId, subscription.id);

      const invoice = subscription.latest_invoice;
      const paymentIntent = invoice && typeof invoice === 'object' ? (invoice as any).payment_intent : null;
      const clientSecret = paymentIntent && typeof paymentIntent === 'object' ? paymentIntent.client_secret : null;

      res.json({
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
      });
    } catch (error: any) {
      console.error('Subscription error:', error);
      return res.status(400).json({ error: { message: error.message } });
    }
  });

  // File upload and document analysis
  app.post("/api/analyze-document", upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { originalname, mimetype, size, buffer } = req.file;
      const { analysisType = 'general', conversationId } = req.body;

      // Validate file
      const validation = validateFile(size, mimetype);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      // Extract text from file
      const fileContent = await extractTextFromFile(buffer, mimetype, originalname);
      
      // Get conversation history if conversationId provided
      let conversationHistory: Array<{role: string, content: string}> = [];
      if (conversationId) {
        const messages = await storage.getMessagesByConversation(parseInt(conversationId));
        conversationHistory = messages.slice(-3).map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }

      // Analyze document
      const analysisResult = await analyzeDocument(
        fileContent, 
        originalname, 
        analysisType,
        conversationHistory
      );

      res.json({
        filename: originalname,
        fileType: SUPPORTED_FILE_TYPES[mimetype],
        fileSize: size,
        analysisType,
        analysis: analysisResult,
        contentPreview: fileContent.substring(0, 200) + (fileContent.length > 200 ? '...' : '')
      });

    } catch (error: any) {
      console.error("Document analysis error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get available analysis options
  app.get("/api/analysis-options", async (req, res) => {
    try {
      const options = getAnalysisOptions();
      res.json(options);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get supported file types
  app.get("/api/supported-file-types", async (req, res) => {
    try {
      res.json({
        mimeTypes: Object.keys(SUPPORTED_FILE_TYPES),
        extensions: Object.values(SUPPORTED_FILE_TYPES),
        maxSize: "10MB"
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
