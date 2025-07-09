# Turbo Answer - Advanced AI Assistant

## Overview

Turbo Answer is a sophisticated AI assistant application built with React (TypeScript) frontend and Express.js backend, featuring Google Gemini-powered conversations. The application provides comprehensive knowledge across technical programming, science, and general domains with voice command support and a sleek modern interface. Now includes mobile app capability with Capacitor for Android APK generation.

## User Preferences

Preferred communication style: Simple, everyday language.
Design preference: Sleek black theme with modern UI aesthetics.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **API Style**: RESTful API endpoints
- **AI Integration**: OpenAI Assistant API with dedicated service layer
- **Middleware**: Express JSON parsing, custom logging middleware

### Database Strategy
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`
- **Current Storage**: In-memory storage implementation (`MemStorage`)
- **Migration Strategy**: Drizzle Kit for schema migrations

## Key Components

### Database Schema
- **Users**: User management with subscription support (username, password, email, Stripe customer/subscription IDs, subscription status/tier)
- **Conversations**: Chat sessions with titles and timestamps (removed thread ID dependency)
- **Messages**: Individual messages with conversation references, content, role (user/assistant), and timestamps

### API Endpoints
- `GET /api/conversations` - Retrieve all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get specific conversation
- `GET /api/conversations/:id/messages` - Get messages for conversation
- `POST /api/conversations/:id/messages` - Send message and get AI response
- `POST /api/get-or-create-subscription` - Create Stripe subscription for Pro plan

### Frontend Pages
- **Chat Page** (`/`): Main chat interface with conversation management
- **Subscribe Page** (`/subscribe`): Stripe-powered subscription upgrade to Pro plan
- **404 Page**: Error handling for unknown routes

### Google Gemini AI Integration
- **Free Tier**: Google Gemini 2.5 Flash model for standard AI responses
- **Pro Tier ($3.99/month)**: Google Gemini 2.5 Pro model for advanced AI capabilities
- Comprehensive knowledge across multiple disciplines: technology, science, humanities, social sciences
- Universal question handling: can answer virtually any topic with intelligent responses
- Technical coverage: JavaScript/React, Python, databases, algorithms, debugging, testing, security, deployment
- Scientific knowledge: physics, chemistry, biology, earth science, mathematics
- Humanities expertise: history, literature, philosophy, cultural studies
- Daily assistance: time/date queries, calculations, definitions, health information
- Contextual conversation awareness using message history
- Professional-grade responses with detailed explanations and best practices
- Career guidance and technical interview preparation
- Requires GEMINI_API_KEY environment variable for Google AI API access

### Voice Command Features
- **Speech Recognition**: Web Speech API integration for voice input
- **Text-to-Speech**: Automatic AI response playback with voice synthesis
- **Interactive Controls**: Microphone button in header and input area
- **Visual Feedback**: Recording indicators and real-time status updates
- **Hover Actions**: Click-to-speak buttons on AI messages
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

### AI Model Selection
- **Decision**: Google Gemini 2.5 Flash (latest Gemini model)
- **Rationale**: Advanced multimodal capabilities and comprehensive knowledge base
- **Configuration**: Gemini API integration with contextual conversation awareness