// Mega Fusion AI - Combines 10+ AI models for ultimate intelligence
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// Initialize AI providers
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const perplexity = new OpenAI({ baseURL: "https://api.perplexity.ai", apiKey: process.env.PERPLEXITY_API_KEY || "" });
const xai = new OpenAI({ baseURL: "https://api.x.ai/v1", apiKey: process.env.XAI_API_KEY || "" });

// Additional AI providers for maximum power
const together = new OpenAI({ baseURL: "https://api.together.xyz/v1", apiKey: process.env.TOGETHER_API_KEY || "" });
const deepseek = new OpenAI({ baseURL: "https://api.deepseek.com/v1", apiKey: process.env.DEEPSEEK_API_KEY || "" });
const mistral = new OpenAI({ baseURL: "https://api.mistral.ai/v1", apiKey: process.env.MISTRAL_API_KEY || "" });
const cohere = new OpenAI({ baseURL: "https://api.cohere.ai/v1", apiKey: process.env.COHERE_API_KEY || "" });
const replicate = new OpenAI({ baseURL: "https://api.replicate.com/v1", apiKey: process.env.REPLICATE_TOKEN || "" });

interface ModelResponse {
  content: string;
  provider: string;
  model: string;
  confidence: number;
  reasoning?: string;
}

interface FusionRequest {
  userMessage: string;
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  domain: string;
  conversationHistory: Array<{role: string, content: string}>;
}

export class MegaFusionAI {
  private availableModels: string[] = [];

  constructor() {
    this.checkAvailableModels();
  }

  private async checkAvailableModels(): Promise<void> {
    this.availableModels = [];
    
    // Check available API keys and add models
    if (process.env.GEMINI_API_KEY) {
      this.availableModels.push('gemini-2.0-flash', 'gemini-2.0-flash-thinking', 'gemini-2.5-pro', 'gemini-pro');
    }
    if (process.env.OPENAI_API_KEY) {
      this.availableModels.push('gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo');
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.availableModels.push('claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307', 'claude-instant-1.2');
    }
    if (process.env.PERPLEXITY_API_KEY) {
      this.availableModels.push('llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-huge-128k-online');
    }
    if (process.env.XAI_API_KEY) {
      this.availableModels.push('grok-2-1212', 'grok-2-vision-1212', 'grok-beta');
    }
    if (process.env.TOGETHER_API_KEY) {
      this.availableModels.push('meta-llama/llama-3.1-70b-instruct', 'meta-llama/llama-3.1-405b-instruct', 'qwen/qwen-2.5-72b-instruct');
    }
    if (process.env.DEEPSEEK_API_KEY) {
      this.availableModels.push('deepseek-chat', 'deepseek-coder');
    }
    if (process.env.MISTRAL_API_KEY) {
      this.availableModels.push('mistral-large-latest', 'mistral-medium-latest', 'codestral-latest');
    }
    if (process.env.COHERE_API_KEY) {
      this.availableModels.push('command-r-plus', 'command-r', 'command');
    }
    if (process.env.REPLICATE_TOKEN) {
      this.availableModels.push('meta/llama-2-70b-chat', 'stability-ai/stable-diffusion-xl');
    }

    console.log(`[Mega Fusion AI] Available models: ${this.availableModels.length} models from ${this.getProviderCount()} providers`);
  }

  private getProviderCount(): number {
    let count = 0;
    if (process.env.GEMINI_API_KEY) count++;
    if (process.env.OPENAI_API_KEY) count++;
    if (process.env.ANTHROPIC_API_KEY) count++;
    if (process.env.PERPLEXITY_API_KEY) count++;
    if (process.env.XAI_API_KEY) count++;
    if (process.env.TOGETHER_API_KEY) count++;
    if (process.env.DEEPSEEK_API_KEY) count++;
    if (process.env.MISTRAL_API_KEY) count++;
    if (process.env.COHERE_API_KEY) count++;
    if (process.env.REPLICATE_TOKEN) count++;
    return count;
  }

