# Turbo Answer - Advanced AI Assistant

## Overview
Turbo Answer is a sophisticated AI assistant application combining a React (TypeScript) frontend with an Express.js backend, powered by Google Gemini and other advanced AI models. It offers comprehensive knowledge across technical, scientific, and general domains, enhanced with voice commands and a modern user interface. The project supports mobile app capabilities via Capacitor and includes a B2B embeddable AI widget system. The core vision is to deliver ultimate intelligence, ultra-fast responses, and extensive coverage across professional fields through a revolutionary multi-model AI system, providing various tiers from free to enterprise, including specialized features like Code Studio, AI Video Studio, and a Crisis Support Bot.

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

### Frontend
- **Framework**: React 18 with TypeScript, Vite
- **UI**: Tailwind CSS with shadcn/ui, dark/light theme, mobile-first, floating bubble backgrounds, chat bubble styling.
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod

### Backend
- **Framework**: Express.js with TypeScript, Node.js (ES modules)
- **API**: RESTful
- **AI Integration**: Multi-model AI system with intelligent routing (Gemini, OpenAI, Anthropic, Perplexity, xAI, Llama, Mistral, Cohere).

### Database
- **ORM**: Drizzle ORM with PostgreSQL
- **Schema**: Shared definitions in `/shared/schema.ts`
- **Migration**: Drizzle Kit

### Key Features
- **Multi-Model AI System**: Tiered access (Free, Pro, Research, Enterprise) with intelligent routing and synthesis by Claude.
- **Voice Command**: Speech recognition, "Turbo" assistant name, optional wake word, auto-send, text-to-speech.
- **Comprehensive Knowledge**: Expert-level knowledge across various domains, including real-time weather, time zones, and live current events search.
- **Subscription Management**: PayPal Subscriptions API for plan management, including a 7-day free trial.
- **Admin Panel**: Five-tab interface for user, subscription, system, and alert management.
- **Performance**: API rate limiting, response compression, in-memory caching, optimized DB connection pool, and token streaming for fast responses.
- **Security**: Comprehensive penetration-test-hardened security including HTTP security headers, bcrypt for passwords, intrusion detection, CSRF protection, tiered rate limiting, HTTP method restriction, sanitized error responses, and conversation ownership enforcement.
- **Content Moderation**: Automatic profanity/threat detection with user suspension.
- **Customer Support Tickets**: System for signed-in users and guests to open, manage, and reply to support tickets.
- **Auto-Translation (Google Translate)**: Floating language pill for UI translation based on device locale.
- **Crisis Support Bot**: Dedicated, private, AES-256-GCM encrypted AI for mental health support.
- **Media Studio**: Enterprise-exclusive video and photo editor with AI-powered suggestions.
- **AI Scanner**: Free feature to read, transcribe, and summarize images using Gemini vision.
- **AI Video Generation**: Research/Enterprise feature powered by Google Veo 3.1.
- **Code Studio**: In-browser IDE add-on with Monaco editor, multi-file support, "Long Build Mode" with multiple AI agents, and a Secrets Manager.
- **Enterprise Workgroups**: Team collaboration system with group chat, DMs, member management, and AI-powered conversation summaries.
- **Collaborative AI Rooms**: Real-time multiplayer rooms for users to chat together with AI.
- **AI Fact-Check Chain**: Independent AI verification of chat responses with confidence scores and detailed explanations.
- **Embeddable AI Widget**: Universal JavaScript widget for website integration.
- **Promo Code System**: Database-driven system for discounts and free access.
- **Beta Testing Program**: Public application and feedback system for new features.
- **Automated Email System**: Brevo-powered transactional emails for various user actions.

## External Dependencies
- **@neondatabase/serverless**: PostgreSQL driver
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI primitives
- **drizzle-orm**: Database ORM
- **@google/generative-ai**: Official Google Gemini AI SDK
- **PayPal REST API**: For payment processing
- **tailwindcss**: CSS framework
- **typescript**: Language
- **vite**: Build tool
- **drizzle-kit**: Database schema management
- **esbuild**: Server-side bundling
- **@capacitor/core**: Native mobile app wrapper
- **@capacitor/android**: Android platform support
- **OpenMeteo API**: Real-time weather data
- **OpenAI API**: GPT models and DALL-E 3
- **Anthropic API**: Claude models
- **Brevo**: Transactional email delivery
- **Twilio**: SMS verification for registration
- **Gemini Grounded Search**: Real-time web search for current events queries