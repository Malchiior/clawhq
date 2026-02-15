# ClawHQ Production Deploy Checklist

**Last Updated:** February 13, 2026

Use this checklist before every production deployment. Items marked 🔑 require secrets/credentials.

---

## 1. Environment Variables

### Backend (Railway / Fly.io / VPS)

| Variable | Status | Notes |
|----------|--------|-------|
| `DATABASE_URL` | ✅ Set | Neon Postgres (connection pooler) |
| `JWT_SECRET` | ✅ Set | 128-char hex — NOT the default `dev-secret` |
| `JWT_REFRESH_SECRET` | ✅ Set | 128-char hex — NOT the default |
| `FRONTEND_URL` | ✅ Set | `https://clawhq.dev` |
| `BACKEND_URL` | ✅ Set | `https://clawhq.dev` |
| `PORT` | ✅ Set | `3001` |
| `NODE_ENV` | ⬜ Set | Must be `production` — enforces secret validation |
| `RESEND_API_KEY` | ✅ Set | For email verification/password reset |
| `CLEANUP_API_KEY` | ✅ Set | Session cleanup endpoint auth |
| `BETA_OPEN` | ✅ Set | `false` — invite-only mode |
| `ADMIN_EMAILS` | ✅ Set | `de776464@ucf.edu` |
| 🔑 `GOOGLE_CLIENT_ID` | ⬜ Needs King | Google OAuth (GCP Console) |
| 🔑 `GOOGLE_CLIENT_SECRET` | ⬜ Needs King | Google OAuth (GCP Console) |
| 🔑 `STRIPE_SECRET_KEY` | ⬜ Needs King | Stripe live key (switch from test) |
| 🔑 `STRIPE_PUBLISHABLE_KEY` | ⬜ Needs King | Stripe live publishable key |
| 🔑 `STRIPE_WEBHOOK_SECRET` | ⬜ Needs King | Stripe live webhook secret |
| 🔑 `MASTER_API_ENCRYPTION_KEY` | ⬜ Generate | `openssl rand -hex 16` — for BYOK encryption |
| 🔑 `CLAWHQ_ANTHROPIC_KEY` | ⬜ Needs King | Bundled API mode — Anthropic key |
| 🔑 `CLAWHQ_OPENAI_KEY` | ⬜ Needs King | Bundled API mode — OpenAI key |
| 🔑 `CLAWHQ_GOOGLE_KEY` | ⬜ Needs King | Bundled API mode — Google AI key |
| 🔑 `CLAWHQ_DEEPSEEK_KEY` | ⬜ Optional | Bundled API mode — DeepSeek key |
| 🔑 `CLAWHQ_GROK_KEY` | ⬜ Optional | Bundled API mode — xAI/Grok key |

### Frontend (Vercel)

| Variable | Status | Notes |
|----------|--------|-------|
| `VITE_API_URL` | ✅ Set | Points to backend API URL |

---

## 2. DNS & SSL

- [x] `clawhq.dev` → Vercel (A record: 76.76.21.21)
- [x] SSL certificate active on clawhq.dev
- [ ] `api.clawhq.dev` → Backend host (CNAME to Railway/Fly) — **when backend deployed**
- [ ] SSL on `api.clawhq.dev` — auto via Railway/Fly/Caddy

---

## 3. Database

- [x] Neon Postgres provisioned
- [ ] Run `npx prisma migrate deploy` on production DB
- [ ] Verify all tables created: `User`, `Agent`, `ApiKey`, `BetaInvite`, `WaitlistEntry`, etc.
- [ ] Create initial admin user (or register via OAuth)
- [ ] Generate beta invite codes for early access

---

## 4. Security (Pre-Launch)

Reference: `SECURITY-AUDIT.md` — all critical/high issues resolved.