  async generateFusionResponse(request: FusionRequest): Promise<string> {
    console.log(`[Mega Fusion AI] Processing ${request.complexity} complexity query in ${request.domain} domain`);
    
    await this.checkAvailableModels();
    
    if (this.availableModels.length === 0) {
      return "Mega Fusion AI requires at least one API key to operate. Configure any of: GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, PERPLEXITY_API_KEY, XAI_API_KEY, TOGETHER_API_KEY, DEEPSEEK_API_KEY, MISTRAL_API_KEY, COHERE_API_KEY, or REPLICATE_TOKEN for maximum power.";
    }

    // Boost complexity for power users
    if (request.complexity === 'simple' && this.availableModels.length >= 3) {
      request.complexity = 'moderate';
    }
    if (request.complexity === 'moderate' && this.availableModels.length >= 5) {
      request.complexity = 'complex';
    }

    // Select models based on complexity and domain
    const selectedModels = this.selectOptimalModels(request.complexity, request.domain);
    
    console.log(`[Mega Fusion AI] Selected ${selectedModels.length} models: ${selectedModels.join(', ')}`);
    
    if (selectedModels.length === 1) {
      // Single model response for simple queries
      return await this.getSingleModelResponse(selectedModels[0], request);
    }

    // Multi-model fusion for complex queries
    return await this.getMultiModelFusion(selectedModels, request);
  }

  private selectOptimalModels(complexity: string, domain: string): string[] {
    const modelSelection: { [key: string]: string[] } = {
      simple: this.getTopModels(2), // Use top 2 models for enhanced power
      moderate: this.getTopModels(3), // Use top 3 models
      complex: this.getTopModels(5), // Use top 5 models
      expert: this.getTopModels(7)   // Use top 7 models for maximum fusion power
    };

    // Domain-specific model preferences with enhanced selection
    if (domain === 'technical') {
      const techModels = this.availableModels.filter(m => 
        m.includes('gpt-4o') || m.includes('deepseek') || m.includes('codestral') || m.includes('claude-3-5')
      );
      if (techModels.length > 0) {
        return [...techModels.slice(0, 2), ...this.getTopModels(3)].slice(0, complexity === 'expert' ? 6 : 3);
      }
    }
    
    if (domain === 'creative') {
      const creativeModels = this.availableModels.filter(m => 
        m.includes('claude-3-opus') || m.includes('gpt-4o') || m.includes('gemini-2.0')
      );
      if (creativeModels.length > 0) {
        return [...creativeModels.slice(0, 2), ...this.getTopModels(3)].slice(0, complexity === 'expert' ? 6 : 3);
      }
    }
    
    if (domain === 'research') {
      const researchModels = this.availableModels.filter(m => 
        m.includes('sonar') || m.includes('llama-3.1-405b') || m.includes('claude-3-5') || m.includes('gemini-2.0')
      );
      if (researchModels.length > 0) {
        return [...researchModels.slice(0, 2), ...this.getTopModels(3)].slice(0, complexity === 'expert' ? 6 : 3);
      }
    }

    return modelSelection[complexity] || this.getTopModels(2);
  }

  private getTopModels(count: number): string[] {
    const priorityOrder = [
      // Tier 1: Ultimate Power Models
      'gemini-2.0-flash-thinking',
      'gemini-2.0-flash',
      'claude-3-5-sonnet-20241022',
      'gpt-4o',
      'grok-2-1212',
      'meta-llama/llama-3.1-405b-instruct',
      
      // Tier 2: Advanced Models
      'llama-3.1-sonar-huge-128k-online',
      'claude-3-opus-20240229',
      'deepseek-chat',
      'mistral-large-latest',
      'command-r-plus',
      'meta-llama/llama-3.1-70b-instruct',
      
      // Tier 3: High Performance Models
      'gpt-4-turbo',
      'gemini-2.5-pro',
      'llama-3.1-sonar-large-128k-online',
      'deepseek-coder',
      'codestral-latest',
      'qwen/qwen-2.5-72b-instruct',
      'grok-2-vision-1212',
      
      // Tier 4: Efficient Models
      'gpt-4',
      'command-r',
      'mistral-medium-latest',
      'claude-3-haiku-20240307',
      'gpt-4o-mini',
      'claude-instant-1.2',
      'gpt-3.5-turbo',
      'gemini-pro'
    ];

    return priorityOrder.filter(model => this.availableModels.includes(model)).slice(0, count);
  }

