import { generateAIResponse } from './multi-ai.ts';
import { WebSocket } from 'ws';

// WebRTC-based Phone Service without Twilio
export class PhoneService {
  private static activeVoiceCalls: Map<string, any> = new Map();
  
  // Voice call session management
  static createVoiceSession(sessionId: string, websocket: WebSocket) {
    console.log(`[Voice Service] Creating voice session: ${sessionId}`);
    
    this.activeVoiceCalls.set(sessionId, {
      websocket,
      startTime: Date.now(),
      conversationHistory: [],
      isActive: true
    });
    
    // Send welcome message
    websocket.send(JSON.stringify({
      type: 'voice_ready',
      message: 'Voice connection established. You can now speak to Turbo AI Assistant.',
      sessionId
    }));
  }
  
  // Handle voice message from client
  static async handleVoiceMessage(sessionId: string, audioData: any, transcriptText: string) {
    console.log(`[Voice Service] Processing voice message for session: ${sessionId}`);
    
    const session = this.activeVoiceCalls.get(sessionId);
    if (!session || !session.isActive) {
      console.log(`[Voice Service] Session ${sessionId} not found or inactive`);
      return;
    }
    
    try {
      // Add user message to conversation history
      session.conversationHistory.push({
        role: 'user',
        content: transcriptText,
        timestamp: Date.now()
      });
      
      // Generate AI response
      const aiResponse = await generateAIResponse(
        transcriptText,
        session.conversationHistory.slice(-6), // Keep last 6 messages for context
        'free', // Default tier for voice calls
        'conversational' // Use conversational model for voice
      );
      
      // Clean response for voice synthesis
      const cleanResponse = this.cleanResponseForVoice(aiResponse);
      
      // Add AI response to conversation history
      session.conversationHistory.push({
        role: 'assistant',
        content: cleanResponse,
        timestamp: Date.now()
      });
      
      // Send response back to client
      session.websocket.send(JSON.stringify({
        type: 'ai_response',
        message: cleanResponse,
        sessionId,
        shouldSpeak: true
      }));
      
      console.log(`[Voice Service] AI response sent for session: ${sessionId}`);
      
    } catch (error) {
      console.error(`[Voice Service] Error processing voice message: ${error}`);
      
      const errorResponse = 'I apologize, but I encountered an error processing your request. Please try again.';
      session.websocket.send(JSON.stringify({
        type: 'ai_response',
        message: errorResponse,
        sessionId,
        shouldSpeak: true,
        error: true
      }));
    }
  }
  
  // Clean AI response for voice synthesis
  private static cleanResponseForVoice(response: string): string {
    return response
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove markdown bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove markdown italic  
      .replace(/#{1,6}\s*/g, '') // Remove markdown headers
      .replace(/```[^`]*```/g, 'code block') // Replace code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code formatting
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
      .replace(/\n{2,}/g, '. ') // Replace double line breaks with period
      .replace(/\n/g, ' ') // Replace single line breaks with space
      .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
      .replace(/[📊📢🔒🎨📋📝🤖⚙️💼👥🚚🌱🔍📱⛓️🎓🧠🏗️🎮💪✈️]/g, '') // Remove emojis
      .trim();
  }
  
  // End voice session
  static endVoiceSession(sessionId: string) {
    console.log(`[Voice Service] Ending voice session: ${sessionId}`);
    
    const session = this.activeVoiceCalls.get(sessionId);
    if (session) {
      session.isActive = false;
      session.websocket.send(JSON.stringify({
        type: 'session_ended',
        message: 'Voice session ended. Thank you for using Turbo AI Assistant!',
        sessionId
      }));
      
      // Clean up after 5 seconds
      setTimeout(() => {
        this.activeVoiceCalls.delete(sessionId);
      }, 5000);
    }
  }
  
  // Get active voice sessions count
  static getActiveSessionsCount(): number {
    return this.activeVoiceCalls.size;
  }
  
  // Get session info
  static getSessionInfo(sessionId: string) {
    const session = this.activeVoiceCalls.get(sessionId);
    if (!session) return null;
    
    return {
      sessionId,
      isActive: session.isActive,
      startTime: session.startTime,
      duration: Date.now() - session.startTime,
      messageCount: session.conversationHistory.length
    };
  }
  
  // Handle WebSocket connection for voice calls
  static handleWebSocketConnection(websocket: WebSocket) {
    const sessionId = this.generateSessionId();
    console.log(`[Voice Service] New WebSocket connection: ${sessionId}`);
    
    // Create voice session
    this.createVoiceSession(sessionId, websocket);
    
    // Handle incoming messages
    websocket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'voice_transcript':
            await this.handleVoiceMessage(sessionId, message.audioData, message.transcript);
            break;
            
          case 'end_session':
            this.endVoiceSession(sessionId);
            break;
            
          case 'ping':
            websocket.send(JSON.stringify({ type: 'pong', sessionId }));
            break;
            
          default:
            console.log(`[Voice Service] Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error(`[Voice Service] Error processing WebSocket message: ${error}`);
      }
    });
    
    // Handle connection close
    websocket.on('close', () => {
      console.log(`[Voice Service] WebSocket connection closed: ${sessionId}`);
      this.endVoiceSession(sessionId);
    });
    
    // Handle errors
    websocket.on('error', (error) => {
      console.error(`[Voice Service] WebSocket error for session ${sessionId}:`, error);
      this.endVoiceSession(sessionId);
    });
  }
  
  // Generate unique session ID
  private static generateSessionId(): string {
    return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Get virtual phone number info
  static getVirtualPhoneInfo() {
    return {
      available: true,
      type: 'WebRTC Voice Call',
      features: [
        'Direct browser-to-AI voice calls',
        'Real-time speech recognition',
        'AI voice responses',
        'No phone number required',
        'Works on any device with microphone'
      ],
      accessMethod: 'Browser-based voice calling'
    };
  }
}

// Global variable to store AI responses temporarily
declare global {
  var phoneCallResponses: { [callSid: string]: string } | undefined;
}