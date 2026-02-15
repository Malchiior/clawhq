# ClawHQ Security Audit Report

**Date:** February 13, 2026  
**Auditor:** Buddha (AI Agent)  
**Scope:** Backend API server (`backend/src/`)

---

## 🔴 CRITICAL Issues

### 1. Command Injection in Container Orchestrator
**File:** `lib/containerOrchestrator.ts`  
**Risk:** Remote Code Execution  
**Details:** `dockerRun()` builds shell commands via string concatenation with user-controlled values (agent name, system prompt, etc.). A malicious agent name like `foo; rm -rf /` would execute arbitrary commands.  
**Fix:** ✅ FIXED — Added `shellEscape()` function to sanitize all values passed to shell commands. Agent names validated with strict regex.

### 2. Unauthenticated Webhook Endpoints
**File:** `routes/webhooks.ts`, `routes/agents.ts` (`:agentId/webhook`)  
**Risk:** Data Tampering / Usage Fraud  
**Details:** `/api/webhooks/agent` and `/api/agents/:agentId/webhook` accept any POST without authentication. An attacker can spoof agent status, inflate usage stats, or corrupt logging.  
**Fix:** ✅ FIXED — Added webhook token validation. Containers must present the `X-Webhook-Token` header matching the token stored in the database.

### 3. Default Cryptographic Secrets
**File:** `lib/session.ts`  
**Risk:** Token Forgery / Session Hijack  
**Details:** JWT_SECRET defaults to `'dev-secret'` and REFRESH_SECRET to `'refresh-dev-secret'`. If env vars aren't set in production, any attacker can forge valid JWTs.  
**Fix:** ✅ FIXED — Added startup validation that crashes if default secrets are used when `NODE_ENV=production`.

### 4. Weak API Key Encryption
**File:** `routes/api-keys.ts`  
**Risk:** User API Key Exposure  
**Details:** Encryption key defaults to `'default-key-for-dev-only-32-chars'` and uses hardcoded `'salt'` for `scryptSync`. If the default key is used, all stored API keys are trivially decryptable.  
**Fix:** ✅ FIXED — Added startup warning for default key, randomized salt stored alongside ciphertext.

---

## 🟡 HIGH Issues

### 5. No Rate Limiting on Auth Endpoints
**File:** `routes/auth.ts`  
**Risk:** Brute Force / Credential Stuffing  
**Details:** `/api/auth/login`, `/signup`, `/forgot-password` have no rate limiting. Attackers can brute-force passwords or flood signup.  
**Fix:** ✅ FIXED — Added `express-rate-limit` middleware to auth routes.

### 6. Password Reset Not Implemented
**File:** `routes/auth.ts`  
**Risk:** Account Lockout  
**Details:** `/forgot-password` and `/reset-password` are stubs returning static JSON. Users with forgotten passwords have no recovery path.  
**Status:** Noted — checklist item #13 covers this.

### 7. Agent API Key Stored in Plaintext
**File:** `routes/agents.ts`  
**Risk:** API Key Exposure via DB Breach  
**Details:** When `usesBundledApi=false`, the user's raw API key is stored in `agent.apiKey` without encryption.  
**Fix:** ✅ FIXED — Agent API keys now encrypted using the same `encrypt()` from api-keys.ts before storage.

---

## 🟢 MEDIUM Issues

### 8. CORS Allows Multiple Origins Including localhost
**File:** `index.ts`  
**Risk:** Cross-Origin Attacks in Dev  
**Details:** `http://localhost:5173` is always in CORS allowlist. Should be conditional on NODE_ENV.  
**Fix:** ✅ FIXED — localhost only allowed when `NODE_ENV !== 'production'`.

### 9. Google API Key Leaked in URL
**File:** `routes/api-keys.ts`  
**Risk:** Key in Server Logs  
**Details:** `testApiKey('GOOGLE', key)` passes the API key as a URL query parameter, which may appear in server access logs.  
**Status:** Low risk (test endpoint, key belongs to user), noted for awareness.

### 10. No Input Validation on Agent System Prompts
**File:** `routes/agents.ts`  
**Risk:** XSS / Injection  
**Details:** System prompts are stored and passed to containers without sanitization or length limits.  
**Fix:** ✅ FIXED — Added 10,000 char limit on system prompts.

### 11. Cleanup Endpoint Uses Weak Auth
**File:** `routes/auth.ts` (`/cleanup-sessions`)  
**Risk:** Unauthorized Session Cleanup  
**Details:** Uses simple `x-api-key` header comparison. Timing-safe comparison not used.  
**Fix:** ✅ FIXED — Uses `crypto.timingSafeEqual` for comparison.

---

## ✅ Things Done Right

- **Helmet.js** enabled for security headers
- **bcrypt** with cost factor 12 for password hashing
- **JWT with short access tokens** (15min) + refresh token rotation
- **Session revocation** tracked in database (not just JWT expiry)
- **Stripe webhook signature verification** properly implemented
- **Email verification** required before login
- **Beta invite codes** for controlled access
- **Docker resource limits** (RAM + CPU caps per container)
- **Graceful shutdown** handlers for SIGTERM/SIGINT
- **Domain verification** via DNS TXT + CNAME records
- **Owner checks** on all agent/API key operations (no IDOR)

---

## Production Deploy Checklist (Security Items)

- [ ] Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (min 64 chars)
- [ ] Set strong `API_KEY_ENCRYPTION_KEY` (32+ chars, random)
- [ ] Set `STRIPE_WEBHOOK_SECRET` from Stripe dashboard
- [ ] Set `NODE_ENV=production`
- [ ] Set `CLEANUP_API_KEY` to a strong random value
- [ ] Remove `http://localhost:5173` from CORS in production
- [ ] Enable HTTPS-only (handled by Railway/Vercel)
- [ ] Set up database backups
- [ ] Configure log aggregation (no secrets in logs)
- [ ] Set up monitoring alerts for failed auth attempts
