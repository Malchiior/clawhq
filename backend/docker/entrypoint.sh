#!/bin/bash
set -e

# OpenClaw Agent Container Entrypoint
# Initializes user-specific OpenClaw agent

# Environment variables (set by container orchestrator)
USER_ID=${CLAWHQ_USER_ID:-"unknown"}
AGENT_NAME=${CLAWHQ_AGENT_NAME:-"Agent"}
MODEL_PROVIDER=${CLAWHQ_MODEL_PROVIDER:-"claude"}
MODEL=${CLAWHQ_MODEL:-"claude-sonnet-4"}
API_KEY=${CLAWHQ_API_KEY:-""}
CHANNELS=${CLAWHQ_CHANNELS:-""}
WEBHOOK_TOKEN=${CLAWHQ_WEBHOOK_TOKEN:-""}

echo "🚀 Starting ClawHQ Agent for User: $USER_ID"
echo "📝 Agent Name: $AGENT_NAME"
echo "🧠 Model: $MODEL_PROVIDER/$MODEL"

# Initialize workspace if not exists
if [ ! -f "/app/workspace/.openclaw/config.json" ]; then
    echo "🔧 Initializing OpenClaw workspace..."
    
    # Create basic config
    cat > /app/workspace/.openclaw/config.json << EOF
{
  "ai": {
    "$MODEL_PROVIDER": {
      "apiKey": "$API_KEY"
    },
    "defaultModel": "$MODEL_PROVIDER/$MODEL"
  },
  "gateway": {
    "port": 18789,
    "webhooks": {
      "clawhq": {
        "token": "$WEBHOOK_TOKEN",
        "path": "/hooks/clawhq"
      }
    }
  },
  "channels": {},
  "workspace": "/app/workspace"
}
EOF

    # Create SOUL.md with user's agent identity
    cat > /app/workspace/SOUL.md << EOF
# SOUL.md - Who You Are

## Core Identity
You're **$AGENT_NAME** - a helpful AI assistant deployed via ClawHQ.

## Philosophy
- Be helpful, harmless, and honest
- Respect user privacy and data
- Provide accurate information when possible
- Admit when you don't know something

## Voice & Tone
- Friendly and professional
- Clear and concise communication
- Appropriate for business use

## Boundaries
- Don't access external systems without permission
- Keep conversations focused and productive
- Respect rate limits and resource constraints
EOF

    # Create basic workspace structure
    mkdir -p /app/workspace/memory
    touch /app/workspace/AGENTS.md
    touch /app/workspace/TOOLS.md
    
    echo "✅ Workspace initialized"
fi

# Configure channels if provided
if [ -n "$CHANNELS" ]; then
    echo "🔗 Configuring channels: $CHANNELS"
    # Channel configuration would be handled by the orchestrator
    # via API calls to update config after container start
fi

# Start OpenClaw Gateway
echo "🎯 Starting OpenClaw Gateway..."
exec "$@"