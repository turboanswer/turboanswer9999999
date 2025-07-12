import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import Stripe from "stripe";
import multer from "multer";
import { storage } from "./storage";
import { db } from "./db";
import { insertConversationSchema, insertMessageSchema, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateAIResponse } from "./services/multi-ai";
import { 
  extractTextFromFile, 
  analyzeDocument, 
  validateFile, 
  getAnalysisOptions,
  SUPPORTED_FILE_TYPES 
} from "./services/document-analysis";
import widgetRoutes from './routes/widget-routes';

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
  // Register widget routes
  app.use(widgetRoutes);
  // User authentication routes
  app.post('/api/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: 'Email already exists' });
        }
      }

      const user = await storage.createUser({ username, email, password });
      const { password: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = await storage.validateUserCredentials(username, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/logout', async (req, res) => {
    try {
      // For now, just return success since we're using simple authentication
      // In a real app, this would destroy the session
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

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

  // Visual AI analysis endpoint
  app.post("/api/analyze-image", async (req, res) => {
    try {
      const { imageData, query } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ message: "Image data is required" });
      }

      const { analyzeImage } = await import("./services/visual-ai");
      const analysis = await analyzeImage(imageData, query);
      
      res.json(analysis);
    } catch (error: any) {
      console.error("Image analysis error:", error);
      res.status(500).json({ message: error.message || "Failed to analyze image" });
    }
  });

  // Live camera analysis endpoint
  app.post("/api/analyze-live-camera", async (req, res) => {
    try {
      const { imageData, question, language, context } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ message: "Image data is required" });
      }
      
      // Import live camera service
      const { analyzeLiveCamera } = await import('./services/live-camera.js');
      
      const result = await analyzeLiveCamera({
        imageData,
        question: question || "What do you see?",
        language: language || "en",
        context
      });
      
      res.json(result);
      
    } catch (error: any) {
      console.error("Live camera analysis error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to analyze live camera feed"
      });
    }
  });

  // Language detection endpoint
  app.post("/api/detect-language", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const { detectLanguage, getLanguageConfig } = await import("./services/language-detector");
      const languageCode = detectLanguage(text);
      const languageConfig = getLanguageConfig(languageCode);
      
      res.json({ 
        language: languageCode, 
        config: languageConfig 
      });
    } catch (error: any) {
      console.error("Language detection error:", error);
      res.status(500).json({ message: "Failed to detect language" });
    }
  });

  // Get available languages
  app.get("/api/languages", async (req, res) => {
    try {
      const { getAvailableLanguages } = await import("./services/language-detector");
      const languages = getAvailableLanguages();
      res.json(languages);
    } catch (error: any) {
      console.error("Get languages error:", error);
      res.status(500).json({ message: "Failed to get available languages" });
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

      // Use MAXIMUM PERFORMANCE AI system with breakthrough intelligence
      const { generateAIResponse } = await import('./services/multi-ai.js');
      const userId = `user_${Math.random().toString(36).substr(2, 9)}`; // Simple user ID for context
      const aiResponseContent = await generateAIResponse(
        content,
        conversationHistory,
        "premium", // Use premium tier for maximum performance
        req.body.selectedModel || "auto-select", // Intelligent model selection
        userId,
        req.body.language || "en" // Support multi-language responses
      );

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
        'price_monthly_999': {
          amount: 999, // $9.99
          tier: 'pro'
        },
        'price_yearly_14999': {
          amount: 14999, // $149.99
          tier: 'pro'
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

      // Create recurring subscription
      const interval = priceId.includes('yearly') ? 'year' : 'month';
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{
          price_data: {
            currency: 'usd',
            product: `prod_turbo_answer_${planId}`,
            unit_amount: priceConfig.amount,
            recurring: {
              interval: interval
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

  // 5-Day Trial Subscription endpoint
  app.post('/api/start-trial', async (req, res) => {
    try {
      // For demo purposes, create a demo user
      let user = await storage.getUser(1);
      if (!user) {
        user = await storage.createUser({
          username: "trial_user",
          password: "trial_password",
          email: "trial@turboAnswer.com"
        });
      }

      // Check if user already had a trial
      if (user.subscriptionTier === 'trial_used' || user.subscriptionStatus === 'trial_expired') {
        return res.status(400).json({ error: 'Trial already used. Please upgrade to continue.' });
      }

      // Set trial subscription (no Stripe needed for free trial)
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 5); // 5 days from now

      await storage.updateUserSubscription(user.id, 'trial_active', 'lifetime');

      res.json({
        success: true,
        message: 'Free Lifetime Pro trial activated! You have 5 days of full premium access.',
        trialEndDate: trialEndDate.toISOString(),
        trialType: 'lifetime',
        user: {
          id: user.id,
          username: user.username,
          subscriptionTier: 'lifetime',
          subscriptionStatus: 'trial'
        }
      });

    } catch (error: any) {
      console.error('Trial activation error:', error);
      return res.status(500).json({ error: error.message });
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

  // Create demo employee account (for setup purposes)
  app.post('/api/setup-employee', async (req, res) => {
    try {
      const { username, password, email } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }

      // Check if employee already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Create employee user
      const employee = await storage.createUser({
        username,
        password,
        email: email || null
      });

      // Update user to be an employee
      const [updatedEmployee] = await db
        .update(users)
        .set({ isEmployee: true })
        .where(eq(users.id, employee.id))
        .returning();

      res.json({ 
        message: 'Employee account created successfully',
        employee: {
          id: updatedEmployee.id,
          username: updatedEmployee.username,
          email: updatedEmployee.email
        }
      });
    } catch (error: any) {
      console.error('Setup employee error:', error);
      res.status(500).json({ message: 'Failed to create employee account' });
    }
  });

  // Employee Authentication Routes
  app.post('/api/employee/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }

      const employee = await storage.validateEmployeeCredentials(username, password);
      
      if (!employee) {
        return res.status(401).json({ message: 'Invalid employee credentials' });
      }

      // In a real app, you'd set up proper session management here
      res.json({ 
        message: 'Employee login successful',
        employee: {
          id: employee.id,
          username: employee.username,
          email: employee.email
        }
      });
    } catch (error: any) {
      console.error('Employee login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get all users (Employee only)
  app.get('/api/employee/users', async (req, res) => {
    try {
      // In a real app, verify employee authentication here
      const users = await storage.getAllUsers();
      
      // Remove sensitive data like passwords
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        isBanned: user.isBanned,
        isFlagged: user.isFlagged,
        flagReason: user.flagReason,
        banReason: user.banReason,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }));
      
      res.json(sanitizedUsers);
    } catch (error: any) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Ban user (Employee only)
  app.post('/api/employee/users/:id/ban', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { reason } = req.body;
      
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: 'Ban reason is required' });
      }
      
      const user = await storage.banUser(userId, reason.trim());
      res.json({ message: 'User banned successfully', user: { id: user.id, username: user.username } });
    } catch (error: any) {
      console.error('Ban user error:', error);
      res.status(500).json({ message: error.message || 'Failed to ban user' });
    }
  });

  // Unban user (Employee only)
  app.post('/api/employee/users/:id/unban', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.unbanUser(userId);
      res.json({ message: 'User unbanned successfully', user: { id: user.id, username: user.username } });
    } catch (error: any) {
      console.error('Unban user error:', error);
      res.status(500).json({ message: error.message || 'Failed to unban user' });
    }
  });

  // Flag user (Employee only)
  app.post('/api/employee/users/:id/flag', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { reason } = req.body;
      
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: 'Flag reason is required' });
      }
      
      const user = await storage.flagUser(userId, reason.trim());
      res.json({ message: 'User flagged successfully', user: { id: user.id, username: user.username } });
    } catch (error: any) {
      console.error('Flag user error:', error);
      res.status(500).json({ message: error.message || 'Failed to flag user' });
    }
  });

  // Unflag user (Employee only)
  app.post('/api/employee/users/:id/unflag', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.unflagUser(userId);
      res.json({ message: 'User unflagged successfully', user: { id: user.id, username: user.username } });
    } catch (error: any) {
      console.error('Unflag user error:', error);
      res.status(500).json({ message: error.message || 'Failed to unflag user' });
    }
  });

  // Suspend user (Employee only)
  app.post('/api/employee/users/:id/suspend', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { reason, employeeId, employeeUsername } = req.body;
      
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: 'Suspension reason is required' });
      }

      if (!employeeId || !employeeUsername) {
        return res.status(400).json({ message: 'Employee information is required' });
      }
      
      const user = await storage.suspendUser(userId, reason.trim(), employeeId, employeeUsername);
      res.json({ 
        message: 'User suspended successfully', 
        user: { 
          id: user.id, 
          username: user.username, 
          isSuspended: user.isSuspended,
          suspensionReason: user.suspensionReason,
          suspendedBy: user.suspendedBy
        }
      });
    } catch (error: any) {
      console.error('Suspend user error:', error);
      res.status(500).json({ message: error.message || 'Failed to suspend user' });
    }
  });

  // Unsuspend user (Employee only)
  app.post('/api/employee/users/:id/unsuspend', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { employeeId, employeeUsername } = req.body;

      if (!employeeId || !employeeUsername) {
        return res.status(400).json({ message: 'Employee information is required' });
      }
      
      const user = await storage.unsuspendUser(userId, employeeId, employeeUsername);
      res.json({ 
        message: 'User unsuspended successfully', 
        user: { 
          id: user.id, 
          username: user.username, 
          isSuspended: user.isSuspended
        }
      });
    } catch (error: any) {
      console.error('Unsuspend user error:', error);
      res.status(500).json({ message: error.message || 'Failed to unsuspend user' });
    }
  });

  // Get audit logs (Employee only)
  app.get('/api/employee/audit-logs', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const auditLogs = await storage.getAuditLogs(limit);
      res.json(auditLogs);
    } catch (error: any) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  // Get audit logs for specific user (Employee only)
  app.get('/api/employee/users/:id/audit-logs', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const auditLogs = await storage.getAuditLogsByUser(userId);
      res.json(auditLogs);
    } catch (error: any) {
      console.error('Get user audit logs error:', error);
      res.status(500).json({ message: 'Failed to fetch user audit logs' });
    }
  });

  // Get audit logs for specific employee (Employee only)
  app.get('/api/employee/employees/:id/audit-logs', async (req, res) => {
    try {
      const employeeId = parseInt(req.params.id);
      const auditLogs = await storage.getAuditLogsByEmployee(employeeId);
      res.json(auditLogs);
    } catch (error: any) {
      console.error('Get employee audit logs error:', error);
      res.status(500).json({ message: 'Failed to fetch employee audit logs' });
    }
  });

  // Enhanced super admin endpoints for chat history tracking
  app.get('/api/super-admin/all-conversations', async (req, res) => {
    try {
      // Check if user has super admin privileges
      const { username } = req.query;
      if (username !== 'tiagotschantret') {
        return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
      }

      const user = await storage.getUserByUsername(username as string);
      if (!user || !user.canViewAllChats || user.employeeRole !== 'super_admin') {
        return res.status(403).json({ message: 'Insufficient privileges' });
      }

      const allConversations = await storage.getAllConversationsWithMessages();
      res.json({
        total: allConversations.length,
        conversations: allConversations
      });
    } catch (error: any) {
      console.error('Get all conversations error:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.get('/api/super-admin/search-conversations', async (req, res) => {
    try {
      const { username, search } = req.query;
      if (username !== 'tiagotschantret') {
        return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
      }

      const user = await storage.getUserByUsername(username as string);
      if (!user || !user.canViewAllChats || user.employeeRole !== 'super_admin') {
        return res.status(403).json({ message: 'Insufficient privileges' });
      }

      if (!search || typeof search !== 'string') {
        return res.status(400).json({ message: 'Search term is required' });
      }

      const searchResults = await storage.searchConversationsByContent(search);
      res.json({
        searchTerm: search,
        total: searchResults.length,
        results: searchResults
      });
    } catch (error: any) {
      console.error('Search conversations error:', error);
      res.status(500).json({ message: 'Failed to search conversations' });
    }
  });

  app.get('/api/super-admin/user/:id/conversations', async (req, res) => {
    try {
      const { username } = req.query;
      if (username !== 'tiagotschantret') {
        return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
      }

      const user = await storage.getUserByUsername(username as string);
      if (!user || !user.canViewAllChats || user.employeeRole !== 'super_admin') {
        return res.status(403).json({ message: 'Insufficient privileges' });
      }

      const userId = parseInt(req.params.id);
      const userConversations = await storage.getUserConversationsWithMessages(userId);
      const targetUser = await storage.getUser(userId);
      
      res.json({
        user: targetUser ? { id: targetUser.id, username: targetUser.username, email: targetUser.email } : null,
        total: userConversations.length,
        conversations: userConversations
      });
    } catch (error: any) {
      console.error('Get user conversations error:', error);
      res.status(500).json({ message: 'Failed to fetch user conversations' });
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

  // Weather and location endpoints
  app.get("/api/weather/:location", async (req, res) => {
    try {
      const { getWeatherData, formatWeatherReport } = await import("./services/weather-location");
      const location = decodeURIComponent(req.params.location);
      const weatherData = await getWeatherData(location);
      const report = formatWeatherReport(weatherData);
      res.json({ weather: weatherData, report });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/location/:location", async (req, res) => {
    try {
      const { getLocationInfo, getWorldTimeInfo, formatLocationReport } = await import("./services/weather-location");
      const location = decodeURIComponent(req.params.location);
      const [locationInfo, timeInfo] = await Promise.allSettled([
        getLocationInfo(location),
        getWorldTimeInfo(location)
      ]);
      
      if (locationInfo.status === 'fulfilled') {
        const timeData = timeInfo.status === 'fulfilled' ? timeInfo.value : null;
        const report = formatLocationReport(locationInfo.value, timeData);
        res.json({ location: locationInfo.value, time: timeData, report });
      } else {
        throw new Error(locationInfo.reason?.message || 'Location not found');
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create demo user for promo codes
  app.post("/api/create-demo-user", async (req, res) => {
    try {
      // Check if demo user already exists
      let user = await storage.getUserByUsername("demo_user");
      
      if (!user) {
        user = await storage.createUser({
          username: "demo_user",
          password: "demo_password",
          email: "demo@turboai.com"
        });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create demo user: " + error.message });
    }
  });

  // Promo code application route
  app.post("/api/apply-promo", async (req, res) => {
    try {
      const { userId, promoCode } = req.body;
      
      if (!userId || !promoCode) {
        return res.status(400).json({ message: "User ID and promo code are required" });
      }

      const result = await storage.applyPromoCode(userId, promoCode);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: result.message, 
          user: result.user 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: result.message 
        });
      }
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Error applying promo code: " + error.message 
      });
    }
  });

  // Alternative image generation endpoint (no API keys required)
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, size = "1024x1024", style = "realistic" } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Image prompt is required" });
      }

      const { alternativeImageGeneration } = await import("./services/alternative-image-generation");
      
      const result = await alternativeImageGeneration.generateImage({
        prompt,
        size,
        style
      });

      if (result.success) {
        res.json({
          success: true,
          imageUrl: result.imageUrl,
          provider: result.provider,
          originalPrompt: prompt
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error("Alternative image generation API error:", error);
      res.status(500).json({
        success: false,
        error: "Image generation failed: " + error.message
      });
    }
  });

  // Alternative video generation endpoint
  app.post("/api/generate-video", async (req, res) => {
    try {
      const { prompt, duration = 5, resolution = "1080p", style = "realistic" } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Video prompt is required" });
      }

      const { alternativeVideoGeneration } = await import("./services/alternative-video-generation");
      
      const result = await alternativeVideoGeneration.generateVideo({
        prompt,
        duration,
        resolution,
        style
      });

      if (result.success) {
        res.json({
          success: true,
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          duration: result.duration,
          originalPrompt: prompt,
          provider: result.provider
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          provider: result.provider
        });
      }
    } catch (error: any) {
      console.error("Alternative video generation API error:", error);
      res.status(500).json({
        success: false,
        error: "Video generation failed: " + error.message
      });
    }
  });

  const httpServer = createServer(app);
  // Widget API endpoints for business integration
  app.post('/api/widget/conversation', async (req, res) => {
    try {
      const { domain, userAgent } = req.body;
      
      // Create anonymous conversation for widget users
      const conversation = await storage.createConversation({
        title: `Widget Chat - ${domain}`,
        userId: null // Anonymous widget user
      });
      
      res.json({ 
        conversationId: conversation.id,
        status: 'success'
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: 'Failed to create conversation',
        message: error.message 
      });
    }
  });

  app.post('/api/widget/message', async (req, res) => {
    try {
      const { message, conversationId, domain } = req.body;
      
      if (!message || !conversationId) {
        return res.status(400).json({ error: 'Message and conversationId required' });
      }
      
      // Store user message
      await storage.createMessage({
        conversationId,
        content: message,
        role: 'user'
      });
      
      // Generate AI response optimized for business use
      const businessPrompt = `You are a helpful business AI assistant embedded in a website widget. 
      The user is visiting: ${domain}
      
      Provide helpful, professional, and concise responses. Be friendly but business-appropriate.
      If asked about products/services, be helpful but suggest contacting the business directly for specific details.
      
      User message: ${message}`;
      
      const aiResponse = await generateAIResponse(businessPrompt, [], 'free', 'gemini-pro');
      
      // Store AI response
      await storage.createMessage({
        conversationId,
        content: aiResponse,
        role: 'assistant'
      });
      
      res.json({ 
        response: aiResponse,
        conversationId,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: 'Failed to process message',
        message: error.message 
      });
    }
  });

  // Serve widget files
  app.get('/widget/turbo-widget.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(__dirname, '../widget/turbo-widget.js'));
  });

  app.get('/widget/integration-guide', (req, res) => {
    res.sendFile(path.join(__dirname, '../widget/integration-guide.html'));
  });

  return httpServer;
}