- [x] Command injection in container orchestrator — FIXED
- [x] Unauthenticated webhook endpoints — FIXED (token validation)
- [x] Default JWT secrets crash on production — FIXED
- [x] API key encryption — FIXED
- [ ] Verify `NODE_ENV=production` is set (enforces secret checks)
- [ ] Verify CORS only allows `https://clawhq.dev`
- [ ] Security headers active (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) — ✅ via `vercel.json`
- [ ] Rate limiting on auth endpoints (login, register, password reset)
- [ ] Verify container isolation — Docker socket permissions scoped

---

## 5. Third-Party Services

| Service | Purpose | Status |
|---------|---------|--------|
| Vercel | Frontend hosting | ✅ Deployed |
| Railway | Backend hosting | ⬜ Deploy backend |
| Neon | PostgreSQL | ✅ Provisioned |
| Stripe | Payments/billing | ⬜ Switch to live keys |
| Google OAuth | Social login | ⬜ Update callback URL to prod |
| Resend | Transactional email | ✅ Key set |
| PostHog | Product analytics | ✅ Integrated |
| Docker | Agent containers | ⬜ Docker host needed |

---

## 6. Google OAuth Callback URLs

Update in GCP Console → APIs & Services → Credentials:

```
Authorized redirect URIs:
  https://clawhq.dev/auth/google/callback
  https://api.clawhq.dev/api/auth/google/callback
```

Remove localhost URIs for production.

---

## 7. Stripe Production Setup

1. Switch from test keys (`sk_test_...`) to live keys (`sk_live_...`)
2. Create production webhook endpoint: `https://api.clawhq.dev/api/webhooks/stripe`
3. Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Update `STRIPE_WEBHOOK_SECRET` with new webhook signing secret
5. Create production products/prices matching tiers:
   - Free: $0/mo
   - Pro: $19/mo
   - Business: $49/mo

---

## 8. Pre-Deploy Build Verification

```bash
# Frontend
cd app
npm ci
npm run build          # Must complete without errors
npx tsc --noEmit       # TypeScript check

# Backend
cd ../backend
npm ci
npm run build          # Must compile TypeScript
npx prisma generate    # Generate Prisma client
```

---

## 9. Deploy Steps

### Frontend (Vercel — automatic)
```bash
git push origin main   # Vercel auto-deploys from main branch
```

### Backend (Railway)
```bash
cd backend
railway login
railway link           # Link to ClawHQ project
railway up             # Deploy
railway run npx prisma migrate deploy   # Run migrations
```

### Verify
```bash
# Health check
curl https://api.clawhq.dev/api/health

# Auth flow
# 1. Visit https://clawhq.dev
# 2. Register with email
# 3. Check verification email arrives
# 4. Login succeeds
# 5. Google OAuth works

# Agent creation
# 1. Create agent via dashboard
# 2. Verify container starts
# 3. Connect Telegram channel
# 4. Send test message
```

---

## 10. Post-Deploy Monitoring

- [ ] Set up UptimeRobot/Betterstack for `https://api.clawhq.dev/api/health`
- [ ] Monitor Railway logs for errors
- [ ] Check Stripe dashboard for test transactions
- [ ] Verify PostHog events flowing
- [ ] Test email delivery (verification, password reset)

---

## 11. Rollback Plan

```bash
# Vercel — instant rollback via dashboard
# Railway — redeploy previous commit
railway up --detach    # Previous version accessible via deploy ID

# Database — Neon supports branching for rollback
# Create a branch before migrations as backup
```

---

## ⚠️ Blockers Requiring King's Action

1. **Google OAuth credentials** — Need GCP project with OAuth consent screen configured
2. **Stripe live keys** — Switch from test to production in Stripe dashboard
3. **Bundled API keys** — Anthropic/OpenAI/Google keys for managed API mode
4. **Docker host** — Railway or VPS with Docker for agent containers
5. **Domain DNS** — `api.clawhq.dev` CNAME once backend host is known

---

*This checklist ensures nothing falls through the cracks on launch day. Each item that needs King's input is marked 🔑.*
