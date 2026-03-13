# Turbo Answer - Advanced AI Assistant

## Overview

Turbo Answer is a sophisticated AI assistant application that combines a React (TypeScript) frontend with an Express.js backend, powered by Google Gemini and other advanced AI models. It offers comprehensive knowledge across technical, scientific, and general domains, enhanced with voice commands and a modern user interface. The project also supports mobile app capabilities via Capacitor and includes a B2B embeddable AI widget system. The core vision is to deliver ultimate intelligence, ultra-fast responses, and extensive coverage across professional fields through a revolutionary multi-model AI system, providing various tiers from free to enterprise, including specialized features like Code Studio, AI Video Studio, and a Crisis Support Bot.

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
- **Multi-Model AI System**: Tiered access (Free, Pro, Research, Enterprise) with intelligent routing based on query complexity. Simple queries default to Gemini Flash Lite, while complex Research/Enterprise queries use Claude Opus 4.5 primary with Gemini 3.1 Pro fallback.
- **Voice Command**: Speech recognition, "Turbo" assistant name, optional wake word, auto-send, text-to-speech.
- **Comprehensive Knowledge**: Expert-level knowledge across various domains, including real-time weather and time zones.
- **Subscription Management**: PayPal Subscriptions API for plan management, including a 7-day free trial.
- **Admin Panel**: Five-tab interface for user, subscription, system, and alert management, including complimentary access and proactive self-diagnosis.
- **Performance**: API rate limiting, response compression, in-memory caching for expensive endpoints, optimized DB connection pool.
- **Security**: Google reCAPTCHA v2 on login and register pages (server-side token verification via `verifyRecaptcha()`); HTTP security headers on every response (X-Frame-Options: DENY, X-Content-Type-Options, X-XSS-Protection, HSTS, Referrer-Policy, Permissions-Policy, CSP in production); passwords hashed with bcrypt (cost factor 12). reCAPTCHA uses Google test keys by default; set `VITE_RECAPTCHA_SITE_KEY` + `RECAPTCHA_SECRET_KEY` env vars for production keys from https://www.google.com/recaptcha/admin/create.
- **Content Moderation**: Automatic profanity/threat detection with user suspension and admin notifications.
- **Crisis Support Bot**: Dedicated, private, AES-256-GCM encrypted AI for mental health support, exempt from moderation.
- **Media Studio**: Enterprise-exclusive video and photo editor with filters, text overlays, and AI-powered suggestions.
- **AI Scanner**: Free feature to read, transcribe, and summarize images using Gemini vision.
- **AI Video Generation**: Research/Enterprise feature powered by Google Veo 3.1, supporting video generation from text prompts.
- **Code Studio**: An in-browser IDE add-on with complexity-based pricing, Monaco editor, multi-file support, and Gemini 3.1 Pro integration.
- **Embeddable AI Widget**: Universal JavaScript widget for website integration.
- **Promo Code System**: Database-driven system for discounts and free access.
- **Beta Testing Program**: Public application and feedback system for new features.
- **Automated Email System**: Brevo-powered transactional emails for welcome (on registration), subscription signup, plan switch, cancellation, and payment failure. PayPal payment-failed webhook at `POST /api/paypal/webhook` — register this URL in the PayPal developer dashboard under your app's webhook settings for the `BILLING.SUBSCRIPTION.PAYMENT.FAILED` event.

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