import { motion } from 'framer-motion'
import { BookOpen, Rocket, Bot, Radio, Key, Search, ChevronRight, ChevronDown, Terminal, Copy, Check, MessageSquare, HelpCircle, Zap, Shield } from 'lucide-react'
import { useState, useMemo } from 'react'

/* ── Types ── */
interface Article {
  title: string
  slug: string
  content: string
}

interface DocSection {
  icon: React.ElementType
  title: string
  desc: string
  articles: Article[]
}

/* ── Documentation Content ── */
const sections: DocSection[] = [
  {
    icon: Rocket,
    title: 'Getting Started',
    desc: 'Deploy your first AI agent in under 30 seconds',
    articles: [
      {
        title: 'Create Your Account',
        slug: 'create-account',
        content: `## Create Your Account

Sign up for ClawHQ to start deploying AI agents instantly.

### Steps

1. **Visit** [clawhq.dev](https://clawhq.dev) and click **Get Started**
2. **Sign up** with Google OAuth or email/password
3. **Verify your email** — check your inbox for the confirmation link
4. **Choose your plan** — start with Free (1 agent, 100 msgs/day) or go Pro

### Free Tier Includes
- 1 AI agent
- 1 messaging channel
- 100 messages per day
- Community support
- All AI models available

> **Tip:** You can upgrade anytime from the Billing page without losing your agent configuration.`,
      },
      {
        title: 'Deploy Your First Agent',
        slug: 'deploy-first-agent',
        content: `## Deploy Your First Agent

Get an AI agent running in three clicks.

### Quick Deploy

1. Go to **Agents → New Agent**
2. Give your agent a name (e.g., "Customer Support Bot")
3. Choose your AI model:
   - **Claude** — Best for nuanced conversations
   - **GPT-4** — Great all-rounder
   - **DeepSeek** — Cost-effective for high volume
   - **Gemini** — Strong multimodal support
   - **Grok** — Fast and opinionated
4. Write a system prompt describing your agent's behavior
5. Click **Deploy** — your agent is live!

### System Prompt Tips

\`\`\`
You are a customer support agent for [Company].
- Be helpful, concise, and friendly
- If you don't know something, say so honestly
- Escalate billing issues to a human
\`\`\`

> **Best Practice:** Be specific about what your agent should and shouldn't do. Constraints are just as important as capabilities.`,
      },
      {
        title: 'Connect a Channel',
        slug: 'connect-channel',
        content: `## Connect a Messaging Channel

Your agent needs a channel to talk through. ClawHQ supports all major platforms.

### Supported Channels

| Channel | Status | Setup Time |
|---------|--------|-----------|
| Telegram | ✅ Ready | ~2 minutes |
| WhatsApp | ✅ Ready | ~5 minutes |
| Discord | ✅ Ready | ~3 minutes |
| Slack | 🔜 Coming Soon | — |
| iMessage | 🔜 Coming Soon | — |

### Quick Setup

1. Go to **Channels** in your dashboard
2. Click the channel you want to connect
3. Follow the guided setup wizard
4. Send a test message — if your agent replies, you're done!

See the **Channels** section below for detailed setup guides per platform.`,
      },
      {
        title: 'Send Your First Message',
        slug: 'first-message',
        content: `## Send Your First Message

Once your agent is deployed and a channel is connected, test it out.

### Testing Checklist

1. Open your connected channel (e.g., Telegram)
2. Send a message to your bot
3. Wait for the response (usually 1-3 seconds)
4. Check the **Dashboard** — you should see the message in your agent's logs

### Troubleshooting

- **No response?** Check that your agent is in "Running" status on the Agents page
- **Slow response?** The first message after idle may take a few extra seconds (cold start)
- **Wrong response?** Review and refine your system prompt
- **Error in logs?** Check the Health Monitor for details

> **Pro Tip:** Use the agent dashboard's real-time log view to watch messages flow in and debug issues live.`,
      },
    ],
  },
  {
    icon: Bot,
    title: 'Agents',
    desc: 'Configure, manage, and optimize your AI agents',
    articles: [
      {
        title: 'Agent Configuration',
        slug: 'agent-config',
        content: `## Agent Configuration

Every agent has a configuration that controls its behavior, model, and resource limits.

### Core Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Name** | Display name for your agent | Required |
| **Model** | AI model to use | Claude Sonnet |
| **System Prompt** | Instructions for agent behavior | Required |
| **Temperature** | Creativity (0 = deterministic, 1 = creative) | 0.7 |
| **Max Tokens** | Maximum response length | 4096 |

### Advanced Settings

- **Memory Persistence** — Enable to let your agent remember past conversations across restarts
- **Health Monitoring** — Automatic restart if your agent crashes or becomes unresponsive
- **Container Resources** — CPU and RAM allocated to your agent's container

### Updating Configuration

Changes to your agent's config take effect immediately — no restart required. The agent picks up new settings on the next message.`,
      },
      {
        title: 'System Prompts Best Practices',
        slug: 'system-prompts',
        content: `## System Prompts Best Practices

Your system prompt is the most important part of your agent. Here's how to write great ones.

### Structure

A good system prompt has four parts:

1. **Identity** — Who is this agent?
2. **Behavior** — How should it act?
3. **Knowledge** — What does it know?
4. **Boundaries** — What should it NOT do?

### Example: E-commerce Support Bot

\`\`\`
You are ShopHelper, a friendly customer support agent for TechStore.

BEHAVIOR:
- Be warm and helpful, but concise
- Always confirm the customer's issue before suggesting solutions
- Use simple language, avoid jargon

KNOWLEDGE:
- Return policy: 30 days, receipt required
- Shipping: Free over $50, otherwise $4.99
- Hours: Mon-Fri 9am-6pm EST

BOUNDARIES:
- Never process refunds — escalate to human support
- Never share internal pricing or cost information
- If asked about competitors, stay neutral
\`\`\`

### Common Mistakes

❌ **Too vague:** "Be helpful" — every agent should be helpful, this adds nothing
❌ **Too long:** 5000-word prompts confuse the model and waste tokens
❌ **No boundaries:** Without limits, agents will try to do everything (and fail)
✅ **Specific + concise:** Clear identity, concrete rules, explicit limits`,
      },
      {
        title: 'Model Selection Guide',
        slug: 'model-guide',
        content: `## Model Selection Guide

Choosing the right model depends on your use case, budget, and quality requirements.

### Model Comparison

| Model | Best For | Speed | Cost | Quality |
|-------|---------|-------|------|---------|
| **Claude Opus** | Complex reasoning, nuance | ⚡⚡ | 💰💰💰 | ⭐⭐⭐⭐⭐ |
| **Claude Sonnet** | Balanced performance | ⚡⚡⚡ | 💰💰 | ⭐⭐⭐⭐ |
| **GPT-4o** | General purpose | ⚡⚡⚡ | 💰💰 | ⭐⭐⭐⭐ |
| **GPT-4o Mini** | High volume, simple tasks | ⚡⚡⚡⚡ | 💰 | ⭐⭐⭐ |
| **DeepSeek** | Cost-effective reasoning | ⚡⚡⚡ | 💰 | ⭐⭐⭐⭐ |
| **Gemini Pro** | Multimodal (text + images) | ⚡⚡⚡ | 💰💰 | ⭐⭐⭐⭐ |
| **Grok** | Real-time info, fast replies | ⚡⚡⚡⚡ | 💰💰 | ⭐⭐⭐ |

### Recommendations by Use Case

- **Customer support:** Claude Sonnet or GPT-4o — reliable and empathetic
- **Technical assistant:** Claude Opus — best reasoning for code and complex tasks
- **FAQ bot:** GPT-4o Mini or DeepSeek — fast and cheap for simple Q&A
- **Content creation:** Claude Opus or GPT-4o — highest quality output
- **High-volume chat:** DeepSeek — best cost-to-quality ratio

### BYOK vs Bundled API

- **BYOK (Bring Your Own Key):** Use your own API key. Full control, your own billing.
- **Bundled API:** We handle everything. One bill, no key management. Slightly higher per-token cost but zero hassle.`,
      },
      {
        title: 'Container Management',
        slug: 'containers',
        content: `## Container Management

Each agent runs in an isolated Docker container for security and reliability.

### How It Works

When you deploy an agent, ClawHQ:
1. Provisions a Docker container with OpenClaw pre-installed
2. Injects your configuration (model, prompt, channels)
3. Starts the agent and begins health monitoring
4. Auto-restarts if the agent crashes

### Container Lifecycle

- **Creating** → Container is being provisioned
- **Running** → Agent is live and processing messages
- **Stopped** → Agent is paused (no messages processed, no charges)
- **Error** → Something went wrong — check logs

### Resource Limits

| Plan | CPU | RAM | Storage |
|------|-----|-----|---------|
| Free | 0.25 vCPU | 256 MB | 1 GB |
| Pro | 0.5 vCPU | 512 MB | 5 GB |
| Business | 1 vCPU | 1 GB | 10 GB |
| Enterprise | Custom | Custom | Custom |

### Viewing Logs

Go to **Agents → [Your Agent] → Logs** to see real-time container output. Logs include:
- Incoming/outgoing messages
- Errors and warnings
- Health check results
- Resource usage`,
      },
    ],
  },
  {
    icon: Radio,
    title: 'Channels',
    desc: 'Step-by-step guides for connecting messaging platforms',
    articles: [
      {
        title: 'Telegram Setup',
        slug: 'telegram-setup',
        content: `## Telegram Setup

Connect your agent to Telegram in about 2 minutes.

### Prerequisites
- A Telegram account
- Access to [@BotFather](https://t.me/BotFather) on Telegram

### Step-by-Step

1. **Create a Telegram Bot**
   - Open Telegram and message \`@BotFather\`
   - Send \`/newbot\`
   - Choose a display name (e.g., "My Support Bot")
   - Choose a username ending in \`bot\` (e.g., \`mysupportbot_bot\`)
   - BotFather gives you an API token — copy it

2. **Connect in ClawHQ**
   - Go to **Channels → Telegram**
   - Paste your bot token
   - Click **Connect**
   - ClawHQ sets the webhook automatically

3. **Test It**
   - Open your bot in Telegram
   - Send a message
   - Your agent should reply within seconds!

### Group Chat Support

To use your bot in groups:
1. Message \`@BotFather\`: \`/setjoingroups\` → Enable
2. Add your bot to a group
3. The bot responds when mentioned or to all messages (configurable)

> **Security:** Never share your bot token. If compromised, use \`/revoke\` with BotFather to generate a new one.`,
      },
      {
        title: 'WhatsApp Business API',
        slug: 'whatsapp-setup',
        content: `## WhatsApp Business API Setup

Connect your agent to WhatsApp Business for professional customer communication.

### Prerequisites
- A Meta Business account
- A phone number not already registered with WhatsApp
- Meta Business verification (may take 1-3 days)

### Step-by-Step

1. **Create a Meta App**
   - Go to [developers.facebook.com](https://developers.facebook.com)
   - Create a new app → Select "Business" type
   - Add the **WhatsApp** product

2. **Configure WhatsApp**
   - In your Meta app dashboard, go to WhatsApp → Getting Started
   - Note your **Phone Number ID** and **Access Token**
   - Add a test phone number (for development)

3. **Connect in ClawHQ**
   - Go to **Channels → WhatsApp**
   - Enter your Phone Number ID and Access Token
   - ClawHQ generates a webhook URL — copy it
   - Paste the webhook URL in your Meta app's WhatsApp webhook config
   - Subscribe to the \`messages\` webhook field

4. **Verify & Test**
   - Send a WhatsApp message to your business number
   - Your agent should respond!

### Message Templates

WhatsApp requires pre-approved templates for outbound messages. Your agent can reply freely to incoming messages, but proactive outreach needs templates approved by Meta.`,
      },
      {
        title: 'Discord Bot Integration',
        slug: 'discord-setup',
        content: `## Discord Bot Integration

Add your AI agent to any Discord server.

### Prerequisites
- A Discord account
- Admin access to a Discord server

### Step-by-Step

1. **Create a Discord Application**
   - Go to [discord.com/developers](https://discord.com/developers/applications)
   - Click **New Application** and name it
   - Go to **Bot** → **Add Bot**
   - Copy the bot **Token**
   - Enable **Message Content Intent** under Privileged Intents

2. **Invite the Bot**
   - Go to **OAuth2 → URL Generator**
   - Select scopes: \`bot\`, \`applications.commands\`
   - Select permissions: \`Send Messages\`, \`Read Message History\`, \`Embed Links\`
   - Copy the generated URL and open it in your browser
   - Select your server and authorize

3. **Connect in ClawHQ**
   - Go to **Channels → Discord**
   - Paste your bot token
   - Optionally set a channel filter (respond only in specific channels)
   - Click **Connect**

4. **Test It**
   - Go to your Discord server
   - Mention your bot or send a message in the configured channel
   - Your agent replies!

### Tips
- Use channel filters to limit your bot to support channels only
- The bot can handle multiple servers simultaneously
- Slash commands support coming soon`,
      },
      {
        title: 'Slack App Setup',
        slug: 'slack-setup',
        content: `## Slack App Setup

> 🔜 **Coming Soon** — Slack integration is currently in development.

### What to Expect

- Create a Slack App in your workspace
- Connect via OAuth with ClawHQ
- Your agent responds in DMs and channels
- Thread-aware conversations
- Slash command support

### Join the Waitlist

Be the first to know when Slack support launches. Contact us at support@clawhq.dev or join our [Discord community](https://discord.com/invite/clawd).`,
      },
    ],
  },
  {
    icon: Key,
    title: 'API Reference',
    desc: 'REST API documentation for developers',
    articles: [
      {
        title: 'Authentication',
        slug: 'api-auth',
        content: `## API Authentication

All API requests require authentication via Bearer token.

### Getting Your API Key

1. Go to **Settings → API Keys**
2. Click **Create New Key**
3. Name your key (e.g., "Production", "Development")
4. Copy the key immediately — it won't be shown again

### Using Your Key

Include it in the \`Authorization\` header:

\`\`\`bash
curl -X GET https://api.clawhq.dev/v1/agents \\
  -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

### Key Security

- **Rotate regularly** — create new keys and delete old ones
- **Use separate keys** for production vs development
- **Never commit keys** to version control
- **Set IP allowlists** (Business plan) for additional security

### Rate Limits

| Plan | Requests/min | Requests/day |
|------|-------------|-------------|
| Free | 60 | 1,000 |
| Pro | 300 | 50,000 |
| Business | 1,000 | 500,000 |
| Enterprise | Custom | Custom |

Rate limit headers are included in every response:
\`\`\`
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1707868800
\`\`\``,
      },
      {
        title: 'Agents Endpoint',
        slug: 'api-agents',
        content: `## Agents API

Manage your AI agents programmatically.

### List Agents

\`\`\`bash
GET /v1/agents
\`\`\`

**Response:**
\`\`\`json
{
  "agents": [
    {
      "id": "agent_abc123",
      "name": "Support Bot",
      "model": "claude-sonnet",
      "status": "running",
      "messagesTotal": 1520,
      "createdAt": "2026-02-13T10:00:00Z"
    }
  ]
}
\`\`\`

### Create Agent

\`\`\`bash
POST /v1/agents
Content-Type: application/json

{
  "name": "Sales Assistant",
  "model": "gpt-4o",
  "systemPrompt": "You are a helpful sales assistant...",
  "temperature": 0.7
}
\`\`\`

### Update Agent

\`\`\`bash
PATCH /v1/agents/:id

{
  "systemPrompt": "Updated prompt...",
  "temperature": 0.5
}
\`\`\`

### Delete Agent

\`\`\`bash
DELETE /v1/agents/:id
\`\`\`

### Start / Stop / Restart

\`\`\`bash
POST /v1/agents/:id/start
POST /v1/agents/:id/stop
POST /v1/agents/:id/restart
\`\`\``,
      },
      {
        title: 'Channels Endpoint',
        slug: 'api-channels',
        content: `## Channels API

Connect and manage messaging channels for your agents.

### List Channels

\`\`\`bash
GET /v1/agents/:agentId/channels
\`\`\`

**Response:**
\`\`\`json
{
  "channels": [
    {
      "id": "ch_abc123",
      "type": "telegram",
      "status": "connected",
      "messagesTotal": 843,
      "connectedAt": "2026-02-13T10:00:00Z"
    }
  ]
}
\`\`\`

### Connect Channel

\`\`\`bash
POST /v1/agents/:agentId/channels

{
  "type": "telegram",
  "config": {
    "botToken": "123456:ABC-DEF..."
  }
}
\`\`\`

### Disconnect Channel

\`\`\`bash
DELETE /v1/agents/:agentId/channels/:channelId
\`\`\`

### Supported Channel Types

| Type | Config Required |
|------|----------------|
| \`telegram\` | \`botToken\` |
| \`whatsapp\` | \`phoneNumberId\`, \`accessToken\` |
| \`discord\` | \`botToken\`, \`channelFilter\` (optional) |`,
      },
      {
        title: 'Webhooks',
        slug: 'api-webhooks',
        content: `## Webhooks

Receive real-time notifications when events happen in your agents.

### Setting Up Webhooks

\`\`\`bash
POST /v1/webhooks

{
  "url": "https://yourapp.com/webhook",
  "events": ["message.received", "message.sent", "agent.error", "agent.status_changed"],
  "secret": "your-webhook-secret"
}
\`\`\`

### Event Types

| Event | Description |
|-------|-------------|
| \`message.received\` | New incoming message to an agent |
| \`message.sent\` | Agent sent a response |
| \`agent.error\` | Agent encountered an error |
| \`agent.status_changed\` | Agent started, stopped, or crashed |
| \`billing.limit_reached\` | Daily message limit hit |

### Webhook Payload

\`\`\`json
{
  "event": "message.received",
  "timestamp": "2026-02-13T15:30:00Z",
  "data": {
    "agentId": "agent_abc123",
    "channelType": "telegram",
    "message": {
      "from": "user_123",
      "text": "Hello!",
      "timestamp": "2026-02-13T15:30:00Z"
    }
  }
}
\`\`\`

### Verifying Webhooks

Each webhook includes an \`X-ClawHQ-Signature\` header — an HMAC-SHA256 of the payload using your secret. Always verify this in production.`,
      },
    ],
  },
  {
    icon: Zap,
    title: 'Features',
    desc: 'Deep dives into ClawHQ capabilities',
    articles: [
      {
        title: 'BYOK Mode',
        slug: 'byok',
        content: `## Bring Your Own Key (BYOK)

Use your own API keys for full control over costs and rate limits.

### How It Works

1. Go to **Settings → API Keys** on your agent
2. Select **BYOK Mode**
3. Enter your API key for the model provider:
   - **Anthropic** (Claude): Get key from [console.anthropic.com](https://console.anthropic.com)
   - **OpenAI** (GPT): Get key from [platform.openai.com](https://platform.openai.com)
   - **Google** (Gemini): Get key from [aistudio.google.com](https://aistudio.google.com)
   - **DeepSeek**: Get key from [platform.deepseek.com](https://platform.deepseek.com)
4. Your key is encrypted at rest and never logged

### BYOK vs Bundled

| Feature | BYOK | Bundled |
|---------|------|---------|
| Billing | Direct with provider | One ClawHQ bill |
| Rate limits | Your own | Shared pool |
| Key management | You manage | We handle it |
| Cost | Provider pricing | Small markup |
| Setup | Manual | Automatic |

> **Tip:** Start with Bundled for simplicity, switch to BYOK when you need fine-grained cost control.`,
      },
      {
        title: 'Memory Persistence',
        slug: 'memory',
        content: `## Agent Memory Persistence

Let your agents remember context across conversations and restarts.

### How Memory Works

ClawHQ agents use a file-based memory system:
- **Short-term:** Conversation context within a session
- **Long-term:** Persistent files that survive restarts

When memory persistence is enabled, your agent's workspace files are saved to encrypted storage and restored on restart.

### Enabling Memory

1. Go to **Agents → [Your Agent] → Settings**
2. Toggle **Memory Persistence** on
3. Your agent can now write to files that persist

### Use Cases

- **Customer context:** Remember past interactions with returning customers
- **Knowledge base:** Accumulate learnings over time
- **Task tracking:** Maintain to-do lists and project state
- **Preferences:** Remember user preferences and settings

### Storage Limits

| Plan | Memory Storage |
|------|---------------|
| Free | 10 MB |
| Pro | 100 MB |
| Business | 1 GB |
| Enterprise | Custom |`,
      },
      {
        title: 'Health Monitoring',
        slug: 'health-monitoring',
        content: `## Health Monitoring

ClawHQ automatically monitors your agents and restarts them if they become unresponsive.

### How It Works

Every 30 seconds, ClawHQ:
1. Pings your agent's health endpoint
2. Checks CPU and memory usage
3. Verifies the messaging channel is connected
4. Logs the result to your dashboard

### Failure Recovery

If an agent fails a health check:
- **1st failure:** Logged, no action (could be transient)
- **2nd consecutive failure:** Warning alert
- **3rd consecutive failure:** Automatic restart
- **5 restarts in 1 hour:** Agent paused, owner notified

### Dashboard

The Health Monitor shows:
- Uptime percentage (last 24h / 7d / 30d)
- Response time trends
- Memory and CPU usage graphs
- Incident history with timestamps

### Notifications

Configure alerts via:
- Email (all plans)
- Telegram/Discord/Slack (Pro+)
- Webhook (Business+)`,
      },
    ],
  },
  {
    icon: HelpCircle,
    title: 'FAQ',
    desc: 'Frequently asked questions',
    articles: [
      {
        title: 'General FAQ',
        slug: 'faq-general',
        content: `## Frequently Asked Questions

### What is ClawHQ?
ClawHQ is a platform for deploying AI agents that connect to messaging channels like Telegram, WhatsApp, and Discord. Deploy an agent in 30 seconds, no coding required.

### How is ClawHQ different from ChatGPT or Claude?
ChatGPT and Claude are AI models. ClawHQ deploys those models as always-on agents connected to your messaging channels. Think of it as "AI agents as a service."

### Do I need coding experience?
No. ClawHQ is designed for non-technical users. Click, configure, deploy. If you CAN code, our API gives you full programmatic control.

### What AI models are available?
Claude (Anthropic), GPT-4o (OpenAI), Gemini (Google), DeepSeek, and Grok. We add new models as they become available.

### Can I switch models after deploying?
Yes. Change your agent's model anytime from the dashboard. The switch takes effect on the next message.

### Is my data secure?
Yes. Each agent runs in an isolated Docker container. Your data is encrypted at rest and in transit. We never train on your data or share it with model providers beyond what's needed for inference.

### What happens if I hit my message limit?
Your agent stops responding until the next day (limits reset at midnight UTC). Upgrade your plan for higher limits, or switch to BYOK mode for unlimited messages.

### Can I use ClawHQ for my business?
Absolutely. Our Business and Enterprise plans include white-label branding, custom domains, team management, and SLA guarantees.

### How do I get support?
- **Free:** Community Discord
- **Pro:** Email support (24h response)
- **Business:** Priority email (4h response)
- **Enterprise:** Dedicated support + Slack channel`,
      },
      {
        title: 'Billing FAQ',
        slug: 'faq-billing',
        content: `## Billing FAQ

### How does billing work?
ClawHQ uses a subscription model. Choose Free, Pro ($19/mo), Business ($49/mo), or Enterprise (custom). All plans include a set number of messages per day.

### Can I cancel anytime?
Yes. No contracts, no cancellation fees. Your agents keep running until the end of your billing period.

### What payment methods are accepted?
All major credit/debit cards via Stripe. Enterprise customers can pay via invoice.

### Is there a free trial?
The Free plan is always free — no trial period, no credit card required. Use it as long as you want.

### Do unused messages roll over?
No. Daily message limits reset at midnight UTC each day.

### How does BYOK billing work?
With BYOK, you pay your AI provider directly for model usage. You still pay ClawHQ for the platform (agent hosting, channels, dashboard). BYOK users get a 30% discount on platform fees.

### Can I get a refund?
We offer a 14-day money-back guarantee on all paid plans. Contact support@clawhq.dev.`,
      },
      {
        title: 'Technical FAQ',
        slug: 'faq-technical',
        content: `## Technical FAQ

### What is OpenClaw?
OpenClaw is the open-source AI agent framework that powers ClawHQ. ClawHQ is the managed, hosted version — we handle all the infrastructure so you don't have to.

### Where are agents hosted?
Agents run on our cloud infrastructure (US-East by default). Enterprise customers can choose their region.

### What's the latency like?
Typical response time is 1-5 seconds, depending on the AI model and prompt complexity. Claude Haiku and GPT-4o Mini are the fastest.

### Can I access my agent's files?
Yes. The Memory Manager in your dashboard lets you browse, edit, and download files from your agent's workspace.

### Can I SSH into my container?
Not directly. Use the API or dashboard to manage your agent. Enterprise customers can request direct access.

### What happens during an outage?
Messages sent during an outage are queued by the channel provider (Telegram, etc.) and delivered when your agent recovers. No messages are lost.

### Is there an uptime SLA?
- Free/Pro: Best effort (99%+ historically)
- Business: 99.9% uptime SLA
- Enterprise: 99.99% with custom SLA`,
      },
    ],
  },
  {
    icon: Shield,
    title: 'Security',
    desc: 'How we keep your agents and data safe',
    articles: [
      {
        title: 'Security Overview',
        slug: 'security-overview',
        content: `## Security Overview

ClawHQ takes security seriously. Here's how we protect your agents and data.

### Infrastructure Security

- **Container Isolation:** Each agent runs in its own Docker container with strict resource limits and no network access to other containers
- **Encryption at Rest:** All data encrypted with AES-256
- **Encryption in Transit:** TLS 1.3 for all connections
- **Secret Management:** API keys and tokens stored in encrypted vaults, never in plaintext

### Application Security

- **Authentication:** bcrypt-hashed passwords, JWT sessions with refresh rotation
- **OAuth:** Google OAuth 2.0 with PKCE
- **CSRF Protection:** All state-changing endpoints protected
- **Rate Limiting:** Per-IP and per-user rate limits on all endpoints
- **Input Validation:** All inputs sanitized and validated server-side

### Data Privacy

- **No Training:** We never use your data to train AI models
- **Data Isolation:** Your data is never accessible to other customers
- **Data Deletion:** Delete your account and all data is purged within 30 days
- **Minimal Logging:** We log only what's needed for debugging and billing

### Compliance

- SOC2 Type II (in progress)
- GDPR compliant
- CCPA compliant

### Responsible Disclosure

Found a vulnerability? Email security@clawhq.dev. We respond within 24 hours and offer bounties for critical findings.`,
      },
    ],
  },
]

