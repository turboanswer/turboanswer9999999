# Chat Application with Local AI Assistant

## Overview

This is a full-stack chat application built with React (TypeScript) frontend and Express.js backend, featuring AI-powered conversations using a local pattern-matching assistant. The application supports multiple conversations with message history and real-time chat functionality without external API dependencies.

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
- **Users**: Basic user management with username/password
- **Conversations**: Chat sessions with titles and timestamps (removed thread ID dependency)
- **Messages**: Individual messages with conversation references, content, role (user/assistant), and timestamps

### API Endpoints
- `GET /api/conversations` - Retrieve all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get specific conversation
- `GET /api/conversations/:id/messages` - Get messages for conversation
- `POST /api/conversations/:id/messages` - Send message and get AI response

### Frontend Pages
- **Chat Page** (`/`): Main chat interface with conversation management
- **404 Page**: Error handling for unknown routes

### Simple AI Assistant Integration
- Uses local rule-based AI responses instead of external API services
- Pattern-matching responses for common topics (JavaScript, Python, programming)
- Built-in conversation context awareness
- No external API dependencies or costs
- Instant responses with simulated processing delay
- Educational responses covering programming concepts and general help

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
- **openai**: Official OpenAI SDK
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **typescript**: Type safety across the stack
- **vite**: Fast development server and build tool
- **drizzle-kit**: Database schema management
- **esbuild**: Server-side bundling for production

## Deployment Strategy

### Development Environment
- Vite dev server for frontend hot reloading
- tsx for TypeScript execution in development
- Concurrent frontend/backend development setup

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: esbuild bundles server code to `dist/index.js`
- **Database**: Environment variable `DATABASE_URL` for PostgreSQL connection
- **OpenAI**: Environment variable `OPENAI_API_KEY` for API access

### Environment Configuration
- Development uses in-memory storage for rapid prototyping
- Production requires PostgreSQL database provisioning
- OpenAI API key configuration for AI functionality
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

### OpenAI Model Selection
- **Decision**: GPT-4o (latest model as of May 2024)
- **Rationale**: Best performance and latest capabilities
- **Configuration**: Fixed model choice unless explicitly requested to change