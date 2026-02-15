# ClawHQ Scaling & Future-Proofing Plan

> How we handle 10, 100, 1,000, and 10,000+ concurrent users without breaking a sweat.

---

## Architecture Overview

```
Users → Cloudflare CDN → Vercel (frontend)
                       → Railway/Fly.io (API) → PostgreSQL + Redis
                       → Container Orchestrator → User Agent Containers
```

## Current Stack

| Layer | Tech | Hosting |
|-------|------|---------|
| Frontend | React + Vite SPA | Vercel (auto-scales) |
| API Backend | Express + Prisma + TypeScript | Railway |
| Database | PostgreSQL 16 | Railway / Neon |
| Cache | Redis 7 | Railway |
| Agent Containers | Docker (OpenClaw per user) | Docker host |
| Reverse Proxy | Caddy (auto-SSL) | Co-located |

## Scaling Tiers

### Tier 1: 1–100 Users (Launch Phase)

**Infrastructure:**
- Single Railway instance (API + worker)
- Neon Postgres (serverless, auto-scales reads)
- Redis on Railway (128MB)
- Agent containers on a single $48/mo Hetzner VPS (8 vCPU, 16GB RAM)

**Capacity:**
- ~50 concurrent agent containers at 256MB each = 12.8GB
- PostgreSQL handles 100 connections easily
- Redis caches sessions, rate limits

**Cost:** ~$70/mo total

**Actions needed:**
- [x] Docker Compose production config
- [ ] Deploy backend to Railway with Procfile
- [ ] Provision Hetzner VPS for agent containers
- [ ] Set up Docker socket API with mTLS auth
- [ ] Basic health monitoring (UptimeRobot free tier)

---

### Tier 2: 100–500 Users (Growth Phase)

**Infrastructure upgrades:**
- Move to Railway Pro ($20/mo base) for autoscaling
- Upgrade Hetzner to dedicated (32GB RAM) or add second VPS
- Add connection pooling (PgBouncer) in front of Postgres
- Redis Cluster or upgrade to 512MB

**New components:**
- **Queue system:** BullMQ (Redis-backed) for async container operations
  - Container create/destroy
  - Billing events
  - Email sends
- **Container registry:** Pre-built OpenClaw images cached locally
- **Load balancer:** Caddy with health checks across 2+ API instances

**Capacity:**
- ~200 concurrent containers across 2 VPS nodes
- API horizontally scaled to 2-3 instances
- Database: upgrade to dedicated Postgres (Neon Pro or Supabase Pro)

**Cost:** ~$200-350/mo

---

### Tier 3: 500–2,000 Users (Scale Phase)

**Infrastructure upgrades:**
- **Kubernetes (K3s)** on 3+ Hetzner nodes for container orchestration
  - Auto-scheduling of agent containers across nodes
  - Rolling updates, self-healing
  - Resource quotas per namespace (per user)
- **Postgres:** Dedicated instance with read replicas
- **Redis Sentinel** for HA caching
- **S3-compatible storage** (Hetzner Object Storage) for logs, backups

**New components:**
- **Container pre-warming pool:** Keep 10-20 idle containers ready
  - New user → claim pre-warmed container (instant deploy)
  - Background worker replenishes pool
- **Metrics:** Prometheus + Grafana for real-time monitoring
- **Log aggregation:** Loki or Betterstack for centralized container logs
- **CDN:** Cloudflare Pro for DDoS protection + edge caching

**Auto-scaling logic:**
```
IF active_containers > 80% of node_capacity:
  provision_new_node()  # ~2 min with Hetzner API
IF active_containers < 40% of node_capacity AND nodes > min_nodes:
  drain_and_remove_node()  # graceful migration
```

**Cost:** ~$500-1,000/mo

---

### Tier 4: 2,000–10,000+ Users (Enterprise Phase)

**Infrastructure:**
- **Multi-region K8s clusters** (US-East, US-West, EU)
- **CockroachDB** or Postgres with Citus for distributed database
- **Dedicated container nodes** per enterprise customer
- **Custom domains** via Caddy + Let's Encrypt automation (already scaffolded)

**New components:**
- **Terraform IaC** for all infrastructure
- **CI/CD pipeline** (GitHub Actions → staging → production)
- **SOC2 audit trail** (immutable logs)
- **Multi-tenant isolation:** Network policies, dedicated namespaces
- **Billing metering:** Real-time usage tracking per container

**Cost:** $2,000-8,000/mo (offset by revenue at $19-49/user)

---

## Pre-Provisioning Strategy (Never Show "Sold Out")

### Container Pool Management

```typescript
// Pool config per tier
const POOL_CONFIG = {
  free:     { maxPerNode: 50, memoryMB: 256, cpuShares: 256 },
  pro:      { maxPerNode: 30, memoryMB: 512, cpuShares: 512 },
  business: { maxPerNode: 15, memoryMB: 1024, cpuShares: 1024 },
  enterprise: { dedicated: true, memoryMB: 2048, cpuShares: 2048 },
};

// Pre-warm strategy
const PREWARMED_CONTAINERS = {
  free: 20,      // Always have 20 free-tier containers ready
  pro: 10,       // 10 pro containers ready
  business: 5,   // 5 business containers ready
};
```

### Capacity Planning Formula