/* ── Code Block Component ── */
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group">
      <pre className="bg-[#0d1117] border border-border rounded-lg p-4 overflow-x-auto text-sm text-gray-300 font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
      <button onClick={copy} className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

/* ── Markdown-ish Renderer ── */
function RenderContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code blocks
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(<CodeBlock key={elements.length} code={codeLines.join('\n')} />)
      continue
    }

    // Headers
    if (line.startsWith('## ')) {
      elements.push(<h2 key={elements.length} className="text-xl font-bold text-text mt-6 mb-3">{line.slice(3)}</h2>)
      i++; continue
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={elements.length} className="text-lg font-semibold text-text mt-5 mb-2">{line.slice(4)}</h3>)
      i++; continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <div key={elements.length} className="border-l-2 border-primary/40 pl-4 my-3 text-sm text-text-secondary italic">
          <InlineFormat text={line.slice(2)} />
        </div>
      )
      i++; continue
    }

    // Table
    if (line.includes('|') && lines[i + 1]?.includes('---')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i])
        i++
      }
      const headers = tableLines[0].split('|').map(s => s.trim()).filter(Boolean)
      const rows = tableLines.slice(2).map(r => r.split('|').map(s => s.trim()).filter(Boolean))
      elements.push(
        <div key={elements.length} className="overflow-x-auto my-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                {headers.map((h, j) => <th key={j} className="text-left py-2 px-3 text-text-secondary font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/50">
                  {row.map((cell, ci) => <td key={ci} className="py-2 px-3 text-text">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // List items
    if (line.match(/^[-*] /)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].replace(/^[-*] /, ''))
        i++
      }
      elements.push(
        <ul key={elements.length} className="space-y-1.5 my-2 ml-4">
          {items.map((item, j) => <li key={j} className="text-sm text-text-secondary flex gap-2"><span className="text-primary mt-1">•</span><span><InlineFormat text={item} /></span></li>)}
        </ul>
      )
      continue
    }

    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        items.push(lines[i].replace(/^\d+\.\s/, ''))
        i++
      }
      elements.push(
        <ol key={elements.length} className="space-y-1.5 my-2 ml-4">
          {items.map((item, j) => <li key={j} className="text-sm text-text-secondary flex gap-2"><span className="text-primary font-medium min-w-[1.2em]">{j + 1}.</span><span><InlineFormat text={item} /></span></li>)}
        </ol>
      )
      continue
    }

    // Horizontal rules (---)
    if (line.match(/^[-]{3,}$/)) {
      elements.push(<hr key={elements.length} className="border-border my-4" />)
      i++; continue
    }

    // Empty line
    if (!line.trim()) { i++; continue }

    // Paragraph
    elements.push(<p key={elements.length} className="text-sm text-text-secondary leading-relaxed my-2"><InlineFormat text={line} /></p>)
    i++
  }

  return <>{elements}</>
}

