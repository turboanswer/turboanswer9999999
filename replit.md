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
- **Multi-Model AI System**: Tiered access (Free, Pro, Research, Enterprise) with intelligent routing based on query complexity. Simple queries default to Gemini Flash Lite. Complex Research/Enterprise queries use a 10-agent multi-perspective system — 10 specialized AI agents each powered by a different AI model via OpenRouter (GPT-4o, Claude Sonnet 4, Mistral Large, Gemini 2.5 Flash, Command R+, Llama 3.1 70B, Qwen 2.5 72B, DeepSeek V3, Perplexity Sonar Pro, Nemotron 70B). All 10 analyze in parallel, then Claude synthesizes into one comprehensive answer. Fallback: Claude → Gemini if OpenRouter unavailable.
- **Voice Command**: Speech recognition, "Turbo" assistant name, optional wake word, auto-send, text-to-speech.
- **Comprehensive Knowledge**: Expert-level knowledge across various domains, including real-time weather, time zones, and **live current events search** (Gemini grounded search for questions about recent news, deaths, breaking events — automatically detects and fetches real-time information to override outdated training data).
- **Subscription Management**: PayPal Subscriptions API for plan management, including a 7-day free trial.
- **Admin Panel**: Five-tab interface for user, subscription, system, and alert management, including complimentary access and proactive self-diagnosis.
- **Performance**: API rate limiting, response compression, in-memory caching for expensive endpoints, optimized DB connection pool.
- **Security**: Comprehensive penetration-test-hardened security: HTTP security headers (X-Frame-Options: DENY, X-Content-Type-Options, HSTS 2yr preload, CSP with object-src/base-uri/form-action/frame-ancestors/upgrade-insecure-requests, Cross-Origin-Opener/Resource/Embedder-Policy, X-Permitted-Cross-Domain-Policies); passwords hashed with bcrypt (cost factor 12); intrusion detection middleware (DDoS >300 req/min auto-block, 25+ SQL/XSS/SSTI/path-traversal injection patterns, brute force auth tracking >10 fails = IP block, directory scanning detection, hacking tool UA blocking for sqlmap/nikto/nmap/burpsuite/etc., sensitive path probing blocked for .env/.git/wp-admin/phpmyadmin/etc., null byte & CRLF injection detection, 10-min auto-unblock); CSRF double-submit cookie on all mutating API requests; tiered rate limiting (10 login/15min, 5 register/hr, 5 password reset/15min, 10/min on sensitive endpoints, 30/min AI, 200/min global); HTTP method restriction (only GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS); all 500 error responses sanitized (no internal details leaked to clients); API keys sent via headers not URL params; x-powered-by disabled; JSON body limit 5MB; sandboxed iframes in code studio; conversation ownership enforcement (IDOR protection); session secret requires SESSION_SECRET env var in production.
- **Content Moderation**: Automatic profanity/threat detection with user suspension and admin notifications.
- **Crisis Support Bot**: Dedicated, private, AES-256-GCM encrypted AI for mental health support, exempt from moderation.
- **Media Studio**: Enterprise-exclusive video and photo editor with filters, text overlays, and AI-powered suggestions.
- **AI Scanner**: Free feature to read, transcribe, and summarize images using Gemini vision.
- **AI Video Generation**: Research/Enterprise feature powered by Google Veo 3.1, supporting video generation from text prompts.
- **Code Studio**: An in-browser IDE add-on powered by Claude Opus 4, with complexity-based pricing (micro 10¢ to advanced $3), Monaco editor, multi-file support, **Long Build Mode** (1/3/6/9 hour collaborative sessions with 10 AI agents — Scout, Architect, Builder, Stylist, Engineer, DataBot, Debugger, Optimizer, Guardian, Deployer), auto-buy credit refill, and **Secrets Manager** (Replit-style per-project API key/secret storage with encrypted values). Tables: `code_projects`, `code_project_secrets`.
- **Enterprise Workgroups**: Team collaboration system (Research/Enterprise tier) with group chat, private DMs, member management (invite/kick/block/restrict/promote), approval queues, AI-powered conversation summaries (Gemini 2.0 Flash), and admin controls. Tables: workgroups, workgroup_members, workgroup_invites, workgroup_messages, workgroup_approvals. Frontend: `/workgroups` page. Invite tokens use crypto.randomBytes; join validates invited email matches authenticated user.
- **AI Debate Arena**: Interactive feature where two AI models debate any user-chosen topic. Users select models (Gemini, Claude, GPT-4o, DeepSeek), set rounds (1-5), moderate with interjections, and vote on winners. Tables: `debate_sessions`, `debate_messages`. Frontend: `/debate`.
- **Collaborative AI Rooms**: Real-time multiplayer rooms where multiple users chat together with AI. Room creation with shareable 6-char codes, member management, 3-second polling for updates, `@ai` prefix triggers AI responses. Tables: `collab_rooms`, `collab_room_members`, `collab_room_messages`. Frontend: `/collab`.
- **AI Fact-Check Chain**: Independent AI verification of any chat response. Click "Fact Check" on any AI message to send it to a second model for claim-by-claim analysis with confidence scores, verdicts (VERIFIED/PARTIALLY_VERIFIED/UNVERIFIED/MIXED), and detailed explanations. Table: `fact_checks`. Integrated into chat UI.
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
- **Twilio**: SMS verification for registration
- **Gemini Grounded Search**: Real-time web search for current events queries