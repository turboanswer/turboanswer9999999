# Turbo Answer - Advanced AI Assistant

## Overview

Turbo Answer is a sophisticated AI assistant application built with React (TypeScript) frontend and Express.js backend, featuring Google Gemini-powered conversations. The application provides comprehensive knowledge across technical programming, science, and general domains with voice command support and a sleek modern interface. Now includes mobile app capability with Capacitor for Android APK generation.

## User Preferences

Preferred communication style: Simple, everyday language.
Design preference: Clean, modern interface with professional dark theme - completely redesigned from scratch with minimal, fast UI.
Layout preference: Bigger layout showing all options in one screen for better accessibility.
Stability preference: App must be completely stable with NO moving elements, animations, or transitions. Settings must always be visible.
Intelligence preference: AI should give simple, clear, direct answers without complex explanations. For simple questions, keep responses short and conversational.
Interface priority: Ensure settings buttons are always accessible and never blocked by app movement.
Performance priority: AI responses must be fast - streamlined AI processing with working Gemini service. NO LAG ALLOWED. Maximum performance optimization with conversational AI for live human conversations.
Power preference: Enhanced logo, loading screen, and maximum power branding throughout the interface.
Voice preference: Voice assistant called "Turbo" with optional wake word detection (disabled by default for performance).

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: Local authentication with session management

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **API Style**: RESTful API endpoints
- **AI Integration**: Multi-model AI system with Gemini, OpenAI, and Anthropic support
- **Authentication**: Session-based authentication with PostgreSQL storage
- **Middleware**: Express JSON parsing, custom logging middleware

