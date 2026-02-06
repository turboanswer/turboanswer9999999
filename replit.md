# Turbo Answer - Advanced AI Assistant

## Overview

Turbo Answer is a sophisticated AI assistant application built with a React (TypeScript) frontend and Express.js backend, featuring Google Gemini-powered conversations. The application provides comprehensive knowledge across technical programming, science, and general domains with voice command support and a sleek modern interface. It also includes mobile app capability with Capacitor for Android APK generation, and a B2B embeddable AI widget system. The project aims to provide ultimate intelligence, ultra-fast responses, and comprehensive coverage across various professional domains through a revolutionary multi-model AI system.

## User Preferences

Preferred communication style: Simple, everyday language.
Design preference: Clean, modern interface with professional dark theme - completely redesigned from scratch with minimal, fast UI.
Layout preference: Bigger layout showing all options in one screen for better accessibility.
Stability preference: App must be completely stable with NO moving elements, animations, or transitions. Settings must always be visible.
Intelligence preference: AI should give simple, clear, direct answers without complex explanations. For simple questions, keep responses short and conversational.
Interface priority: Ensure settings buttons are always accessible and never blocked by app movement.
Performance priority: AI responses must be ULTRA-FAST - enhanced with Gemini 2.0 Flash Experimental for breakthrough speed. NO LAG ALLOWED. Maximum performance optimization with turbocharged conversational AI for live human conversations. Target: Sub-300ms responses for simple queries.
Power preference: Enhanced logo, loading screen, and maximum power branding throughout the interface.
Voice preference: Voice assistant called "Turbo" with optional wake word detection (disabled by default for performance).
Subscription preference: Lifetime free premium access through promo code system for creator access.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: Replit Auth (OpenID Connect) with session management
- **UI/UX Decisions**: Pure black (#000000) interface matching ChatGPT mobile design, mobile-first optimization, instant loading, single-column chat interface, all animations and transitions disabled for stability.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **API Style**: RESTful API endpoints
- **AI Integration**: Multi-model AI system with intelligent routing (Gemini, OpenAI, Anthropic, Perplexity, xAI, Llama, Mistral, Cohere, etc.)
- **Authentication**: Replit Auth (OpenID Connect via Passport.js) with PostgreSQL session storage

### Database Strategy
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`
- **Current Storage**: In-memory storage implementation (`MemStorage`) for development
- **Migration Strategy**: Drizzle Kit for schema migrations
- **Authentication Storage**: User sessions and account data

### Key Features
- **Simplified Gemini AI System**: 3 clean models - Free (Gemini 2.5 Flash), Pro (Gemini 2.5 Pro), Research (Gemini 2.5 Pro deep mode). All powered by Google Gemini API with automatic retry and model fallback on rate limits.
- **Voice Command Features**: Speech recognition (Web Speech API), "Turbo" assistant name, optional "Hey Turbo" wake word, auto-send, text-to-speech, and visual feedback.
- **Comprehensive Knowledge Coverage**: Expert-level knowledge in technical, scientific, creative, business, and general domains, including real-time weather and world time zone intelligence.
- **Subscription Management**: Stripe Checkout integration for Pro plan ($6.99/month). Payment popup triggers from model selector. Uses Replit Stripe connector with stripe-replit-sync for webhook handling and data sync.
- **Employee Management API**: Endpoints for user management (ban, flag, suspend) and audit logging.
- **AI Image & Video Generation**: Integration with OpenAI DALL-E 3 and a framework for video generation with multi-provider architecture.
- **Embeddable AI Widget System**: A universal JavaScript widget (`turbo-answer-widget.js`) for seamless integration into any website.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL serverless driver
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI primitives
- **drizzle-orm**: Database ORM and query builder
- **@google/generative-ai**: Official Google Gemini AI SDK
- **stripe**: Stripe payment processing SDK
- **@stripe/react-stripe-js**: React Stripe.js integration
- **@stripe/stripe-js**: Stripe.js client library
- **tailwindcss**: Utility-first CSS framework
- **typescript**: Type safety across the stack
- **vite**: Fast development server and build tool
- **drizzle-kit**: Database schema management
- **esbuild**: Server-side bundling for production
- **@capacitor/core**: Native mobile app wrapper
- **@capacitor/cli**: Mobile build tools
- **@capacitor/android**: Android platform support
- **OpenMeteo API**: For real-time weather data (no API key required).
- **OpenAI API**: For GPT models and DALL-E 3 (secondary/image generation).
- **Anthropic API**: For Claude models (optional).