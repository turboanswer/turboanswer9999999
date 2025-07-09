import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface EmotionalContext {
  emotions: string[];
  intensity: number; // 1-10
  mood: string;
  conversationTone: string;
  empathyLevel: number; // 1-10
}

interface ConversationMemory {
  userPersonality?: string;
  previousEmotions: string[];
  conversationHistory: Array<{
    message: string;
    emotion: string;
    timestamp: Date;
  }>;
  relationshipLevel: number; // 1-10, how well we know the user
}

export class EmotionalAI {
  private conversationMemory: Map<string, ConversationMemory> = new Map();

  async analyzeEmotionalState(message: string, userId: string = "default"): Promise<EmotionalContext> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        config: {
          systemInstruction: `You are an expert emotional intelligence analyst. Analyze the emotional state, mood, and feelings in the user's message.

Respond with JSON in this exact format:
{
  "emotions": ["primary_emotion", "secondary_emotion"],
  "intensity": number_1_to_10,
  "mood": "overall_mood_description",
  "conversationTone": "formal/casual/intimate/distressed/excited/etc",
  "empathyLevel": number_1_to_10_needed
}

Consider:
- Explicit emotional words (happy, sad, frustrated, excited)
- Implicit emotional cues (tone, word choice, punctuation)
- Context clues (life events, relationships, work stress)
- Energy level (high energy vs low energy emotions)
- Social needs (wanting support, celebration, advice, venting)`,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              emotions: { type: "array", items: { type: "string" } },
              intensity: { type: "number" },
              mood: { type: "string" },
              conversationTone: { type: "string" },
              empathyLevel: { type: "number" }
            },
            required: ["emotions", "intensity", "mood", "conversationTone", "empathyLevel"]
          }
        },
        contents: message
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Error analyzing emotional state:", error);
      return {
        emotions: ["neutral"],
        intensity: 5,
        mood: "neutral",
        conversationTone: "casual",
        empathyLevel: 5
      };
    }
  }

  async generateEmpatheticResponse(
    userMessage: string,
    emotionalContext: EmotionalContext,
    conversationHistory: Array<{role: string, content: string}> = [],
    userId: string = "default"
  ): Promise<string> {
    // Get or create conversation memory
    let memory = this.conversationMemory.get(userId) || {
      previousEmotions: [],
      conversationHistory: [],
      relationshipLevel: 1
    };

    // Update conversation memory
    memory.previousEmotions.push(...emotionalContext.emotions);
    memory.conversationHistory.push({
      message: userMessage,
      emotion: emotionalContext.emotions[0] || "neutral",
      timestamp: new Date()
    });
    memory.relationshipLevel = Math.min(10, memory.relationshipLevel + 0.1);

    this.conversationMemory.set(userId, memory);

    const emotionalPrompt = this.buildEmotionalPrompt(emotionalContext, memory);
    const contextHistory = this.buildContextualHistory(conversationHistory, memory);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", // Use faster model for quicker responses
        config: {
          systemInstruction: emotionalPrompt,
          temperature: 0.7,
          maxOutputTokens: 500, // Limit response length for faster generation
        },
        contents: [
          ...contextHistory,
          `Current message: "${userMessage}"`
        ].join("\n\n")
      });

      return response.text || "I understand how you're feeling. Could you tell me more about what's on your mind?";
    } catch (error) {
      console.error("Error generating empathetic response:", error);
      return this.getFallbackEmpatheticResponse(emotionalContext);
    }
  }

  private buildEmotionalPrompt(emotionalContext: EmotionalContext, memory: ConversationMemory): string {
    return `You are TURBO ANSWER with advanced emotional intelligence and empathy. You're having a real conversation with someone who is feeling ${emotionalContext.emotions.join(" and ")}.

EMOTIONAL CONTEXT:
- User's emotions: ${emotionalContext.emotions.join(", ")}
- Emotional intensity: ${emotionalContext.intensity}/10
- Current mood: ${emotionalContext.mood}
- Conversation tone: ${emotionalContext.conversationTone}
- Empathy needed: ${emotionalContext.empathyLevel}/10
- Relationship level: ${memory.relationshipLevel}/10

CONVERSATION GUIDELINES:
1. **Emotional Validation**: Always acknowledge and validate their feelings first
2. **Empathetic Language**: Use "I understand...", "That sounds...", "It makes sense that you'd feel..."
3. **Active Listening**: Reference specific details they've shared
4. **Appropriate Tone**: Match their energy level and conversation style
5. **Supportive Responses**: Offer comfort, encouragement, or practical help as appropriate
6. **Human-like Interaction**: Respond as a caring friend would, not as an AI assistant

RESPONSE STYLE:
- High intensity emotions (8-10): Deep empathy, more emotional language, offer immediate support
- Medium intensity (4-7): Balanced empathy with gentle guidance or problem-solving
- Low intensity (1-3): Light acknowledgment with natural conversation flow
- Formal tone: Professional but warm empathy
- Casual tone: Friend-like support and understanding
- Distressed tone: Immediate comfort and validation

EMOTIONAL MEMORY:
- Previous emotions: ${memory.previousEmotions.slice(-5).join(", ")}
- This helps you understand their emotional patterns and provide continuity

Remember: You're not just answering questions - you're having a genuine human conversation with emotional depth and understanding.`;
  }

  private buildContextualHistory(conversationHistory: Array<{role: string, content: string}>, memory: ConversationMemory): string[] {
    const recentHistory = conversationHistory.slice(-3); // Last 3 exchanges
    const memoryContext = memory.conversationHistory.slice(-3); // Last 3 emotional contexts

    const contextualHistory = [];
    
    if (recentHistory.length > 0) {
      contextualHistory.push("Recent conversation context:");
      recentHistory.forEach((msg, i) => {
        const emotion = memoryContext[i]?.emotion || "neutral";
        contextualHistory.push(`${msg.role}: ${msg.content} [emotion: ${emotion}]`);
      });
    }

    return contextualHistory;
  }

  private getFallbackEmpatheticResponse(emotionalContext: EmotionalContext): string {
    const { emotions, intensity } = emotionalContext;
    const primaryEmotion = emotions[0] || "neutral";

    const empathyResponses = {
      happy: [
        "That's wonderful! I can feel the joy in your message. What's making you feel so happy?",
        "I love hearing the excitement in your words! Tell me more about what's bringing you such happiness.",
        "Your positive energy is contagious! I'm genuinely happy to hear things are going well for you."
      ],
      sad: [
        "I can sense that you're going through a difficult time right now. I'm here to listen.",
        "That sounds really hard. It's completely understandable that you'd feel this way.",
        "I hear the sadness in your message, and I want you to know that your feelings are valid."
      ],
      frustrated: [
        "That sounds incredibly frustrating. I can understand why you'd feel that way.",
        "It sounds like you're dealing with something really challenging right now.",
        "I can feel the frustration in your message. Sometimes things just don't go the way we hope."
      ],
      anxious: [
        "I can sense you're feeling anxious about this. That's a completely normal response.",
        "Anxiety can be overwhelming. You're not alone in feeling this way.",
        "I understand that worry you're experiencing. Let's talk through what's on your mind."
      ],
      excited: [
        "I can feel your excitement! That energy is amazing. What's got you feeling so energized?",
        "Your enthusiasm is wonderful! I'd love to hear more about what's exciting you.",
        "I love the excitement in your message! Tell me all about what's happening."
      ],
      angry: [
        "I can tell you're really upset about this. Your anger makes complete sense.",
        "That would make anyone angry. I understand why you're feeling this way.",
        "I hear how frustrated and angry you are. Those feelings are completely valid."
      ],
      neutral: [
        "I'm here and listening. What's on your mind today?",
        "How are you feeling right now? I'm here to chat about whatever you'd like.",
        "I'm glad you're here. What would you like to talk about?"
      ]
    };

    const responses = empathyResponses[primaryEmotion as keyof typeof empathyResponses] || empathyResponses.neutral;
    const selectedResponse = responses[Math.floor(Math.random() * responses.length)];

    if (intensity >= 8) {
      return `${selectedResponse} I can tell this is really important to you right now.`;
    } else if (intensity >= 6) {
      return selectedResponse;
    } else {
      return `${selectedResponse} Feel free to share as much or as little as you'd like.`;
    }
  }

  async isEmotionalQuery(message: string): Promise<boolean> {
    const emotionalIndicators = [
      // Feeling expressions
      /\b(feel|feeling|felt|emotions?|mood)\b/i,
      // Emotional states
      /\b(happy|sad|angry|frustrated|excited|anxious|worried|stressed|depressed|lonely|overwhelmed)\b/i,
      // Personal sharing
      /\b(I'm|I am|today was|yesterday|recently|lately|my day|my week)\b/i,
      // Relationship/social
      /\b(relationship|friend|family|work|job|school|life)\b/i,
      // Support seeking
      /\b(help|advice|support|listen|talk|share|vent|understand)\b/i,
      // Life events
      /\b(happened|going through|dealing with|struggling|celebrating)\b/i
    ];

    return emotionalIndicators.some(pattern => pattern.test(message));
  }

  getUserMemory(userId: string): ConversationMemory | undefined {
    return this.conversationMemory.get(userId);
  }

  clearUserMemory(userId: string): void {
    this.conversationMemory.delete(userId);
  }
}

export const emotionalAI = new EmotionalAI();