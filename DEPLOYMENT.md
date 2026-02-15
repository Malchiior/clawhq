# ClawHQ Cloud Deployment Guide

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  clawhq.dev │     │ api.clawhq.dev│     │   Postgres   │
│   (Vercel)  │────▶│  (Railway /  │────▶│  (Railway /  │
│  React SPA  │     │  Fly.io/VPS) │     │  Neon / RDS) │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    ┌──────▼───────┐
                    │Docker Socket │
                    │  (Agent      │
                    │  Containers) │
                    └──────────────┘
```

- **Frontend** → Vercel (already deployed at clawhq.dev)
- **Backend API** → Railway (recommended), Fly.io, or self-hosted
- **Database** → Railway Postgres or Neon
- **Agent Containers** → Docker on the same host or dedicated Docker host

---

## Option A: Railway (Recommended — Fastest)

Railway already has the config files (`railway.json`, `nixpacks.toml`, `Procfile`).

### 1. Create Railway Project
```bash
cd backend
railway login
railway init    # or link to existing project
```

### 2. Add PostgreSQL
```bash
railway add --plugin postgresql
```

### 3. Set Environment Variables
```bash
railway variables set \
  NODE_ENV=production \
  FRONTEND_URL=https://clawhq.dev \
  APP_URL=https://clawhq-api.up.railway.app \
  JWT_SECRET=$(openssl rand -hex 32) \
  MASTER_API_ENCRYPTION_KEY=$(openssl rand -hex 16) \
  GOOGLE_CLIENT_ID=your-google-client-id \
  GOOGLE_CLIENT_SECRET=your-google-client-secret \
  RESEND_API_KEY=your-resend-key
```

Railway auto-sets `DATABASE_URL` from the Postgres plugin.

### 4. Deploy
```bash
railway up
```

### 5. Run Migrations
```bash
railway run npx prisma migrate deploy
```

### 6. Custom Domain (Optional)
```bash
railway domain add api.clawhq.dev
```
Then add CNAME record: `api.clawhq.dev → your-project.up.railway.app`

---

## Option B: Fly.io

### 1. Launch
```bash
cd backend
fly launch --config fly.toml --no-deploy
```

### 2. Create Postgres
```bash
fly postgres create --name clawhq-db --region iad --vm-size shared-cpu-1x
fly postgres attach --app clawhq-api clawhq-db
```

### 3. Set Secrets
```bash
fly secrets set \
  JWT_SECRET=$(openssl rand -hex 32) \
  MASTER_API_ENCRYPTION_KEY=$(openssl rand -hex 16) \
  GOOGLE_CLIENT_ID=xxx \
  GOOGLE_CLIENT_SECRET=xxx \
  RESEND_API_KEY=xxx
```

### 4. Deploy
```bash
fly deploy
```

### 5. Migrations
```bash
fly ssh console -C "npx prisma migrate deploy"
```

---

## Option C: Self-Hosted (VPS / DigitalOcean / AWS EC2)

Uses `docker-compose.prod.yml` with Caddy for auto-SSL.

### 1. Provision Server
- Ubuntu 24.04 LTS, 2 vCPU, 4GB RAM minimum
- Open ports 80, 443

### 2. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 3. Clone & Configure
```bash
git clone https://github.com/Malchiior/clawhq.git
cd clawhq/backend
cp .env.example .env.production
# Edit .env.production with real values
```

### 4. Deploy
```bash
docker compose -f docker-compose.prod.yml up -d
```

### 5. Run Migrations
```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

### 6. Point DNS
- `api.clawhq.dev` → A record → server IP
- Caddy handles SSL automatically via Let's Encrypt

---

## Frontend (Vercel)

Already deployed. Update environment variable:
```
VITE_API_URL=https://api.clawhq.dev
```

---

## Post-Deploy Checklist

- [ ] `GET /api/health` returns 200
- [ ] Database migrations applied
- [ ] Google OAuth callback URL updated to production
- [ ] Stripe webhook URL updated to production
- [ ] CORS allows `clawhq.dev`
- [ ] Agent container creation works (Docker socket accessible)
- [ ] Email sending works (test verification flow)

---

## Scaling Notes

| Users   | Recommended Setup                          |
|---------|-------------------------------------------|
| 0-100   | Railway Starter ($5/mo) + Postgres         |
| 100-500 | Railway Pro or Fly.io (2 instances)        |
| 500+    | Dedicated Docker host for agent containers |
| 1000+   | Kubernetes (ECS/GKE) + managed Postgres    |

Agent containers are the bottleneck — each user's agent runs in its own Docker container (~128MB RAM). Plan for ~128MB × active_agents of Docker host memory.
