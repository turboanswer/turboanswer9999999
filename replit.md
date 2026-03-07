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
- **Multi-Model AI System**: 4 tiers - Free (Gemini 2.5 Flash), Pro ($6.99/mo - Gemini Pro), Research ($30/mo - Antigravity + Gemini 3.1 Pro + AI Video Studio), Enterprise ($100/mo - Research access + shareable 6-digit code for up to 5 team members, 44% savings vs individual Research plans). All Gemini-powered with automatic fallback on rate limits. Research tier includes Pro access. Enterprise includes Research access. Custom team plans available via support@turboanswer.it.com for teams larger than 5.
- **Smart Model Routing**: Complexity classifier in `server/services/multi-ai.ts` routes Research/Enterprise queries: simple queries (short, factual, greetings, <220 chars without technical signals) → Gemini Flash Lite (2000 tokens, temp 0.4); complex queries (code blocks, technical keywords like implement/algorithm/architecture/optimize/debug, multi-step, >220 chars) → Gemini 3.1 Pro (8192 tokens, temp 0.1). Free/Pro tiers always use Flash Lite. This saves cost without degrading quality since Flash handles simple questions equally well.
- **Voice Command Features**: Speech recognition (Web Speech API), "Turbo" assistant name, optional "Hey Turbo" wake word, auto-send, text-to-speech, and visual feedback.
- **Comprehensive Knowledge Coverage**: Expert-level knowledge in technical, scientific, creative, business, and general domains, including real-time weather and world time zone intelligence.
- **Subscription Management**: PayPal Subscriptions API integration for Pro ($6.99/month), Research ($30/month), and Enterprise ($100/month) plans. All paid plans include a 7-day free trial (no charge on signup day). Payment popups trigger from model selector. Uses PayPal REST API with auto-created billing plans. Plans auto-recreate with trial period on startup if missing. Plans auto-recreate on server restart with correct prices. Current prices: Pro $6.99, Research $30, Enterprise $100. Plan IDs regenerate automatically when prices change. Enterprise subscribers get a secure 6-digit numeric code saved to their account (persists across sessions) to share with up to 5 team members for Research access. Custom pricing available for larger teams via support email.
- **Account Management**: Delete account functionality in AI settings with PayPal auto-cancellation and complete data removal.
- **Customer Support**: Email (support@turboanswer.it.com), Phone (866-467-7269), Hours: Mon-Fri 9:30am-6pm EST.
- **Employee Management API**: Endpoints for user management (ban, flag, suspend) and audit logging.
- **Admin Panel**: Five-tab interface (Overview, Users, Subscriptions, System & Debug, Alerts). Subscription management with modify/cancel/grant-complimentary (with duration: 1-4 months or forever). System health monitoring for DB/PayPal/AI. Diagnostics with auto-fix. Outage detection with rate-limited notifications. Complimentary access auto-expires when duration lapses. Proactive self-diagnosis runs every 5 minutes checking all services and auto-fixing issues.
- **Performance & Scalability**: API rate limiting (200 req/min general, 30/15min auth, 30/min AI), response compression (gzip), in-memory response caching (15s TTL) for expensive admin endpoints, optimized DB connection pool (max 20 connections, connection reuse), widget session limits (10K max sessions with TTL eviction), graceful shutdown with proper resource cleanup.
- **Content Moderation System**: Automatic profanity/threat detection on user messages. Flagged users are auto-suspended with admin notifications sent to the admin panel showing full user details, flagged content, and action taken.
- **Crisis Support Bot**: Dedicated AI companion for mental health crisis support with AES-256-GCM encrypted conversations. Fully private - exempt from content moderation, no admin access, no data shared with authorities. Includes crisis hotline resources (988, Crisis Text Line). Users can delete all crisis data permanently. Specialized Gemini-powered AI with safety settings disabled for sensitive topic support.
- **AI Image Generation (Legacy)**: Original DALL-E 3 Image Studio still accessible at `/image-studio`.
- **Media Studio** (`/media-editor`): Enterprise-exclusive CapCut-style video and photo editor. Left panel: media library with drag-and-drop upload (photos and videos). Center: canvas preview (1280×720) with real-time filter rendering via Canvas 2D API. Right panel: three tabs — (1) Filters: 10 presets (Normal, Vivid, Cinematic, Vintage, B&W, Cool, Warm, Fade, Drama, Neon) plus manual sliders for brightness/contrast/saturation/hue/blur/sepia; (2) Text: add text overlays with position/size/color/bold/shadow controls; (3) AI: Gemini analyzes current frame and returns caption suggestions, style recommendations, and auto-filter values. Bottom timeline strip shows all uploaded clips. Video support includes trim controls and MediaRecorder export (WebM). Photo export as PNG via canvas.toDataURL(). Backend route: `POST /api/media/ai-suggest`.
- **Photo Editor** (`/photo-editor`): Research+ (Research and Enterprise) AI photo studio powered by gpt-image-1. Three modes: (1) Generate — text-to-image with aspect ratio control and style presets; (2) Edit — upload any photo and describe changes (remove people, swap backgrounds, add objects); (3) Place Me — upload a selfie and describe a scene, AI composites you there realistically. Backend routes: `POST /api/photo-editor/generate` and `POST /api/photo-editor/edit` (both use gpt-image-1 via Replit integration).
- **AI Video Generation (Video Studio)**: Full Video Studio at `/video-studio` powered by Google Veo 3.1. Backend tries `veo-3.1-generate-preview` then `veo-3.1-fast-generate-preview` via `predictLongRunning` API + polling. Audio is always generated automatically by Veo 3.1 — users describe sounds/music in their prompt text (no separate audio toggle). Supports 16:9 and 9:16 aspect ratios, 5 or 8 second durations, style presets, and prompt ideas. Videos stored server-side, served via `/api/video/file/:fileId` streaming endpoint. Requires Research/Enterprise tier.
- **Code Studio** (`/code-studio`): Full in-browser IDE — **$10/month add-on**, available to any subscription tier. Supports promo code entry on the paywall — 100% off codes activate access for free (no PayPal). Backend route: `POST /api/apply-code-studio-promo`. Owner lifetime code seeded on startup: `TURBOCODE-FOREVER`. Monaco editor (VS Code engine) with multi-file support, file tabs, syntax highlighting for 8+ languages. Live preview iframe for HTML/CSS/JS apps with auto-refresh. Code execution for Python, JavaScript, TypeScript, Java, C++, Rust, Go, etc. via Piston API (free, no key needed). Gemini 3.1 Pro AI sidebar for generating, debugging, and explaining code. Save projects to PostgreSQL DB. Deploy to a public shareable URL at `/p/:slug`. Custom domain field with DNS setup instructions. Accessible from chat header via "Code" button. Backend gate: all `/api/code/*` routes require `codeStudioAddon === true`. PayPal add-on plan: "Turbo Answer Code Studio" $10/mo (no trial). Routes: `POST /api/create-addon-subscription`, `POST /api/confirm-addon-subscription`, `POST /api/cancel-addon`. Users can cancel via AI settings. Schema: `codeStudioAddon` (boolean), `codeStudioAddonSubId` (text) on users table.
- **Embeddable AI Widget System**: A universal JavaScript widget (`turbo-answer-widget.js`) for seamless integration into any website.
- **Promo Code System**: Database-driven promo codes (`promo_codes` table) with full admin management. Each code has: product (code_studio/pro/research/enterprise/all), discount % (100 = free), max uses, expiry date, active toggle, and description. Admin manages via the "Promo Codes" tab in admin panel. 100% off Code Studio codes skip PayPal and directly activate `codeStudioAddon=true`. Promo-activated accounts have `codeStudioAddonSubId='promo_<CODE>'` and are excluded from PayPal cancellation. CRUD endpoints: `GET/POST /api/admin/promo-codes`, `PATCH/DELETE /api/admin/promo-codes/:id`. Apply endpoint: `POST /api/apply-code-studio-promo`.
- **Beta Testing Program**: Public 10-question application form at `/beta` and as a section on the landing page. Admin can approve/deny applications with automatic email (Brevo). Approved users get `isBetaTester = true` on their account. Beta testers see a green flask button in the chat header to submit categorized feedback (bugs, features, UI, performance). Admin panel has a dedicated "Beta Testing" tab showing all applications (pending/reviewed) and all feedback notes, plus email template modal for sending approval/denial emails with optional denial reason.

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
- **Brevo**: Transactional email delivery service (replaced Resend for full email sending). Uses BREVO_API_KEY secret via REST API.