/* ── Inline formatting (bold, code, links, emoji) ── */
function InlineFormat({ text }: { text: string }) {
  // Process bold, inline code, and links
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Links: [text](url)
    const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)$/)
    if (linkMatch) {
      if (linkMatch[1]) parts.push(<InlineSimple key={key++} text={linkMatch[1]} />)
      parts.push(<a key={key++} href={linkMatch[3]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{linkMatch[2]}</a>)
      remaining = linkMatch[4]
      continue
    }

    // Bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/)
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<InlineSimple key={key++} text={boldMatch[1]} />)
      parts.push(<strong key={key++} className="text-text font-medium">{boldMatch[2]}</strong>)
      remaining = boldMatch[3]
      continue
    }

    // Inline code: `text`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/)
    if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>)
      parts.push(<code key={key++} className="bg-navy/50 text-primary px-1.5 py-0.5 rounded text-xs font-mono">{codeMatch[2]}</code>)
      remaining = codeMatch[3]
      continue
    }

    // No more patterns — emit rest as text
    parts.push(<span key={key++}>{remaining}</span>)
    break
  }

  return <>{parts}</>
}

function InlineSimple({ text }: { text: string }) {
  // Handle inline code within already-processed text
  const codeMatch = text.match(/^(.*?)`([^`]+)`(.*)$/)
  if (codeMatch) {
    return <>
      {codeMatch[1]}
      <code className="bg-navy/50 text-primary px-1.5 py-0.5 rounded text-xs font-mono">{codeMatch[2]}</code>
      <InlineSimple text={codeMatch[3]} />
    </>
  }
  return <>{text}</>
}

/* ── Main Component ── */
const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function DocsPage() {
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [activeArticle, setActiveArticle] = useState<Article | null>(null)

  // Search filter
  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections
    const q = search.toLowerCase()
    return sections.map(s => ({
      ...s,
      articles: s.articles.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q)
      ),
    })).filter(s => s.articles.length > 0)
  }, [search])

  // Article view
  if (activeArticle) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <button onClick={() => setActiveArticle(null)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors">
          <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Back to Documentation
        </button>
        <div className="bg-card border border-border rounded-xl p-8 max-w-3xl">
          <RenderContent content={activeArticle.content} />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Documentation</h1>
        <p className="text-sm text-text-secondary mt-1">Everything you need to build with ClawHQ</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search documentation..."
          className="w-full bg-card border border-border rounded-xl pl-12 pr-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Quick Start Banner */}
      {!search && (
        <motion.div variants={item} className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-text">Quick Start</h3>
          </div>
          <p className="text-sm text-text-secondary mb-3">Deploy your first AI agent in 30 seconds:</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full">1. Sign up</span>
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
            <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full">2. Create agent</span>
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
            <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full">3. Connect channel</span>
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
            <span className="bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full">4. Done! 🎉</span>
          </div>
        </motion.div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {filteredSections.map(s => {
          const isOpen = activeSection === s.title
          return (
            <motion.div key={s.title} variants={item} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveSection(isOpen ? null : s.title)}
                className="w-full flex items-center gap-4 p-5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-text">{s.title}</h3>
                  <p className="text-xs text-text-muted">{s.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">{s.articles.length} articles</span>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                </div>
              </button>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-t border-border">
                  {s.articles.map(a => (
                    <button
                      key={a.slug}
                      onClick={() => setActiveArticle(a)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors border-b border-border/50 last:border-0"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-sm text-text-secondary hover:text-text transition-colors text-left">{a.title}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-text-muted ml-auto" />
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Help CTA */}
      {!search && (
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-text">Can't find what you need?</p>
              <p className="text-xs text-text-muted">Join our Discord community for help</p>
            </div>
          </div>
          <a href="https://discord.com/invite/clawd" target="_blank" className="bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Join Discord
          </a>
        </motion.div>
      )}
    </motion.div>
  )
}
