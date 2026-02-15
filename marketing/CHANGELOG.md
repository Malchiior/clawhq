# ClawHQ Changelog

---

## v1.0.0 — Launch Release 🚀
*February 2026*

ClawHQ is live. Deploy AI agents in 30 seconds — no coding, no DevOps, no complexity.

### ✨ Core Platform

- **One-click agent deployment** — Create and deploy an AI agent in under 30 seconds via the web dashboard
- **Multi-model support** — Claude (Anthropic), GPT-4 (OpenAI), Gemini (Google), DeepSeek, and Grok (xAI)
- **Model hot-swapping** — Switch between AI models with one click, no redeployment required
- **BYOK (Bring Your Own Key)** — Use your own API keys from any supported provider
- **System prompt editor** — Configure agent personality, instructions, and behavior in plain English
- **Persistent memory** — Agents remember conversation context across sessions and restarts

### 📱 Channel Integrations

- **Telegram** — Full bot integration via BotFather token
- **WhatsApp** — WhatsApp Business API support
- **Discord** — Bot deployment with server permissions management
- **Slack** — OAuth-based workspace connection
- **iMessage** — Connect via Apple device relay
- **Multi-channel** — Single agent can serve multiple channels simultaneously with shared memory

### 📊 Dashboard & Monitoring

- **Real-time agent status** — Live health indicators (Running / Stopped / Error)
- **Automated health checks** — Continuous monitoring with auto-restart on failure
- **Conversation logs** — Full message history for every agent interaction
- **Usage analytics** — Daily message volume, response times, model token consumption
- **Start / Stop / Restart controls** — One-click agent lifecycle management

### 🎨 White-Label (Business Tier)

- **Custom branding** — Your logo, colors, and brand identity
- **Custom domains** — Serve the platform from your own domain
- **Remove ClawHQ branding** — No "Powered by" badges anywhere
- **Client-facing dashboard** — Clean interface for your end clients

### 🔐 Security & Authentication

- **Email + password registration** with email verification
- **Google OAuth** — One-click social login
- **JWT authentication** with refresh token rotation
- **Encrypted API key storage** — All user API keys encrypted at rest
- **Container isolation** — Each agent runs in its own Docker container
- **CORS protection** — Strict origin whitelisting
- **Security headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, CSP
- **Session management** — Automatic cleanup of expired sessions

### 💳 Billing & Pricing

- **Free tier** — 1 agent, 100 messages/day, all models, no credit card required
- **Pro tier ($19/mo)** — 3 agents, 5,000 messages/day, all channels, analytics
- **Business tier ($49/mo)** — 10 agents, 25,000 messages/day, white-label, SSO, priority support
- **Stripe integration** — Secure payment processing with subscription management
- **Founding Member pricing** — Early adopters get locked-in discounts forever

### 🏗️ Infrastructure

- **Frontend** — React + TypeScript, deployed on Vercel
- **Backend** — Node.js + Express + Prisma, deployed on Railway
- **Database** — Neon PostgreSQL with connection pooling
- **Email** — Transactional email via Resend (verification, password reset)
- **Analytics** — PostHog product analytics integration
- **Beta mode** — Invite-only access with beta code system

### 📄 Documentation & Legal

- **Documentation site** — Getting started guides, API reference, channel setup tutorials
- **Terms of Service** — Published at clawhq.dev/terms
- **Privacy Policy** — Published at clawhq.dev/privacy
- **Security audit** — All critical and high-severity issues resolved pre-launch

---

### What's Next (Roadmap)

- 📦 **Bundled API mode** — Use AI models without your own API key (pay-per-message)
- 🔌 **Webhook integrations** — Connect agents to Zapier, Make, n8n
- 📈 **Advanced analytics** — Sentiment analysis, conversation funnels, custom reports
- 🌍 **Multi-language** — Dashboard localization and multi-language agent support
- 🤖 **Agent marketplace** — Share and discover pre-built agent templates
- 📱 **Mobile app** — Manage your agents from iOS and Android
- 🔗 **API access** — Programmatic agent management for developers

---

*Follow our journey: [clawhq.dev](https://clawhq.dev) | [Twitter](https://twitter.com/clawhq) | [Discord](https://discord.gg/clawhq)*
