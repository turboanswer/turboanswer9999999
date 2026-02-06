import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import multer from "multer";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { generateAIResponse, getAvailableModels } from "./services/multi-ai";
import { 
  extractTextFromFile, 
  analyzeDocument, 
  validateFile, 
  getAnalysisOptions,
  SUPPORTED_FILE_TYPES 
} from "./services/document-analysis";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerImageRoutes } from "./replit_integrations/image";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

import widgetRoutes from './routes/widget-routes';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  registerImageRoutes(app);

  app.use(widgetRoutes);

  // Create a new conversation
  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversation = await storage.createConversation({
        title: req.body.title || "New Conversation",
        userId,
      });
      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get all conversations for authenticated user
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get conversation by ID
  app.get("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Visual AI analysis endpoint
  app.post("/api/analyze-image", async (req: any, res) => {
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
  app.post("/api/analyze-live-camera", isAuthenticated, async (req: any, res) => {
    try {
      const { imageData, question, language, context } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ message: "Image data is required" });
      }
      
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
  app.post("/api/detect-language", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
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

      const imageNouns = /\b(image|picture|photo|illustration|artwork|drawing|painting|visual|icon|logo|graphic|poster|banner|wallpaper|avatar|portrait|diagram|infographic|meme|thumbnail|cover)\b/i;
      const imageVerbs = /\b(generate|create|make|draw|paint|design|sketch|render|produce|show|give|build|craft)\b/i;
      const imageIntent = /\b(can you|could you|please|i want|i need|i'd like|give me|show me|let me see|make me)\b/i;
      const isImageRequest = (imageVerbs.test(content) && imageNouns.test(content)) || (imageIntent.test(content) && imageNouns.test(content));

      let aiResponseContent: string;

      if (isImageRequest) {
        try {
          const { generateImageBuffer } = await import('./replit_integrations/image/client');
          const imagePrompt = content
            .replace(/^(can you|could you|please|i want to|i need|i'd like to|give me|show me|let me see|make me)\s*/i, '')
            .replace(/^(generate|create|make|draw|paint|design|sketch|render|produce)\s+(an?|the|me\s+an?|me\s+the|me\s+a)?\s*/i, '')
            .replace(/\b(image|picture|photo|illustration|artwork|drawing|painting|visual)\s*(of|about|showing|depicting|with|for)?\s*/i, '')
            .replace(/\s+/g, ' ')
            .trim() || content;

          const imageBuffer = await generateImageBuffer(imagePrompt);
          const base64Image = imageBuffer.toString('base64');
          const imageDataUrl = `data:image/png;base64,${base64Image}`;

          aiResponseContent = `Here's the image I generated for you:\n\n![Generated Image](${imageDataUrl})\n\n*Prompt: "${imagePrompt}"*`;
        } catch (imageError: any) {
          console.error("Image generation failed in chat:", imageError);
          aiResponseContent = `I tried to generate that image but ran into an issue: ${imageError.message}. You can also try using the Image button in the toolbar to generate images directly.`;
        }
      } else {
        const existingMessages = await storage.getMessagesByConversation(conversationId);
        const conversationHistory = existingMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        const { generateAIResponse } = await import('./services/multi-ai.js');
        const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
        aiResponseContent = await generateAIResponse(
          content,
          conversationHistory,
          "premium",
          req.body.selectedModel || "auto-select",
          userId,
          req.body.language || "en"
        );
      }

      const aiMessage = await storage.createMessage({
        conversationId,
        content: aiResponseContent,
        role: "assistant"
      });

      res.json({
        userMessage,
        aiMessage
      });
    } catch (error: any) {
      console.error("Error in message route:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get Stripe publishable key for frontend
  app.get('/api/stripe/publishable-key', async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      console.error('Stripe key error:', error);
      res.status(500).json({ error: 'Failed to get Stripe key' });
    }
  });

  // Create Stripe checkout session for Pro subscription
  app.post('/api/checkout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.firstName || user.email || 'User',
          metadata: { userId },
        });
        customerId = customer.id;
        await storage.updateStripeCustomerId(userId, customerId);
      }

      // Find the Pro plan price from Stripe API
      const products = await stripe.products.search({ query: "name:'Turbo Answer Pro'" });
      if (!products.data.length) {
        return res.status(400).json({ error: 'Pro plan not found. Please try again later.' });
      }
      const prices = await stripe.prices.list({ product: products.data[0].id, active: true });
      const monthlyPrice = prices.data.find(p => p.recurring?.interval === 'month');
      if (!monthlyPrice) {
        return res.status(400).json({ error: 'Pro plan price not found.' });
      }
      const priceId = monthlyPrice.id;

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/chat?subscription=success`,
        cancel_url: `${baseUrl}/chat`,
        metadata: { userId },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Checkout error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check user subscription status
  app.get('/api/subscription-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.json({ tier: 'free', status: 'none' });
      }

      if (user.stripeSubscriptionId) {
        try {
          const stripe = await getUncachableStripeClient();
          const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          if (sub.status === 'active' || sub.status === 'trialing') {
            return res.json({ tier: 'pro', status: sub.status });
          }
        } catch (e) {
          // Subscription not found or invalid
        }
      }

      res.json({ tier: user.subscriptionTier || 'free', status: user.subscriptionStatus || 'none' });
    } catch (error: any) {
      console.error('Subscription status error:', error);
      res.json({ tier: 'free', status: 'none' });
    }
  });

  // Get available AI models for user's subscription tier
  app.get('/api/models', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const subscriptionTier = user?.subscriptionTier || "free";
      const availableModels = getAvailableModels(subscriptionTier);
      res.json({ models: availableModels, currentTier: subscriptionTier });
    } catch (error: any) {
      console.error('Models endpoint error:', error);
      const availableModels = getAvailableModels("free");
      res.json({ models: availableModels, currentTier: "free" });
    }
  });

  // Get all users (Employee only)
  app.get('/api/employee/users', isAuthenticated, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      
      const sanitizedUsers = allUsers.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
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
  app.post('/api/employee/users/:id/ban', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const { reason } = req.body;
      
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: 'Ban reason is required' });
      }
      
      const user = await storage.banUser(userId, reason.trim());
      res.json({ message: 'User banned successfully', user: { id: user.id, name: user.firstName || user.email || user.id } });
    } catch (error: any) {
      console.error('Ban user error:', error);
      res.status(500).json({ message: error.message || 'Failed to ban user' });
    }
  });

  // Unban user (Employee only)
  app.post('/api/employee/users/:id/unban', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.unbanUser(userId);
      res.json({ message: 'User unbanned successfully', user: { id: user.id, name: user.firstName || user.email || user.id } });
    } catch (error: any) {
      console.error('Unban user error:', error);
      res.status(500).json({ message: error.message || 'Failed to unban user' });
    }
  });

  // Flag user (Employee only)
  app.post('/api/employee/users/:id/flag', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const { reason } = req.body;
      
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: 'Flag reason is required' });
      }
      
      const user = await storage.flagUser(userId, reason.trim());
      res.json({ message: 'User flagged successfully', user: { id: user.id, name: user.firstName || user.email || user.id } });
    } catch (error: any) {
      console.error('Flag user error:', error);
      res.status(500).json({ message: error.message || 'Failed to flag user' });
    }
  });

  // Unflag user (Employee only)
  app.post('/api/employee/users/:id/unflag', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.unflagUser(userId);
      res.json({ message: 'User unflagged successfully', user: { id: user.id, name: user.firstName || user.email || user.id } });
    } catch (error: any) {
      console.error('Unflag user error:', error);
      res.status(500).json({ message: error.message || 'Failed to unflag user' });
    }
  });

  // Suspend user (Employee only)
  app.post('/api/employee/users/:id/suspend', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
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
          name: user.firstName || user.email || user.id, 
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
  app.post('/api/employee/users/:id/unsuspend', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const { employeeId, employeeUsername } = req.body;

      if (!employeeId || !employeeUsername) {
        return res.status(400).json({ message: 'Employee information is required' });
      }
      
      const user = await storage.unsuspendUser(userId, employeeId, employeeUsername);
      res.json({ 
        message: 'User unsuspended successfully', 
        user: { 
          id: user.id, 
          name: user.firstName || user.email || user.id, 
          isSuspended: user.isSuspended
        }
      });
    } catch (error: any) {
      console.error('Unsuspend user error:', error);
      res.status(500).json({ message: error.message || 'Failed to unsuspend user' });
    }
  });

  // Get audit logs (Employee only)
  app.get('/api/employee/audit-logs', isAuthenticated, async (req, res) => {
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
  app.get('/api/employee/users/:id/audit-logs', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.id;
      const auditLogs = await storage.getAuditLogsByUser(userId);
      res.json(auditLogs);
    } catch (error: any) {
      console.error('Get user audit logs error:', error);
      res.status(500).json({ message: 'Failed to fetch user audit logs' });
    }
  });

  // Get audit logs for specific employee (Employee only)
  app.get('/api/employee/employees/:id/audit-logs', isAuthenticated, async (req, res) => {
    try {
      const employeeId = req.params.id;
      const auditLogs = await storage.getAuditLogsByEmployee(employeeId);
      res.json(auditLogs);
    } catch (error: any) {
      console.error('Get employee audit logs error:', error);
      res.status(500).json({ message: 'Failed to fetch employee audit logs' });
    }
  });

  // Enhanced super admin endpoints for chat history tracking
  app.get('/api/super-admin/all-conversations', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const user = await storage.getUser(userId);
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

  app.get('/api/super-admin/search-conversations', isAuthenticated, async (req, res) => {
    try {
      const authUserId = (req as any).user.claims.sub;
      const user = await storage.getUser(authUserId);
      if (!user || !user.canViewAllChats || user.employeeRole !== 'super_admin') {
        return res.status(403).json({ message: 'Insufficient privileges' });
      }

      const { search } = req.query;
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

  app.get('/api/super-admin/user/:id/conversations', isAuthenticated, async (req, res) => {
    try {
      const authUserId = (req as any).user.claims.sub;
      const adminUser = await storage.getUser(authUserId);
      if (!adminUser || !adminUser.canViewAllChats || adminUser.employeeRole !== 'super_admin') {
        return res.status(403).json({ message: 'Insufficient privileges' });
      }

      const targetUserId = req.params.id;
      const userConversations = await storage.getConversationsByUser(targetUserId);
      const targetUser = await storage.getUser(targetUserId);
      
      res.json({
        user: targetUser ? { id: targetUser.id, firstName: targetUser.firstName, email: targetUser.email } : null,
        total: userConversations.length,
        conversations: userConversations
      });
    } catch (error: any) {
      console.error('Get user conversations error:', error);
      res.status(500).json({ message: 'Failed to fetch user conversations' });
    }
  });

  // File upload and document analysis
  app.post("/api/analyze-document", isAuthenticated, upload.single('document'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { originalname, mimetype, size, buffer } = req.file;
      const { analysisType = 'general', conversationId } = req.body;

      const validation = validateFile(size, mimetype);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      const fileContent = await extractTextFromFile(buffer, mimetype, originalname);
      
      let conversationHistory: Array<{role: string, content: string}> = [];
      if (conversationId) {
        const messages = await storage.getMessagesByConversation(parseInt(conversationId));
        conversationHistory = messages.slice(-3).map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }

      const analysisResult = await analyzeDocument(
        fileContent, 
        originalname, 
        analysisType,
        conversationHistory
      );

      res.json({
        filename: originalname,
        fileType: (SUPPORTED_FILE_TYPES as Record<string, string>)[mimetype],
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


  // Alternative video generation endpoint
  app.post("/api/generate-video", isAuthenticated, async (req: any, res) => {
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
      
      const conversation = await storage.createConversation({
        title: `Widget Chat - ${domain}`
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
      
      await storage.createMessage({
        conversationId,
        content: message,
        role: 'user'
      });
      
      const businessPrompt = `You are a helpful business AI assistant embedded in a website widget. 
      The user is visiting: ${domain}
      
      Provide helpful, professional, and concise responses. Be friendly but business-appropriate.
      If asked about products/services, be helpful but suggest contacting the business directly for specific details.
      
      User message: ${message}`;
      
      const aiResponse = await generateAIResponse(businessPrompt, [], 'free', 'gemini-pro');
      
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
