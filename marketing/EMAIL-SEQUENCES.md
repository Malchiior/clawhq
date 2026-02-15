# ClawHQ Onboarding Email Sequence

*5-email drip for new signups. Triggered on account creation.*

---

## Email 1: Welcome (Immediately after signup)

**Subject:** You're in. Let's deploy your first agent 🚀
**From:** King @ ClawHQ <hello@clawhq.dev>
**Delay:** Immediate

---

Hey {{first_name}},

Welcome to ClawHQ — you just joined the fastest way to deploy AI agents on the planet.

Here's everything you need to know:

**Your first agent is 30 seconds away.**

1. Log in to your [dashboard](https://clawhq.dev/dashboard)
2. Click "Create Agent"
3. Name it, pick a model (Claude, GPT-4, Gemini — your call), connect a channel
4. Hit Deploy

That's it. Your agent is live.

If you need a hand getting started, reply to this email — I read every one.

Welcome aboard,
**King**
Founder, ClawHQ

P.S. — You're on the Free tier (1 agent, 100 msgs/day). That's plenty to test everything. When you're ready for more, [upgrade to Pro →](https://clawhq.dev/pricing)

---

## Email 2: First Value (Day 1 — 24 hours after signup)

**Subject:** 3 system prompts that make your agent 10x better
**From:** King @ ClawHQ <hello@clawhq.dev>
**Delay:** 24 hours after Email 1

---

Hey {{first_name}},

Most people deploy an agent and use the default system prompt. It works, but it's like driving a sports car in first gear.

Here are three system prompts that unlock your agent's full potential:

**🛒 E-Commerce Support Agent**
```
You are [Brand] Support, a friendly and efficient customer service agent. You help with order tracking, returns, product questions, and shipping. Always check order details before responding. Be warm but concise. If you can't resolve an issue, collect the customer's email and escalate to the human team.
```

**📅 Personal Assistant**
```
You are my personal assistant. Help me manage my schedule, brainstorm ideas, draft emails, and stay organized. Be proactive — suggest next steps. Keep responses concise unless I ask for detail. Remember our conversation context.
```

**🏢 Internal Knowledge Bot**
```
You are [Company] Assistant, our internal knowledge base. Answer questions about our processes, policies, and tools based on the documentation provided. Always cite your source. If you're unsure, say "I'm not sure — let me flag this for the team" rather than guessing.
```

Copy any of these, paste them into your agent's system prompt, and customize for your use case.

**Pro tip:** The more specific your system prompt, the better your agent performs. Tell it what to do, how to behave, and what to avoid.

[→ Edit your agent's system prompt](https://clawhq.dev/dashboard)

Cheers,
**King**

---

## Email 3: Social Proof & Upgrade Nudge (Day 3)

**Subject:** "We replaced our $3K/mo support tool with ClawHQ"
**From:** King @ ClawHQ <hello@clawhq.dev>
**Delay:** 3 days after signup

---

Hey {{first_name}},

Quick story — one of our early users ran a 15-person e-commerce brand. They were paying $3,200/month for a support tool + two part-time support agents.

They deployed a ClawHQ agent on their WhatsApp and Telegram channels. Within a week, the AI agent was handling 70% of incoming support queries autonomously — order tracking, return requests, product questions.

Their support team went from reactive firefighting to handling only complex escalations. Response time dropped from 4 hours to 12 seconds.

**Monthly cost: $19.**

I'm not saying AI replaces your team. I'm saying it frees your team to do work that actually requires a human.

---

**Have you deployed your first agent yet?**

If yes — awesome. How's it going? Hit reply, I'd love to hear.

If not — what's holding you back? Seriously, reply and tell me. I'll personally help you get set up.

[→ Deploy your agent now](https://clawhq.dev/dashboard)

**King**

P.S. — If you're hitting the 100 msg/day limit on Free, [Pro unlocks 5,000 msgs/day for $19/mo →](https://clawhq.dev/pricing)

---

## Email 4: White-Label & Business Use Case (Day 5)

**Subject:** The agency play nobody's talking about
**From:** King @ ClawHQ <hello@clawhq.dev>
**Delay:** 5 days after signup

---

Hey {{first_name}},

I want to share something that's been quietly making agencies a lot of money.

**The play:** Deploy AI agents for your clients under your own brand.

ClawHQ's Business tier ($49/mo) includes full white-label support:

- ✅ Your logo, your colors, your domain
- ✅ Remove all ClawHQ branding
- ✅ Deploy up to 10 agents
- ✅ SSO and team management
- ✅ Priority support

**The math:**
- You pay: $49/mo
- You deploy 10 agents for 10 clients
- You charge each client: $200-500/mo
- Your revenue: $2,000-5,000/mo
- Your profit margin: 90%+

Your clients get a premium AI agent. They think it's your proprietary technology. You build recurring revenue on top of infrastructure that costs you $4.90 per client.

This isn't theoretical. Agencies are doing this right now.

**Not an agency?** White-label is also perfect for:
- SaaS founders embedding AI into their product
- Consultants productizing their services
- Enterprises wanting full brand control

[→ Explore Business tier](https://clawhq.dev/pricing)

**King**

P.S. — **Founding Member pricing** is still available: $29/mo forever instead of $49/mo. Only 50 slots. [Lock it in →](https://clawhq.dev/pricing)

---

## Email 5: Urgency & Final CTA (Day 7)

**Subject:** Founding Member slots are going fast
**From:** King @ ClawHQ <hello@clawhq.dev>
**Delay:** 7 days after signup

---

Hey {{first_name}},

One week ago, you signed up for ClawHQ. Here's what's happened since:

- **{{agents_deployed}} agents** have been deployed on the platform
- **{{messages_sent}} messages** processed across all channels
- **Founding Member slots** are filling up

Speaking of which — this is the last time I'll mention this:

**Founding Member pricing locks in forever:**
- Pro: **$12/mo** (normally $19)
- Business: **$29/mo** (normally $49)

"Forever" means forever. Your price never increases, even as we add features, models, and channels. It's our way of saying thanks to early believers.

Once the slots are gone, they're gone. We won't reopen them.

---

**Your 30-second checklist:**
- [ ] Log into [clawhq.dev](https://clawhq.dev/dashboard)
- [ ] Deploy an agent (if you haven't yet)
- [ ] Upgrade to lock in Founding Member pricing

That's it. Three steps.

Thanks for being here, {{first_name}}. If you ever need anything — feature request, help with setup, or just want to chat about AI — reply to this email.

Let's build something great.

**King**
Founder, ClawHQ

[→ Lock In Founding Pricing](https://clawhq.dev/pricing)

---

## Sequence Notes

### Sending Rules
- **Skip Email 3-5** if user has already upgraded to Pro or Business
- **Trigger re-engagement** if user hasn't logged in after 14 days (separate sequence)
- **Unsubscribe** link in every email (CAN-SPAM compliance)
- All emails from `hello@clawhq.dev` via Resend

### Metrics to Track
- Open rate (target: 40%+ for Email 1, 25%+ for Email 5)
- Click-through rate (target: 10%+ for Email 1)
- Conversion rate to Pro/Business (target: 5-8% of free signups)
- Reply rate (target: 2-3% — replies indicate engagement)

### A/B Test Ideas
- Email 1 subject: "Welcome to ClawHQ" vs "You're in. Let's deploy your first agent 🚀"
- Email 3: Case study vs product tour video
- Email 5: Scarcity angle vs feature highlight angle

---

*Implement via Resend + custom backend triggers. Personalization variables: {{first_name}}, {{agents_deployed}}, {{messages_sent}}.*