```
Required nodes = ceil(active_users * avg_containers_per_user / containers_per_node)
Buffer nodes = ceil(required_nodes * 0.3)  // 30% headroom
Total nodes = required_nodes + buffer_nodes
```

### Overflow Strategy
1. **Primary:** Claim from pre-warmed pool (instant)
2. **Secondary:** Spin up on existing node with capacity (5-15 sec)
3. **Tertiary:** Auto-provision new Hetzner node via API (2-3 min)
4. **Emergency:** Queue user with "Deploying your agent..." animation + webhook callback

**Never** show "sold out" or "at capacity." Always queue gracefully.

---

## Database Scaling Path

| Users | Strategy | Tool |
|-------|----------|------|
| 1-500 | Single Postgres + connection pooling | Neon / PgBouncer |
| 500-2K | Read replicas for dashboards/analytics | Neon branching or manual replica |
| 2K-5K | Partition tables (by user_id) + read replicas | Postgres native partitioning |
| 5K+ | Distributed DB (Citus or CockroachDB) | Multi-node sharding |

### Key indexes to add early:
```sql
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_containers_status ON containers(status);
CREATE INDEX idx_usage_user_month ON usage_logs(user_id, month);
CREATE INDEX idx_billing_events ON billing_events(user_id, created_at);
```

---

## Hosting Platform Decision

### Recommended: Hetzner Cloud + Railway

| Component | Platform | Why |
|-----------|----------|-----|
| API + Workers | Railway | Easy deploy, autoscale, managed |
| Agent Containers | Hetzner Cloud | 3x cheaper than AWS, EU + US regions, API for auto-provisioning |
| Database | Neon (start) → Hetzner dedicated (scale) | Serverless start, migrate when needed |
| Frontend | Vercel | Free tier is generous, edge CDN built-in |
| DNS + CDN | Cloudflare | Free DDoS protection, edge caching |

### Cost comparison at 1,000 users:

| Platform | Monthly Cost |
|----------|-------------|
| **Hetzner + Railway** | **~$500-800** |
| AWS ECS/Fargate | ~$2,000-3,500 |
| DigitalOcean | ~$1,000-1,500 |
| Fly.io | ~$800-1,200 |

### Why not AWS/GCP?
- Overkill at our stage, 3-5x more expensive
- Migrate when we hit $10K+ MRR and need enterprise compliance
- Hetzner API is simple and provision time is ~30 seconds

---

## Monitoring & Alerting

### Day 1 (Launch):
- UptimeRobot (free) — ping API every 5 min
- Railway built-in metrics
- Error tracking: Sentry free tier

### Day 30 (100+ users):
- Prometheus + Grafana on Hetzner
- Custom dashboards: container count, API latency, error rates
- PagerDuty or Betterstack alerts for downtime

### Day 90 (500+ users):
- Full observability stack (Prometheus + Loki + Grafana)
- Distributed tracing (OpenTelemetry)
- Business metrics dashboard (MRR, churn, usage per tier)

---

## Backup & Disaster Recovery

| What | Frequency | Retention | Where |
|------|-----------|-----------|-------|
| PostgreSQL | Every 6 hours | 30 days | Hetzner Object Storage |
| Redis | Daily RDB snapshot | 7 days | Local + S3 |
| User agent configs | On every change | Forever | PostgreSQL + S3 |
| Container volumes | Daily | 14 days | S3-compatible |

### Recovery Time Objectives:
- **API down:** < 5 min (Railway auto-restart + health checks)
- **Database failure:** < 15 min (restore from Neon point-in-time or backup)
- **Full region failure:** < 1 hour (DNS failover to secondary region)

---

## Security at Scale

1. **Network isolation:** Each user's container in its own Docker network
2. **Resource limits:** CPU/RAM caps per container (enforced in Docker)
3. **API rate limiting:** Redis-backed, per-user, per-tier
4. **Secrets management:** Encrypted at rest (AES-256), per-user encryption keys
5. **Audit logging:** All admin actions logged with timestamps
6. **Container sandboxing:** No host network access, read-only filesystem, no privileged mode

---

## Implementation Priority

### This Week (Pre-Launch):
1. ✅ Docker Compose production config
2. Deploy backend to Railway with health check endpoint
3. Set up single Hetzner VPS for agent containers
4. Basic UptimeRobot monitoring
5. Database indexes + connection pooling

### First Month (Post-Launch):
1. BullMQ job queue for async operations
2. Container pre-warming pool (10 free-tier containers)
3. Prometheus + Grafana basic dashboard
4. Automated daily backups

### First Quarter:
1. K3s cluster (3 nodes) replacing single VPS
2. Auto-scaling node provisioning via Hetzner API
3. Read replicas for analytics queries
4. Multi-region preparation (US-East primary, EU secondary)

---

## Revenue vs. Infrastructure Cost Model

| Users | MRR (est.) | Infra Cost | Margin |
|-------|-----------|------------|--------|
| 50 | $500 | $70 | 86% |
| 200 | $2,500 | $250 | 90% |
| 500 | $7,000 | $600 | 91% |
| 1,000 | $15,000 | $800 | 95% |
| 5,000 | $75,000 | $3,000 | 96% |

**Key insight:** SaaS margins improve dramatically with scale. Infrastructure costs grow sub-linearly because of resource sharing (many free-tier users on shared nodes).

---

*Last updated: February 14, 2026*
*Next review: When we hit 50 paying users*
