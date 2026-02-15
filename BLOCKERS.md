# ClawHQ Blockers Log
*Updated: Feb 15, 2026 3:15 AM*

## Active Blockers
- **CLAWHQ_ANTHROPIC_KEY**: Need Anthropic API key set as Railway env var for bundled API mode. King needs to provide or generate from console.anthropic.com
- **Social media accounts**: Reddit (u/ClawHQ) + Twitter (@ClawHQ) need virtual phone number for verification
- **YouTube demo video**: Need OBS Studio installed for screen recording
- **Sentry activation**: Need King to create Sentry project + provide SENTRY_DSN
- **Printify API token expired**: 401 on orders endpoint. King needs to regenerate token at printify.com → Settings → API

## Resolved
- ✅ Setup wizard "lost connection" bug — replaced AI-powered flow with scripted flow (no API key needed)
- ✅ Trust proxy warning — added `app.set('trust proxy', 1)` 
- ✅ Agent creation 403 — test user had wrong plan limits in DB
- ✅ Channel type normalization — lowercase types now auto-uppercased
- ✅ User API leaking passwordHash — added sanitizeUser() helper