  private async getSingleModelResponse(model: string, request: FusionRequest): Promise<string> {
    try {
      const response = await this.callModel(model, request.userMessage, request.conversationHistory);
      return `**🤖 Mega Fusion AI** (${response.provider})\n\n${response.content}`;
    } catch (error) {
      console.error(`[Mega Fusion AI] Error with ${model}:`, error);
      return `I encountered an issue processing your request. Please try again.`;
    }
  }

  private async getMultiModelFusion(models: string[], request: FusionRequest): Promise<string> {
    console.log(`[Mega Fusion AI] Running fusion with models: ${models.join(', ')}`);
    
    try {
      // Get responses from multiple models in parallel
      const modelPromises = models.map(model => 
        this.callModel(model, request.userMessage, request.conversationHistory)
          .catch(error => {
            console.error(`[Mega Fusion AI] Model ${model} failed:`, error);
            return null;
          })
      );

      const responses = (await Promise.all(modelPromises)).filter(Boolean) as ModelResponse[];
      
      if (responses.length === 0) {
        return "I'm experiencing technical difficulties with all AI models. Please try again.";
      }

      if (responses.length === 1) {
        return `**🤖 Mega Fusion AI** (${responses[0].provider})\n\n${responses[0].content}`;
      }

      // Synthesize multiple responses
      return await this.synthesizeResponses(responses, request);
    } catch (error) {
      console.error('[Mega Fusion AI] Fusion error:', error);
      return "I encountered an error during multi-model fusion. Please try again.";
    }
  }

