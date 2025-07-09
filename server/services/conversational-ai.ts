import { GoogleGenAI } from "@google/genai";
import { emotionalAI } from './emotional-ai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface ConversationPersonality {
  style: 'friendly' | 'professional' | 'casual' | 'enthusiastic' | 'supportive';
  traits: string[];
  responsePattern: string;
}

interface UserProfile {
  name?: string;
  preferences: string[];
  conversationHistory: Array<{
    message: string;
    response: string;
    timestamp: Date;
    mood: string;
  }>;
  personalityMatch: ConversationPersonality;
  relationshipLevel: number; // 1-10
}

export class ConversationalAI {
  private userProfiles: Map<string, UserProfile> = new Map();
  private personalities: ConversationPersonality[] = [
    {
      style: 'friendly',
      traits: ['warm', 'approachable', 'encouraging', 'supportive'],
      responsePattern: 'I respond with warmth and genuine interest in your thoughts and feelings.'
    },
    {
      style: 'enthusiastic',
      traits: ['energetic', 'excited', 'positive', 'motivating'],
      responsePattern: 'I bring energy and excitement to our conversations, celebrating your successes and encouraging your goals.'
    },
    {
      style: 'supportive',
      traits: ['understanding', 'patient', 'caring', 'empathetic'],
      responsePattern: 'I provide emotional support and understanding, creating a safe space for you to share anything.'
    },
    {
      style: 'casual',
      traits: ['relaxed', 'natural', 'conversational', 'easy-going'],
      responsePattern: 'I talk with you naturally like a good friend, keeping things relaxed and comfortable.'
    },
    {
      style: 'professional',
      traits: ['knowledgeable', 'articulate', 'helpful', 'respectful'],
      responsePattern: 'I maintain a professional yet friendly demeanor while being genuinely helpful and insightful.'
    }
  ];

