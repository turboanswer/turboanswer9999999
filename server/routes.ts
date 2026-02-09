import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import multer from "multer";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { generateAIResponse, getAvailableModels } from "./services/multi-ai";
import { moderateContent } from "./services/content-moderation";
import { 
  extractTextFromFile, 
  analyzeDocument, 
  validateFile, 
  getAnalysisOptions,
  SUPPORTED_FILE_TYPES 
} from "./services/document-analysis";
import { setupAuth, registerAuthRoutes, isAuthenticated, isAdmin } from "./replit_integrations/auth";
import { registerImageRoutes } from "./replit_integrations/image";
import { createSubscription, getSubscriptionDetails, getPayPalClientId, ensureSubscriptionPlans, cancelSubscription, getSubscriptionTransactions, refundCapture } from "./paypal";

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

  app.get("/api/download/android-app", (req, res) => {
    const fs = require("fs");
    const filePath = path.resolve("turbo-answer-v2.0.0.aab");
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "AAB file not found" });
    }
    const stat = fs.statSync(filePath);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", "attachment; filename=turbo-answer-v2.0.0.aab");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });

  app.get("/api/download/android-base64", (req, res) => {
    const fs = require("fs");
    const filePath = path.resolve("turbo-answer-v2.0.0.aab");
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "AAB file not found" });
    }
    const fileStat = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");
    const fileSizeMB = (fileStat.size / 1024 / 1024).toFixed(1);
    const html = `<!DOCTYPE html>
<html><head><title>Download Turbo Answer AAB</title>
<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#1a1a2e;color:#fff}
.container{text-align:center;padding:40px;background:#16213e;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.3)}
h1{color:#00d4ff;margin-bottom:10px}
p{color:#aaa;margin-bottom:20px}
button{background:linear-gradient(135deg,#00d4ff,#0099cc);color:#fff;border:none;padding:16px 40px;font-size:18px;border-radius:8px;cursor:pointer}
button:hover{opacity:0.9}
.info{font-size:12px;color:#666;margin-top:15px}
</style></head><body>
<div class="container">
<h1>Turbo Answer v2.0.0</h1>
<p>Android App Bundle (AAB) - ${fileSizeMB} MB</p>
<button onclick="downloadAAB()">Download AAB File</button>
<p id="status" class="info"></p>
</div>
<script>
function downloadAAB(){
  document.getElementById('status').textContent='Preparing download...';
  const b64='${base64Data}';
  const bytes=atob(b64);
  const arr=new Uint8Array(bytes.length);
  for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
  const blob=new Blob([arr],{type:'application/octet-stream'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='turbo-answer-v2.0.0.aab';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(url);
  document.getElementById('status').textContent='Download started! File size: ${fileSizeMB} MB';
}
</script></body></html>`;
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });

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

      const sendingUserId = req.user?.claims?.sub;
      if (sendingUserId) {
        const sender = await storage.getUser(sendingUserId);
        if (sender?.isSuspended) {
          return res.status(403).json({ message: "Your account is temporarily suspended. Please contact support for assistance." });
        }
        if (sender?.isBanned) {
          return res.status(403).json({ message: "Your account has been banned. Please contact support for assistance." });
        }
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const modResult = moderateContent(content);
      if (modResult.isFlagged) {
        const userId = req.user?.claims?.sub;
        if (userId) {
          const offender = await storage.getUser(userId);
          const actions: string[] = [];

          try {
            await storage.suspendUser(userId, `Auto-suspended: ${modResult.type} detected - "${modResult.matchedWords.join(', ')}"`, "system", "AutoModerator");
            actions.push("Account temporarily suspended");
          } catch (e: any) {
            console.error("Auto-suspend failed:", e.message);
            actions.push("Suspend attempted but failed");
          }

          try {
            await storage.flagUser(userId, `Inappropriate content: ${modResult.type}`);
            actions.push("Account flagged");
          } catch (e: any) {
            console.error("Auto-flag failed:", e.message);
            actions.push("Flag attempted but failed");
          }

          await storage.createAdminNotification({
            type: modResult.type,
            userId,
            userEmail: offender?.email || "unknown",
            userFirstName: offender?.firstName || "Unknown",
            userLastName: offender?.lastName || "User",
            flaggedContent: content,
            conversationId,
            actionTaken: `${actions.join(". ")}. Severity: ${modResult.severity}. Matched: ${modResult.matchedWords.join(', ')}`,
          });
        }

        return res.status(403).json({
          message: "Your message contains inappropriate content. Your account has been temporarily suspended. Please contact support if you believe this is an error.",
          flagged: true,
          type: modResult.type,
        });
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

  const VALID_COUPONS: Record<string, { discountedPrice: string; label: string; allowedEmail: string }> = {
    'TURBOTEST99': { discountedPrice: '$0.99', label: 'Enterprise discounted to $0.99/mo', allowedEmail: 'support@turboanswer.it.com' },
  };

  app.post('/api/validate-coupon', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ error: 'User not found' });

      const { coupon } = req.body || {};
      const couponData = VALID_COUPONS[coupon?.toUpperCase()];
      if (!couponData) {
        return res.status(400).json({ error: 'Invalid coupon code.' });
      }
      if (user.email?.toLowerCase() !== couponData.allowedEmail.toLowerCase()) {
        return res.status(403).json({ error: 'This coupon is not valid for your account.' });
      }
      res.json({ valid: true, discountedPrice: couponData.discountedPrice, label: couponData.label });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to validate coupon.' });
    }
  });

  // PayPal checkout - create subscription and redirect to PayPal
  app.post('/api/checkout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const { plan, coupon } = req.body || {};
      const tier = plan === 'enterprise' ? 'enterprise' : plan === 'research' ? 'research' : 'pro';
      console.log('[PayPal Checkout] Starting for user:', userId, 'plan:', tier);

      let priceOverride: string | undefined;
      if (coupon && tier === 'enterprise') {
        const couponData = VALID_COUPONS[coupon.toUpperCase()];
        if (couponData && user.email?.toLowerCase() === couponData.allowedEmail.toLowerCase()) {
          priceOverride = '0.99';
          console.log('[PayPal Checkout] Coupon applied - price override to $0.99');
        }
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || req.get('host')}`;
      const result = await createSubscription(
        tier as 'pro' | 'research' | 'enterprise',
        user.email,
        userId,
        `${baseUrl}/chat?subscription=${tier}`,
        `${baseUrl}/chat`,
        priceOverride,
      );

      console.log('[PayPal Checkout] Subscription created:', result.subscriptionId);
      res.json({ url: result.approvalUrl });
    } catch (error: any) {
      console.error('[PayPal Checkout] ERROR:', error.message);
      res.status(500).json({ error: error.message || 'Checkout failed. Please try again.' });
    }
  });

  // Sync subscription after PayPal redirect
  app.post('/api/sync-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subscriptionId, expectedTier } = req.body || {};

      if (subscriptionId) {
        const subDetails = await getSubscriptionDetails(subscriptionId);
        if (subDetails.status === 'ACTIVE' || subDetails.status === 'APPROVED') {
          let tier = expectedTier || 'pro';
          try {
            const customData = JSON.parse(subDetails.custom_id || '{}');
            if (customData.tier) tier = customData.tier;
          } catch (e) {}

          await storage.updatePaypalSubscription(userId, subscriptionId, tier);
          console.log(`[PayPal Sync] Updated user ${userId} to ${tier}`);

          let enterpriseCode: string | undefined;
          if (tier === 'enterprise') {
            const existingCode = await storage.getEnterpriseCodeByOwner(userId);
            if (!existingCode) {
              const { randomInt } = await import('crypto');
              const code = String(randomInt(100000, 999999));
              const user = await storage.getUser(userId);
              await storage.createEnterpriseCode(code, userId, user?.email || null);
              enterpriseCode = code;
              console.log(`[Enterprise] Generated code ${code} for user ${userId}`);
            } else {
              enterpriseCode = existingCode.code;
            }
          }

          return res.json({ tier, status: 'active', enterpriseCode });
        }
      }

      const user = await storage.getUser(userId);
      if (user?.paypalSubscriptionId) {
        try {
          const subDetails = await getSubscriptionDetails(user.paypalSubscriptionId);
          if (subDetails.status === 'ACTIVE') {
            let tier = 'pro';
            try {
              const customData = JSON.parse(subDetails.custom_id || '{}');
              if (customData.tier) tier = customData.tier;
            } catch (e) {}
            await storage.updatePaypalSubscription(userId, user.paypalSubscriptionId, tier);
            return res.json({ tier, status: 'active' });
          }
        } catch (e) {}
      }

      res.json({ tier: user?.subscriptionTier || 'free', status: user?.subscriptionStatus || 'none' });
    } catch (error: any) {
      console.error('[PayPal Sync] Error:', error.message);
      res.json({ tier: 'free', status: 'none' });
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

      if ((user.subscriptionTier === 'pro' || user.subscriptionTier === 'research' || user.subscriptionTier === 'enterprise') && user.subscriptionStatus === 'active') {
        return res.json({ tier: user.subscriptionTier, status: 'active' });
      }

      if (user.paypalSubscriptionId) {
        try {
          const subDetails = await getSubscriptionDetails(user.paypalSubscriptionId);
          if (subDetails.status === 'ACTIVE') {
            let tier = 'pro';
            try {
              const customData = JSON.parse(subDetails.custom_id || '{}');
              if (customData.tier) tier = customData.tier;
            } catch (e) {}
            await storage.updatePaypalSubscription(userId, user.paypalSubscriptionId, tier);
            return res.json({ tier, status: 'active' });
          } else if (subDetails.status === 'CANCELLED' || subDetails.status === 'SUSPENDED') {
            await storage.updateUserSubscription(userId, 'cancelled', 'free');
            return res.json({ tier: 'free', status: 'cancelled' });
          }
        } catch (e: any) {
          console.log('[PayPal] Could not verify subscription:', e.message?.substring(0, 100));
          if (user.subscriptionTier === 'pro' || user.subscriptionTier === 'research' || user.subscriptionTier === 'enterprise') {
            return res.json({ tier: user.subscriptionTier, status: user.subscriptionStatus || 'active' });
          }
        }
      }

      res.json({ tier: user.subscriptionTier || 'free', status: user.subscriptionStatus || 'none' });
    } catch (error: any) {
      console.error('Subscription status error:', error);
      res.json({ tier: 'free', status: 'none' });
    }
  });

  app.post('/api/apply-promo', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const { promoCode } = req.body;
      if (!promoCode) {
        return res.status(400).json({ error: 'Promo code is required' });
      }

      const PROMO_CODES: Record<string, { tier: string; email?: string; description: string }> = {
        'TURBO-CREATOR-LIFETIME': {
          tier: 'research',
          email: 'support@turboanswer.it.com',
          description: 'Creator lifetime Research access'
        },
        'TURBO-VIP-LIFETIME': {
          tier: 'research',
          email: 'tschantret@yahoo.com',
          description: 'VIP lifetime Research access'
        },
        'TURBO-SPECIAL-LIFETIME': {
          tier: 'research',
          email: 'luanfrank5@gmail.com',
          description: 'Special lifetime Research access'
        },
        'TURBO-ENTERPRISE-TEST': {
          tier: 'enterprise',
          email: 'support@turboanswer.it.com',
          description: 'Enterprise test access (1 cent trial)'
        }
      };

      const promo = PROMO_CODES[promoCode.toUpperCase()];
      if (!promo) {
        return res.status(400).json({ error: 'Invalid promo code' });
      }

      if (promo.email && user.email !== promo.email) {
        return res.status(403).json({ error: 'This promo code is not valid for your account' });
      }

      await storage.updateUserSubscription(userId, 'active', promo.tier);
      console.log(`[Promo] Applied code ${promoCode} for user ${userId} (${user.email}) - ${promo.description}`);

      let enterpriseCode: string | undefined;
      if (promo.tier === 'enterprise') {
        const { randomInt } = await import('crypto');
        const code = String(randomInt(100000, 999999));
        await storage.createEnterpriseCode(code, userId, user.email);
        enterpriseCode = code;
        console.log(`[Enterprise] Generated code ${code} for user ${userId}`);
      }

      res.json({
        success: true,
        message: `${promo.description} activated! You now have lifetime ${promo.tier} access.`,
        tier: promo.tier,
        enterpriseCode,
      });
    } catch (error: any) {
      console.error('[Promo] Error:', error.message);
      res.status(500).json({ error: 'Failed to apply promo code' });
    }
  });

  const enterpriseRedeemAttempts = new Map<string, { count: number; resetAt: number }>();

  app.post('/api/redeem-enterprise-code', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      const now = Date.now();
      const attempts = enterpriseRedeemAttempts.get(userId);
      if (attempts && now < attempts.resetAt) {
        if (attempts.count >= 5) {
          return res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
        }
        attempts.count++;
      } else {
        enterpriseRedeemAttempts.set(userId, { count: 1, resetAt: now + 15 * 60 * 1000 });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const { code } = req.body;
      if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: 'Please enter a valid 6-digit enterprise code' });
      }

      const enterpriseCode = await storage.getEnterpriseCodeByCode(code);
      if (!enterpriseCode) {
        return res.status(400).json({ error: 'Invalid enterprise code' });
      }

      if (enterpriseCode.ownerUserId === userId) {
        return res.status(400).json({ error: 'You cannot redeem your own enterprise code' });
      }

      if ((enterpriseCode.currentUses || 0) >= (enterpriseCode.maxUses || 10)) {
        return res.status(400).json({ error: 'This enterprise code has reached its maximum number of uses (10)' });
      }

      const existingRedemptions = await storage.getEnterpriseCodeRedemptions(enterpriseCode.id);
      const alreadyRedeemed = existingRedemptions.some(r => r.userId === userId);
      if (alreadyRedeemed) {
        return res.status(400).json({ error: 'You have already redeemed this enterprise code' });
      }

      await storage.redeemEnterpriseCode(enterpriseCode.id, userId, user.email);
      await storage.incrementEnterpriseCodeUses(enterpriseCode.id);
      await storage.updateUserSubscription(userId, 'active', 'research');

      console.log(`[Enterprise] Code ${code} redeemed by user ${userId} (${user.email})`);
      res.json({
        success: true,
        message: 'Enterprise code redeemed! You now have Research-level access.',
        tier: 'research'
      });
    } catch (error: any) {
      console.error('[Enterprise] Redeem error:', error.message);
      res.status(500).json({ error: 'Failed to redeem enterprise code' });
    }
  });

  app.get('/api/enterprise-code', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const code = await storage.getEnterpriseCodeByOwner(userId);
      if (!code) {
        return res.json({ hasCode: false });
      }
      const redemptions = await storage.getEnterpriseCodeRedemptions(code.id);
      res.json({
        hasCode: true,
        code: code.code,
        maxUses: code.maxUses,
        currentUses: code.currentUses,
        redemptions: redemptions.map(r => ({ email: r.userEmail, date: r.redeemedAt }))
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get enterprise code' });
    }
  });

  app.post('/api/delete-account', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (user.paypalSubscriptionId && user.subscriptionTier !== 'free') {
        try {
          await cancelSubscription(user.paypalSubscriptionId, 'Account deleted by user');
          console.log(`[Delete Account] Cancelled PayPal subscription for user ${userId}`);
        } catch (e: any) {
          console.log(`[Delete Account] PayPal cancel error (may already be cancelled):`, e.message?.substring(0, 100));
        }
      }

      await storage.deleteUserAccount(userId);
      console.log(`[Delete Account] User ${userId} (${user.email}) account deleted`);

      res.json({ success: true, message: 'Your account has been deleted successfully.' });
    } catch (error: any) {
      console.error('[Delete Account] Error:', error.message);
      res.status(500).json({ error: 'Failed to delete account' });
    }
  });

  // Cancel subscription with auto-refund if within 3 days
  app.post('/api/cancel-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (!user.paypalSubscriptionId || user.subscriptionTier === 'free') {
        return res.status(400).json({ error: 'No active subscription to cancel' });
      }

      const subscriptionId = user.paypalSubscriptionId;
      const subscriptionStartDate = user.subscriptionStartDate;
      let refunded = false;
      let refundAmount = '';

      const isWithin3Days = subscriptionStartDate && 
        (Date.now() - new Date(subscriptionStartDate).getTime()) < 3 * 24 * 60 * 60 * 1000;

      if (isWithin3Days) {
        try {
          const transactions = await getSubscriptionTransactions(subscriptionId);
          const latestCompleted = transactions.find((txn: any) => txn.status === 'COMPLETED' && txn.id);
          if (latestCompleted) {
            const amount = latestCompleted.amount_with_breakdown?.gross_amount?.value || (user.subscriptionTier === 'research' ? '15.00' : '6.99');
            const currency = latestCompleted.amount_with_breakdown?.gross_amount?.currency_code || 'USD';
            const refundResult = await refundCapture(latestCompleted.id, { value: amount, currency_code: currency });
            if (refundResult && (refundResult.status === 'COMPLETED' || refundResult.status === 'PENDING')) {
              refundAmount = amount;
              refunded = true;
              console.log(`[PayPal Refund] Refunded $${amount} (transaction ${latestCompleted.id}) for user ${userId}`);
            }
          }
        } catch (refundError: any) {
          console.error('[PayPal Refund] Error:', refundError.message);
        }
      }

      try {
        await cancelSubscription(subscriptionId, 'User requested cancellation');
        console.log(`[PayPal Cancel] Subscription ${subscriptionId} cancelled for user ${userId}`);
      } catch (cancelError: any) {
        console.error('[PayPal Cancel] Error:', cancelError.message);
      }

      await storage.cancelUserSubscription(userId);

      res.json({ 
        success: true, 
        refunded, 
        refundAmount: refunded ? `$${refundAmount}` : null,
        message: refunded 
          ? `Subscription cancelled and $${refundAmount} refunded to your account.`
          : 'Subscription cancelled. No refund available (cancellation after 3-day refund window).'
      });
    } catch (error: any) {
      console.error('[Cancel Subscription] Error:', error.message);
      res.status(500).json({ error: 'Failed to cancel subscription. Please try again.' });
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
  app.get('/api/employee/users', isAdmin, async (req, res) => {
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
        isSuspended: user.isSuspended,
        suspensionReason: user.suspensionReason,
        suspendedBy: user.suspendedBy,
        suspendedAt: user.suspendedAt,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      }));
      
      res.json(sanitizedUsers);
    } catch (error: any) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Ban user (Employee only)
  app.post('/api/employee/users/:id/ban', isAdmin, async (req, res) => {
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
  app.post('/api/employee/users/:id/unban', isAdmin, async (req, res) => {
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
  app.post('/api/employee/users/:id/flag', isAdmin, async (req, res) => {
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
  app.post('/api/employee/users/:id/unflag', isAdmin, async (req, res) => {
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
  app.post('/api/employee/users/:id/suspend', isAdmin, async (req, res) => {
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
  app.post('/api/employee/users/:id/unsuspend', isAdmin, async (req, res) => {
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
  app.get('/api/employee/audit-logs', isAdmin, async (req, res) => {
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
  app.get('/api/employee/users/:id/audit-logs', isAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const auditLogs = await storage.getAuditLogsByUser(userId);
      res.json(auditLogs);
    } catch (error: any) {
      console.error('Get user audit logs error:', error);
      res.status(500).json({ message: 'Failed to fetch user audit logs' });
    }
  });

  app.get('/api/admin/notifications', isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getAdminNotifications(limit);
      res.json(notifications);
    } catch (error: any) {
      console.error('Get notifications error:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.get('/api/admin/notifications/unread-count', isAdmin, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount();
      res.json({ count });
    } catch (error: any) {
      console.error('Get unread count error:', error);
      res.status(500).json({ message: 'Failed to fetch unread count' });
    }
  });

  app.post('/api/admin/notifications/:id/read', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await storage.markNotificationRead(id);
      res.json(notification);
    } catch (error: any) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ message: 'Failed to mark notification read' });
    }
  });

  app.post('/api/admin/notifications/read-all', isAdmin, async (req, res) => {
    try {
      await storage.markAllNotificationsRead();
      res.json({ message: 'All notifications marked as read' });
    } catch (error: any) {
      console.error('Mark all read error:', error);
      res.status(500).json({ message: 'Failed to mark all notifications read' });
    }
  });

  // Get audit logs for specific employee (Employee only)
  app.get('/api/employee/employees/:id/audit-logs', isAdmin, async (req, res) => {
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
  app.get('/api/super-admin/all-conversations', isAdmin, async (req, res) => {
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

  app.get('/api/super-admin/search-conversations', isAdmin, async (req, res) => {
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

  app.get('/api/super-admin/user/:id/conversations', isAdmin, async (req, res) => {
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

  // === CRISIS SUPPORT BOT (Encrypted, Private, No Content Moderation) ===

  app.post("/api/crisis/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conv = await storage.createCrisisConversation(userId);
      res.json(conv);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create crisis conversation" });
    }
  });

  app.get("/api/crisis/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const convs = await storage.getCrisisConversationsByUser(userId);
      res.json(convs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get crisis conversations" });
    }
  });

  app.get("/api/crisis/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      const conv = await storage.getCrisisConversation(conversationId, userId);
      if (!conv) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      const encryptedMessages = await storage.getCrisisMessagesByConversation(conversationId);
      const { decrypt } = await import("./services/encryption");
      const decryptedMessages = encryptedMessages.map(msg => ({
        id: msg.id,
        conversationId: msg.conversationId,
        content: decrypt(msg.encryptedContent),
        role: msg.role,
        timestamp: msg.timestamp,
      }));
      res.json(decryptedMessages);
    } catch (error: any) {
      console.error("[Crisis] Failed to get messages:", error.message);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post("/api/crisis/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }

      const conv = await storage.getCrisisConversation(conversationId, userId);
      if (!conv) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const { encrypt, decrypt } = await import("./services/encryption");
      const { generateCrisisResponse } = await import("./services/crisis-ai");

      const encryptedUserContent = encrypt(content);
      await storage.createCrisisMessage({
        conversationId,
        encryptedContent: encryptedUserContent,
        role: "user",
      });

      const encryptedMessages = await storage.getCrisisMessagesByConversation(conversationId);
      const history = encryptedMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: decrypt(msg.encryptedContent),
      }));

      const savedLanguage = req.body.language || "en";
      const aiResponse = await generateCrisisResponse(content, history.slice(0, -1), savedLanguage);

      const encryptedAiContent = encrypt(aiResponse);
      await storage.createCrisisMessage({
        conversationId,
        encryptedContent: encryptedAiContent,
        role: "assistant",
      });

      res.json({
        userMessage: { content, role: "user" },
        aiMessage: { content: aiResponse, role: "assistant" },
      });
    } catch (error: any) {
      console.error("[Crisis] Message error:", error.message);
      res.status(500).json({ message: "Something went wrong. If you need immediate help, please call 988." });
    }
  });

  app.delete("/api/crisis/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      await storage.deleteCrisisConversation(conversationId, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  app.delete("/api/crisis/all-data", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteAllCrisisData(userId);
      res.json({ success: true, message: "All crisis support data has been permanently deleted" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete crisis data" });
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