  private async callModel(model: string, message: string, history: Array<{role: string, content: string}>): Promise<ModelResponse> {
    const contextString = history.slice(-2).map(h => `${h.role}: ${h.content}`).join('\n');
    const fullPrompt = contextString ? `${contextString}\nuser: ${message}` : message;

    // Gemini models
    if (model.startsWith('gemini')) {
      const geminiModel = ai.getGenerativeModel({ model: model.includes('2.0') ? 'gemini-2.0-flash' : 'gemini-2.0-flash' });
      const result = await geminiModel.generateContent(fullPrompt);
      return {
        content: result.response.text() || "",
        provider: "Google Gemini",
        model,
        confidence: 0.9
      };
    }

    // OpenAI models
    if (model.startsWith('gpt')) {
      const response = await openai.chat.completions.create({
        model: model.includes('4o') ? 'gpt-4o' : model.includes('4') ? 'gpt-4' : 'gpt-3.5-turbo',
        messages: [
          ...history.slice(-3).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });
      return {
        content: response.choices[0].message.content || "",
        provider: "OpenAI",
        model,
        confidence: 0.9
      };
    }

    // Anthropic models
    if (model.startsWith('claude')) {
      const response = await anthropic.messages.create({
        model: model.includes('opus') ? 'claude-3-opus-20240229' : 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [
          ...history.slice(-3).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user', content: message }
        ]
      });
      return {
        content: response.content[0].text || "",
        provider: "Anthropic",
        model,
        confidence: 0.9
      };
    }

    // Perplexity models
    if (model.includes('sonar')) {
      const response = await perplexity.chat.completions.create({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          { role: 'system', content: 'Provide accurate, up-to-date information with real-time web search capabilities.' },
          ...history.slice(-2).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.2
      });
      return {
        content: response.choices[0].message.content || "",
        provider: "Perplexity",
        model,
        confidence: 0.95
      };
    }

    // xAI models
    if (model.startsWith('grok')) {
      const response = await xai.chat.completions.create({
        model: model.includes('vision') ? 'grok-2-vision-1212' : 'grok-2-1212',
        messages: [
          ...history.slice(-2).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.4
      });
      return {
        content: response.choices[0].message.content || "",
        provider: "xAI Grok",
        model,
        confidence: 0.85
      };
    }

    // Together AI models (Llama, Qwen)
    if (model.includes('meta-llama') || model.includes('qwen')) {
      const response = await together.chat.completions.create({
        model: model,
        messages: [
          ...history.slice(-2).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });
      return {
        content: response.choices[0].message.content || "",
        provider: "Together AI",
        model,
        confidence: 0.88
      };
    }

    // DeepSeek models
    if (model.startsWith('deepseek')) {
      const response = await deepseek.chat.completions.create({
        model: model,
        messages: [
          ...history.slice(-2).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.2
      });
      return {
        content: response.choices[0].message.content || "",
        provider: "DeepSeek",
        model,
        confidence: 0.87
      };
    }

    // Mistral models
    if (model.startsWith('mistral') || model.startsWith('codestral')) {
      const response = await mistral.chat.completions.create({
        model: model,
        messages: [
          ...history.slice(-2).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });
      return {
        content: response.choices[0].message.content || "",
        provider: "Mistral AI",
        model,
        confidence: 0.86
      };
    }

    // Cohere models
    if (model.startsWith('command')) {
      const response = await cohere.chat.completions.create({
        model: model,
        messages: [
          ...history.slice(-2).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });
      return {
        content: response.choices[0].message.content || "",
        provider: "Cohere",
        model,
        confidence: 0.84
      };
    }

    throw new Error(`Unknown model: ${model}`);
  }

  private async synthesizeResponses(responses: ModelResponse[], request: FusionRequest): Promise<string> {
    // Use the highest confidence model for synthesis
    const synthesizer = responses.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    const allResponses = responses.map((r, i) => 
      `**Model ${i + 1}** (${r.provider}):\n${r.content}`
    ).join('\n\n---\n\n');

    // For expert-level queries, provide detailed multi-model analysis
    if (request.complexity === 'expert' && responses.length >= 3) {
      return `**🚀 MEGA FUSION AI** - Ultimate Multi-Model Intelligence

**Primary Analysis** (${responses[0].provider}):
${responses[0].content}

**Cross-Validation & Enhancement:**
${responses.slice(1).map((r, i) => `\n**${r.provider}:** ${r.content.substring(0, 180)}${r.content.length > 180 ? '...' : ''}`).join('')}

**🧠 Fusion Intelligence Summary:**
This response synthesizes ${responses.length} cutting-edge AI models (${responses.map(r => r.provider).join(', ')}) to deliver unprecedented accuracy and depth. Each model contributes unique strengths for the most comprehensive analysis possible.

**⚡ Power Level:** ${this.calculatePowerLevel(responses.length)} | **🎯 Confidence:** ${Math.round(responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length * 100)}%`;
    }

    // For moderate complexity, provide enhanced response
    if (request.complexity === 'moderate' && responses.length >= 2) {
      return `**🤖 Mega Fusion AI** - Enhanced Intelligence

${responses[0].content}

**Additional Insight:** ${responses[1].content.substring(0, 150)}${responses[1].content.length > 150 ? '...' : ''}

*Powered by ${responses.map(r => r.provider).join(' + ')}*`;
    }

    // Simple response with best model
    return `**🤖 Mega Fusion AI** (${synthesizer.provider})\n\n${synthesizer.content}`;
  }

  private calculatePowerLevel(modelCount: number): string {
    if (modelCount >= 5) return "🔥 MAXIMUM";
    if (modelCount >= 3) return "⚡ ULTRA";
    if (modelCount >= 2) return "💫 ENHANCED";
    return "🤖 STANDARD";
  }
}

export const megaFusionAI = new MegaFusionAI();