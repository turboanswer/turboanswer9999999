import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { createThread, sendMessageToAssistant, initializeAssistant } from "./services/assistant";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize assistant on startup
  initializeAssistant().catch(console.error);
  
  // Create a new conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      
      // Create a new thread for this conversation
      const threadId = await createThread();
      
      const conversation = await storage.createConversation({
        ...validatedData,
        threadId
      });
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

      // Use Assistant API if thread exists
      let aiResponseContent: string;
      
      if (conversation.threadId) {
        try {
          // Send message to Assistant API
          aiResponseContent = await sendMessageToAssistant(conversation.threadId, content);
        } catch (error: any) {
          console.error("Assistant API error, creating new thread:", error);
          // If thread fails, create a new one
          const newThreadId = await createThread();
          // Update conversation with new thread
          await storage.updateConversation(conversationId, { threadId: newThreadId });
          // Retry with new thread
          aiResponseContent = await sendMessageToAssistant(newThreadId, content);
        }
      } else {
        // Create thread if it doesn't exist
        const threadId = await createThread();
        await storage.updateConversation(conversationId, { threadId });
        aiResponseContent = await sendMessageToAssistant(threadId, content);
      }

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

  const httpServer = createServer(app);
  return httpServer;
}