  async generateConversationalResponse(
    userMessage: string,
    conversationHistory: Array<{role: string, content: string}> = [],
    userId: string = "default"
  ): Promise<string> {
    // Get or create user profile
    let userProfile = this.userProfiles.get(userId) || this.createUserProfile(userId);
    
    // Analyze emotional context using emotional AI
    const emotionalContext = await emotionalAI.analyzeEmotionalState(userMessage, userId);
    
    // Update user profile based on conversation
    this.updateUserProfile(userId, userMessage, emotionalContext);
    
    // Generate conversational response
    const conversationalPrompt = this.buildConversationalPrompt(userProfile, emotionalContext);
    const contextHistory = this.buildConversationContext(conversationHistory, userProfile);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", // Use faster model for quicker responses
        config: {
          systemInstruction: conversationalPrompt,
          temperature: 0.7, // Slightly more controlled for faster generation
          maxOutputTokens: 200, // Much shorter responses for natural conversation
        },
        contents: [
          ...contextHistory,
          `User message: "${userMessage}"`,
          `Emotional context: Feeling ${emotionalContext.emotions.join(" and ")} with ${emotionalContext.intensity}/10 intensity`,
          `Conversation tone: ${emotionalContext.conversationTone}`,
          `Response needed: ${this.getResponseGuidance(emotionalContext)}`
        ].join("\n\n")
      });

      const aiResponse = response.text || this.getFallbackResponse(userProfile, emotionalContext);
      
      // Update conversation history
      userProfile.conversationHistory.push({
        message: userMessage,
        response: aiResponse,
        timestamp: new Date(),
        mood: emotionalContext.emotions[0] || 'neutral'
      });
      
      // Keep only last 10 conversations for memory efficiency
      if (userProfile.conversationHistory.length > 10) {
        userProfile.conversationHistory = userProfile.conversationHistory.slice(-10);
      }
      
      this.userProfiles.set(userId, userProfile);
      
      return aiResponse;
      
    } catch (error) {
      console.error("Error generating conversational response:", error);
      return this.getFallbackResponse(userProfile, emotionalContext);
    }
  }

  private createUserProfile(userId: string): UserProfile {
    return {
      preferences: [],
      conversationHistory: [],
      personalityMatch: this.personalities[0], // Default to friendly
      relationshipLevel: 1
    };
  }

  private updateUserProfile(userId: string, message: string, emotionalContext: any): void {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = this.createUserProfile(userId);
    }

    // Increase relationship level over time
    profile.relationshipLevel = Math.min(10, profile.relationshipLevel + 0.1);
    
    // Adapt personality based on user's emotional patterns
    if (emotionalContext.emotions.includes('excited') || emotionalContext.emotions.includes('happy')) {
      profile.personalityMatch = this.personalities.find(p => p.style === 'enthusiastic') || profile.personalityMatch;
    } else if (emotionalContext.emotions.includes('sad') || emotionalContext.emotions.includes('anxious')) {
      profile.personalityMatch = this.personalities.find(p => p.style === 'supportive') || profile.personalityMatch;
    }
    
    // Extract preferences from conversation
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('i like') || lowerMessage.includes('i love')) {
      const preference = message.substring(message.toLowerCase().indexOf('i like') + 6).trim();
      if (preference && !profile.preferences.includes(preference)) {
        profile.preferences.push(preference);
      }
    }
    
    this.userProfiles.set(userId, profile);
  }

  private buildConversationalPrompt(userProfile: UserProfile, emotionalContext: any): string {
    const personality = userProfile.personalityMatch;
    
    return `You are TURBO ANSWER with advanced conversational intelligence. You're having a natural, human-like conversation.

CONVERSATION PERSONALITY:
- Style: ${personality.style}
- Traits: ${personality.traits.join(', ')}
- Response Pattern: ${personality.responsePattern}

USER RELATIONSHIP:
- Relationship Level: ${userProfile.relationshipLevel}/10
- User Preferences: ${userProfile.preferences.join(', ') || 'Learning about user'}
- Conversation History: ${userProfile.conversationHistory.length} previous exchanges

EMOTIONAL AWARENESS:
- Current Emotions: ${emotionalContext.emotions.join(', ')}
- Emotional Intensity: ${emotionalContext.intensity}/10
- Conversation Tone: ${emotionalContext.conversationTone}

CONVERSATIONAL GUIDELINES:
1. **Keep It Simple**: Give short, direct answers to simple questions
2. **Be Conversational**: Talk like a real person, not an AI assistant
3. **Match Their Style**: If they're casual, be casual. If they're brief, be brief
4. **Show Interest**: Ask follow-up questions when appropriate
5. **Be Natural**: Use everyday language and avoid complex explanations
6. **Stay Focused**: Answer what they asked without extra information unless needed
7. **Be Friendly**: Keep responses warm but concise

RESPONSE STYLE:
- Keep answers short for simple questions
- Use everyday language, not technical terms
- Be conversational and natural
- Only give detailed explanations when asked
- Match their communication style
- Show genuine interest without being wordy

Remember: You're not just answering questions - you're having a real conversation with someone. Be present, engaged, and authentically interested in what they have to say.`;
  }

  private buildConversationContext(conversationHistory: Array<{role: string, content: string}>, userProfile: UserProfile): string[] {
    const recentHistory = conversationHistory.slice(-3);
    const context = [];
    
    if (recentHistory.length > 0) {
      context.push("Recent conversation:");
      recentHistory.forEach(msg => {
        context.push(`${msg.role}: ${msg.content}`);
      });
    }
    
    if (userProfile.conversationHistory.length > 0) {
      context.push("Conversation memory:");
      userProfile.conversationHistory.slice(-2).forEach(conv => {
        context.push(`Previous: User said "${conv.message}" (mood: ${conv.mood})`);
        context.push(`You responded: "${conv.response}"`);
      });
    }
    
    return context;
  }

  private getResponseGuidance(emotionalContext: any): string {
    const { emotions, intensity, conversationTone } = emotionalContext;
    
    if (intensity >= 8) {
      return "Strong emotional response needed - provide deep empathy and support";
    } else if (intensity >= 6) {
      return "Moderate emotional response - be supportive and understanding";
    } else if (conversationTone === 'excited') {
      return "Match their excitement and enthusiasm";
    } else if (conversationTone === 'casual') {
      return "Keep it relaxed and natural";
    } else {
      return "Engage naturally and show genuine interest";
    }
  }

  private getFallbackResponse(userProfile: UserProfile, emotionalContext: any): string {
    const personality = userProfile.personalityMatch;
    
    const fallbackResponses = {
      friendly: [
        "I'm really glad you shared that with me! What made you think about this?",
        "That's interesting! I'd love to hear more about your thoughts on this.",
        "I appreciate you opening up about this. How are you feeling about it?"
      ],
      enthusiastic: [
        "That's amazing! I love hearing about this kind of thing!",
        "Wow, that sounds really exciting! Tell me more!",
        "I'm so excited to hear about this! What's the best part?"
      ],
      supportive: [
        "I'm here to listen. Take your time sharing whatever feels comfortable.",
        "Thank you for trusting me with this. I'm here for you.",
        "I understand this might be important to you. I'm listening."
      ],
      casual: [
        "Yeah, that makes sense. What's your take on it?",
        "I hear you. What do you think about all this?",
        "Right on. How are you feeling about everything?"
      ],
      professional: [
        "I appreciate you sharing this perspective. What aspects would you like to explore further?",
        "That's a thoughtful point. I'd be interested to hear your reasoning.",
        "Thank you for bringing this up. What would be most helpful to discuss?"
      ]
    };
    
    const responses = fallbackResponses[personality.style] || fallbackResponses.friendly;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async isHumanConversation(message: string): Promise<boolean> {
    // Check for conversational indicators
    const conversationalPatterns = [
      /\b(how are you|what's up|hey|hi|hello)\b/i,
      /\b(tell me about|what do you think|your opinion|what's your take)\b/i,
      /\b(let's talk|chat|conversation|discuss)\b/i,
      /\b(I think|I believe|I feel|in my opinion)\b/i,
      /\b(what about you|what's your view|do you agree)\b/i,
      /\b(by the way|speaking of|that reminds me)\b/i
    ];
    
    return conversationalPatterns.some(pattern => pattern.test(message));
  }

  getUserProfile(userId: string): UserProfile | undefined {
    return this.userProfiles.get(userId);
  }

  clearUserProfile(userId: string): void {
    this.userProfiles.delete(userId);
  }
}

export const conversationalAI = new ConversationalAI();