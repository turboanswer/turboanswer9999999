# Custom AI Integration Guide

## 🤖 Use Your Own AI Service

Your Turbo Answer app is now configured to use **your own AI service** instead of the complex multi-model system.

## ⚡ Quick Setup

### 1. Configure Your AI Service

Edit your environment variables:

```bash
# Your custom AI endpoint
CUSTOM_AI_ENDPOINT=https://your-ai-service.com/api/chat
CUSTOM_AI_API_KEY=your-api-key-here
CUSTOM_AI_MODEL=your-model-name
```

### 2. Supported AI Service Formats

#### OpenAI-Compatible APIs
Most AI services use OpenAI's format:
```json
{
  "model": "your-model",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "Hello"}
  ],
  "max_tokens": 500,
  "temperature": 0.3
}
```

#### Simple Text APIs
For basic text-to-text services:
```bash
SIMPLE_AI_ENDPOINT=https://your-service.com/generate
SIMPLE_AI_API_KEY=your-key
```

## 🔧 Configuration Options

### Option 1: OpenAI-Compatible Service
Works with: Anthropic, Google AI, Azure OpenAI, local models, etc.

```bash
CUSTOM_AI_ENDPOINT=https://api.anthropic.com/v1/messages
CUSTOM_AI_API_KEY=sk-ant-...
CUSTOM_AI_MODEL=claude-3-sonnet-20240229
```

### Option 2: Local AI Model
Run your own model locally:

```bash
CUSTOM_AI_ENDPOINT=http://localhost:11434/api/chat
CUSTOM_AI_API_KEY=not-needed
CUSTOM_AI_MODEL=llama2
```

### Option 3: Simple HTTP API
Basic request/response format:

```bash
SIMPLE_AI_ENDPOINT=https://your-custom-ai.com/chat
SIMPLE_AI_API_KEY=your-key
```

## 📝 How It Works

1. **Fast & Simple**: Removed complex multi-model system
2. **Direct Integration**: Calls your AI service directly
3. **Error Handling**: Falls back gracefully if service is unavailable
4. **Speed Optimized**: Uses only last 3 messages for context
5. **Token Limit**: Keeps responses under 500 tokens for speed

## 🛠 Customization

### Edit the AI Service Code
File: `server/services/custom-ai.ts`

```typescript
// Change the API format for your service
const response = await fetch(AI_CONFIG.endpoint, {
  method: "POST",
  headers: AI_CONFIG.headers,
  body: JSON.stringify({
    // Customize this for your AI service
    model: AI_CONFIG.model,
    prompt: userMessage,  // Some services use 'prompt' instead of 'messages'
    max_tokens: 500
  })
});
```

### Change the System Prompt
Edit the `SYSTEM_PROMPT` variable to match your needs:

```typescript
const SYSTEM_PROMPT = `You are my custom AI assistant. Always respond in [your style].`;
```

## 🚀 Popular AI Services

### Anthropic Claude
```bash
CUSTOM_AI_ENDPOINT=https://api.anthropic.com/v1/messages
CUSTOM_AI_API_KEY=sk-ant-your-key
CUSTOM_AI_MODEL=claude-3-sonnet-20240229
```

### Google Gemini
```bash
CUSTOM_AI_ENDPOINT=https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent
CUSTOM_AI_API_KEY=your-google-api-key
CUSTOM_AI_MODEL=gemini-pro
```

### Local Ollama
```bash
CUSTOM_AI_ENDPOINT=http://localhost:11434/api/chat
CUSTOM_AI_MODEL=llama2
```

### Azure OpenAI
```bash
CUSTOM_AI_ENDPOINT=https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions
CUSTOM_AI_API_KEY=your-azure-key
CUSTOM_AI_MODEL=gpt-4
```

## ✅ Testing Your Setup

1. Set your environment variables
2. Restart the app
3. Send a test message
4. Check console logs for any connection issues

Your app will automatically use your custom AI service for all responses!