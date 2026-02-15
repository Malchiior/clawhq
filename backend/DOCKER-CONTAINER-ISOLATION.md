# Docker Container Isolation for ClawHQ

## Overview

ClawHQ implements Docker container isolation to provide secure, isolated OpenClaw agents for each user. Every user agent runs in its own Docker container with resource limits, network isolation, and dedicated workspace.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  ClawHQ API     │    │  Docker Engine  │    │  User Agents    │
│  (Orchestrator) │◄──►│                 │◄──►│  (Containers)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Components

1. **Container Orchestrator** (`containerOrchestrator.ts`)
   - Manages container lifecycle (create, start, stop, destroy)
   - Handles resource allocation (ports, memory, CPU)
   - Monitors container health and auto-restarts
   - Builds and maintains OpenClaw Docker images

2. **Agent API Routes** (`routes/agents.ts`)
   - RESTful endpoints for agent management
   - Authentication and authorization
   - Integration with Prisma database
   - Webhook handling for container callbacks

3. **Base OpenClaw Image** (`docker/Dockerfile.openclaw`)
   - Alpine Linux with Node.js 24
   - OpenClaw installed globally
   - Non-root user for security
   - Health check endpoints
   - Configurable entrypoint

## Container Isolation Features

### Security
- **Non-root execution**: All containers run as unprivileged user (`openclaw:1001`)
- **Resource limits**: 512MB RAM, 50% CPU quota per container
- **Network isolation**: Each container gets its own port (19000-19999 range)
- **Filesystem isolation**: Separate workspace per user
- **API key encryption**: User API keys stored encrypted in database

### Resource Management
- **Port allocation**: Dynamic port assignment from pool
- **Memory limits**: 512MB RAM per container (configurable)
- **CPU limits**: 50% CPU quota (50000/100000)
- **Health monitoring**: 30-second intervals with auto-restart
- **Graceful shutdown**: 10-second timeout for container stops

### Multi-tenancy
- **User isolation**: Complete separation between user agents
- **Container naming**: `clawhq-{userId}-{agentId}` pattern
- **Webhook tokens**: Unique tokens per agent for callbacks
- **Workspace persistence**: Agent memory/config stored in database

## API Endpoints

### Agent Management
- `GET /api/agents` - List user's agents with container status
- `POST /api/agents` - Create new agent (validates subscription limits)
- `POST /api/agents/:id/deploy` - Deploy agent to container
- `POST /api/agents/:id/start` - Start stopped container
- `POST /api/agents/:id/stop` - Stop running container
- `DELETE /api/agents/:id` - Delete agent and destroy container

### Container Operations
- `POST /api/agents/:id/webhook` - Webhook for container callbacks
- Container health checks via port-specific HTTP endpoints

## Configuration

### Environment Variables
```bash
# Docker Configuration
DOCKER_HOST=unix:///var/run/docker.sock

# Bundled API Keys (for managed mode)
CLAWHQ_CLAUDE_API_KEY=sk-ant-...
CLAWHQ_OPENAI_API_KEY=sk-...
CLAWHQ_GEMINI_API_KEY=...
CLAWHQ_DEEPSEEK_API_KEY=...
CLAWHQ_GROK_API_KEY=...

# Database
DATABASE_URL=postgresql://user:pass@host:port/db
```

### Container Environment
Each container receives:
```bash
CLAWHQ_USER_ID=user123
CLAWHQ_AGENT_ID=agent456
CLAWHQ_AGENT_NAME=MyAgent
CLAWHQ_MODEL_PROVIDER=claude
CLAWHQ_MODEL=claude-sonnet-4
CLAWHQ_API_KEY=sk-ant-... # User's key or bundled key
CLAWHQ_CHANNELS=telegram,discord
CLAWHQ_WEBHOOK_TOKEN=unique-webhook-token
```

## Database Schema

### Agent Model
```prisma
model Agent {
  id            String      @id @default(cuid())
  name          String
  modelProvider String      @default("claude")
  model         String      @default("claude-sonnet-4-20250514")
  status        AgentStatus @default(STOPPED)
  containerId   String?     // Docker container ID
  containerPort Int?        // Assigned port
  
  apiKey        String?     // Encrypted user API key
  usesBundledApi Boolean    @default(false)
  channels      String[]    @default([])
  webhookToken  String?     // Container webhook token
  
  // Resource tracking
  totalMessages Int         @default(0)
  totalTokens   Int         @default(0)
  lastActiveAt  DateTime?
  lastHeartbeat DateTime?
  deployedAt    DateTime?
  
  userId        String
  user          User        @relation(fields: [userId], references: [id])
}
```

## Development Setup

### Prerequisites
- Docker Desktop installed and running
- Node.js 24+ with npm
- PostgreSQL database

### Local Development
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Building OpenClaw Image
```bash
# Build the base OpenClaw image
cd docker/
docker build -f Dockerfile.openclaw -t clawhq-openclaw:latest .
```

## Production Deployment

### Cloud Requirements
- Docker runtime (Docker Engine, containerd, etc.)
- Container orchestration platform (Railway, Fly.io, AWS ECS)
- Persistent storage for user workspaces
- Load balancing for multiple API instances

### Scaling Considerations
- Port pool management across multiple hosts
- Container placement strategies
- Resource quotas and billing tracking
- Health monitoring and alerting

### Security Best Practices
- API key encryption at rest
- Network policies for container isolation
- Regular image updates and security patches
- Audit logging for container operations
- Rate limiting and abuse prevention

## Monitoring & Observability

### Health Checks
- Container health endpoints (`/health`)
- Application-level health monitoring
- Resource usage tracking (CPU, memory, network)

### Logging
- Container orchestrator events
- Agent deployment/lifecycle logs
- Error tracking and alerting
- Performance metrics

### Metrics
- Container creation/destruction rates
- Resource utilization per user
- API response times
- Error rates and failure modes

## Troubleshooting

### Common Issues
1. **Container fails to start**: Check Docker daemon, image availability, port conflicts
2. **Health check failures**: Verify OpenClaw installation, port binding, startup time
3. **Resource exhaustion**: Monitor port pool, memory limits, container count
4. **API key issues**: Validate encryption/decryption, bundled API availability

### Debug Commands
```bash
# List all ClawHQ containers
docker ps --filter "label=clawhq.service=openclaw-agent"

# Check container logs
docker logs <container-id>

# Inspect container configuration
docker inspect <container-id>

# Check resource usage
docker stats
```

---

**Status**: ✅ Implemented - Docker container isolation per user complete
**Next**: Container orchestrator service (order 41)