### Database Strategy
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`
- **Current Storage**: In-memory storage implementation (`MemStorage`)
- **Migration Strategy**: Drizzle Kit for schema migrations
- **Authentication Storage**: User sessions and account data

## Key Components

### AI Models Available
- **Auto-Select**: Intelligent routing to best available model
- **Conversational AI**: Specialized for natural human conversations with personality matching
- **Emotional AI**: Deep emotional intelligence with empathetic responses
- **Claude 3 Opus**: Advanced reasoning and creative tasks
- **GPT-4**: Multimodal intelligence and coding expertise
- **Claude 3 Sonnet**: Balanced performance with detailed analysis
- **GPT-3.5 Turbo**: Fast responses for general queries
- **Gemini Pro**: Multimodal capabilities and research

### Database Schema
- **Users**: User management with subscription support (username, password, email, Stripe customer/subscription IDs, subscription status/tier)
- **Conversations**: Chat sessions with titles and timestamps (removed thread ID dependency)
- **Messages**: Individual messages with conversation references, content, role (user/assistant), and timestamps

### API Endpoints
- `POST /api/register` - Create new user account with username, email, and password
- `POST /api/login` - Authenticate user with username/email and password
- `GET /api/conversations` - Retrieve all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get specific conversation
- `GET /api/conversations/:id/messages` - Get messages for conversation
- `POST /api/conversations/:id/messages` - Send message and get AI response
- `POST /api/analyze-document` - Upload and analyze documents with AI
- `GET /api/analysis-options` - Get available document analysis types
- `GET /api/supported-file-types` - Get supported file formats for upload
- `GET /api/weather/:location` - Get real-time weather data for any location
- `GET /api/location/:location` - Get location information and local time
- `POST /api/get-or-create-subscription` - Create Stripe subscription for Pro plan

### Frontend Pages
- **Chat Page** (`/`): Main chat interface with conversation management, document upload, and user authentication
- **Register Page** (`/register`): User account creation with username, email, and password
- **Login Page** (`/login`): User authentication with username/email and password
- **Subscribe Page** (`/subscribe`): Stripe-powered subscription upgrade to Pro plan
- **404 Page**: Error handling for unknown routes

### MAXIMUM POWER AI System: The Ultimate AI Assistant
- **ULTIMATE Intelligence**: 4-tier AI system with Claude 4.0 Sonnet, GPT-4o, Claude 3 Opus, and advanced models
- **Emotional AI**: Real-life conversational model that understands feelings and emotions with empathetic responses
- **Priority-Based Routing**: Automatic selection of the most powerful available model
- **Expert-Level Reasoning**: Multi-layered complex problem-solving with breakthrough insights
- **Real-Time Intelligence**: Live weather data, world location knowledge, and time zone expertise
- **Adaptive Communication**: Exceeds user expectations with maximum performance
- **Conversational Intelligence**: Emotional analysis, empathy levels, mood detection, and human-like interactions
- **Comprehensive Coverage**: Technical mastery, scientific expertise, creative innovation, and general knowledge
- **Maximum Performance**: Optimized for fast responses (50-100 token limits) with no lag

#### Emotional AI and Conversational Features
- **Emotional Intelligence**: Advanced emotion detection and analysis (happiness, sadness, anxiety, excitement, etc.)
- **Empathetic Responses**: AI validates feelings and provides appropriate emotional support
- **Conversation Memory**: Remembers emotional context and user personality across conversations
- **Real-Life Interactions**: Natural, human-like conversations that understand social and emotional cues
- **Adaptive Empathy**: Adjusts empathy level based on emotional intensity (1-10 scale)
- **Context Awareness**: Maintains conversation history for relevant follow-ups and emotional continuity
- **Direct Answers**: AI gives simple, clear responses without complex explanations
- **Everyday Language**: Avoids technical jargon, uses simple terms when appropriate

#### Comprehensive Knowledge Coverage
- **Technical Mastery**: Expert-level programming, system design, and debugging
- **Scientific Expertise**: Advanced mathematics, research methodology, data analysis
- **Creative Problem-Solving**: Innovation strategies and multi-domain synthesis
- **Professional Applications**: Business analysis, strategic planning, optimization
- **World Time Zone Intelligence**: Complete knowledge of global time zones, UTC offsets, DST rules, and major cities

#### API Requirements
- GEMINI_API_KEY for Google AI services (primary AI provider)
- OPENAI_API_KEY for GPT models (secondary - quota exceeded)
- ANTHROPIC_API_KEY for Claude models (optional)
- WEATHER_API_KEY or OPENWEATHER_API_KEY for weather data (free tier available)

### ChatGPT-Style Mobile Interface Design
- **Black Background**: Pure black (#000000) interface matching ChatGPT mobile design
- **Mobile-First**: Optimized for mobile devices with touch-friendly controls
- **Instant Loading**: No startup screen for faster access  
- **Simple Layout**: Single-column chat interface with header and input area
- **Zero Movement**: ALL animations and transitions disabled globally via CSS for complete stability
- **Hey Turbo Wake Word**: Advanced voice activation with "Hey Turbo" detection
- **Live Conversations**: Optimized for natural, human-like conversations with AI
- **Performance Maximum**: Ultra-fast responses with conversational and emotional AI models
- **Voice Features**: Speech recognition, auto-send, and text-to-speech integration
- **Modern Typography**: Clean Inter font with white text on black background

### Voice Command Features
- **Speech Recognition**: Web Speech API integration for voice input
- **Voice Assistant Name**: "Turbo" - responds to user voice commands
- **Wake Word Detection**: Optional "Hey Turbo" wake word (disabled by default to prevent lag)
- **Auto-Send**: Voice messages automatically sent after speech detection
- **Text-to-Speech**: Automatic AI response playback with voice synthesis
- **AI Talks Back**: Conversational and Emotional AI models automatically speak their responses
- **Interactive Controls**: Large microphone button in input area
- **Visual Feedback**: Recording indicators and real-time status updates
- **Hover Actions**: Click-to-speak buttons on AI messages
- **Natural Voice Selection**: Prioritizes enhanced, natural, and premium voices
- **Browser Support**: Works in Chrome, Safari, and other Webkit-based browsers
- **Error Handling**: Graceful fallbacks for unsupported browsers and permission issues

## Data Flow

1. **Conversation Creation**: User creates new conversation → API stores conversation → Frontend updates conversation list
2. **Message Flow**: User sends message → API stores user message → Local AI generates response → API stores AI response → Frontend displays both messages
3. **State Management**: React Query handles caching, synchronization, and optimistic updates

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI primitives
- **drizzle-orm**: Database ORM and query builder
- **@google/genai**: Official Google Gemini AI SDK
- **stripe**: Stripe payment processing SDK
- **@stripe/react-stripe-js**: React Stripe.js integration
- **@stripe/stripe-js**: Stripe.js client library
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **typescript**: Type safety across the stack
- **vite**: Fast development server and build tool
- **drizzle-kit**: Database schema management
- **esbuild**: Server-side bundling for production
- **@capacitor/core**: Native mobile app wrapper
- **@capacitor/cli**: Mobile build tools
- **@capacitor/android**: Android platform support

## Deployment Strategy

### Development Environment
- Vite dev server for frontend hot reloading
- tsx for TypeScript execution in development
- Concurrent frontend/backend development setup

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Database**: Environment variable `DATABASE_URL` for PostgreSQL connection
- **Gemini AI**: Environment variable `GEMINI_API_KEY` for Google AI API access

### Mobile Deployment
- **Android APK**: Capacitor wraps React app for native Android deployment
- **Build Process**: `vite build` → `npx cap sync` → `gradlew assembleDebug`
- **Platform Support**: Android with HTTPS scheme and splash screen configuration
- **Distribution**: APK generation ready for Google Play Store publishing

### Environment Configuration
- Development uses in-memory storage for rapid prototyping
- Production requires PostgreSQL database provisioning
- Google Gemini API key configuration for AI functionality
- Replit-specific optimizations for cloud deployment

## Architecture Decisions

### Multi-Model AI Architecture
- **Decision**: Three-tier AI system with multiple language models per tier
- **Rationale**: Provides redundancy, optimal performance per task type, and user choice
- **Implementation**: Intelligent routing based on query complexity and domain
- **Fallback Strategy**: Automatic model switching for reliability

### Enhanced Intelligence System
- **Decision**: Advanced context analysis and user intent recognition
- **Benefits**: Smarter responses, better task matching, improved user experience
- **Features**: Complexity detection, domain classification, conversation continuity
- **Result**: Superior AI assistance with human-like reasoning

### Stable UI Design
- **Decision**: Remove all animations and moving elements for stability
- **Rationale**: User preference for distraction-free, professional interface
- **Implementation**: Static logo, minimal startup, fixed interface elements
- **Benefit**: Improved focus and reduced cognitive load

### In-Memory vs Database Storage
- **Current**: In-memory storage for development simplicity
- **Future**: PostgreSQL with Drizzle ORM for production persistence
- **Rationale**: Allows rapid development while maintaining production-ready schema

### Shared Schema Approach
- **Decision**: Single schema file shared between frontend and backend
- **Benefits**: Type safety, reduced duplication, consistent data models
- **Location**: `/shared/schema.ts` with Drizzle and Zod integration

### Component Library Choice
- **Decision**: shadcn/ui with Radix UI primitives
- **Benefits**: Accessible components, customizable with Tailwind, TypeScript support
- **Trade-off**: Larger bundle size for comprehensive component set