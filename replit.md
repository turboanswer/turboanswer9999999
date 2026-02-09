# Turbo Answer - Advanced AI Assistant

## Overview

Turbo Answer is a sophisticated AI assistant application built with a React (TypeScript) frontend and Express.js backend, featuring Google Gemini-powered conversations. The application provides comprehensive knowledge across technical programming, science, and general domains with voice command support and a sleek modern interface. It also includes mobile app capability with Capacitor for Android APK generation, and a B2B embeddable AI widget system. The project aims to provide ultimate intelligence, ultra-fast responses, and comprehensive coverage across various professional domains through a revolutionary multi-model AI system.

## User Preferences

Preferred communication style: Simple, everyday language.
Design preference: Clean, modern interface with dark/light theme switcher, TurboAnswer robot logo branding, floating bubble backgrounds, chat bubble message styling.
Layout preference: Bigger layout showing all options in one screen for better accessibility.
Theme preference: Dark and white themes selectable by user via sun/moon toggle button in header.
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
- **Authentication**: Custom email/password auth with bcrypt hashing and PostgreSQL session storage. Admin auto-detection for support@turboanswer.it.com
- **UI/UX Decisions**: Dark/light theme with TurboAnswer branding, mobile-first optimization, floating bubble backgrounds, chat bubble message design, theme toggle in header.

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
- **Multi-Model AI System**: 4 tiers - Free (Gemini 2.5 Flash), Pro ($6.99/mo - Gemini Pro), Research ($15/mo - Gemini 2.5 Pro), Enterprise ($50/mo - Research access + shareable 6-digit code for up to 5 team members, 33% savings vs individual plans). All Gemini-powered with automatic fallback on rate limits. Research tier includes Pro access. Enterprise includes Research access. Custom team plans available via support@turboanswer.it.com for teams larger than 5.
- **Voice Command Features**: Speech recognition (Web Speech API), "Turbo" assistant name, optional "Hey Turbo" wake word, auto-send, text-to-speech, and visual feedback.
- **Comprehensive Knowledge Coverage**: Expert-level knowledge in technical, scientific, creative, business, and general domains, including real-time weather and world time zone intelligence.
- **Subscription Management**: PayPal Subscriptions API integration for Pro ($6.99/month), Research ($15/month), and Enterprise ($50/month) plans. Payment popups trigger from model selector. Uses PayPal REST API with auto-created billing plans. Enterprise subscribers get a secure 6-digit numeric code saved to their account (persists across sessions) to share with up to 5 team members for Research access. Custom pricing available for larger teams via support email.
- **Account Management**: Delete account functionality in AI settings with PayPal auto-cancellation and complete data removal.
- **Customer Support**: Email (support@turboanswer.it.com), Phone (518-250-5405), Hours: Mon-Fri 10am-4pm EST.
- **Employee Management API**: Endpoints for user management (ban, flag, suspend) and audit logging.
- **Content Moderation System**: Automatic profanity/threat detection on user messages. Flagged users are auto-suspended with admin notifications sent to the admin panel showing full user details, flagged content, and action taken.
- **Crisis Support Bot**: Dedicated AI companion for mental health crisis support with AES-256-GCM encrypted conversations. Fully private - exempt from content moderation, no admin access, no data shared with authorities. Includes crisis hotline resources (988, Crisis Text Line). Users can delete all crisis data permanently. Specialized Gemini-powered AI with safety settings disabled for sensitive topic support.
- **AI Image & Video Generation**: Integration with OpenAI DALL-E 3 and a framework for video generation with multi-provider architecture.
- **Embeddable AI Widget System**: A universal JavaScript widget (`turbo-answer-widget.js`) for seamless integration into any website.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL serverless driver
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI primitives
- **drizzle-orm**: Database ORM and query builder
- **@google/generative-ai**: Official Google Gemini AI SDK
- **PayPal REST API**: PayPal Subscriptions v1 API for payment processing (no npm package, uses fetch)
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