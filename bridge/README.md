# ClawHQ Bridge

Connects your local OpenClaw instance to ClawHQ's web dashboard. Messages sent in the ClawHQ chat UI are relayed to your local OpenClaw, and responses are sent back to the web.

## Setup

```bash
cd clawhq/bridge
npm install
```

## Configuration

Set these environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `BRIDGE_TOKEN` | ✅ | Your ClawHQ JWT access token |
| `AGENT_ID` | ✅ | Your agent ID from ClawHQ dashboard |
| `CLAWHQ_URL` | No | ClawHQ backend URL (default: production) |
| `OPENCLAW_PORT` | No | Local OpenClaw port (default: 18789) |
| `OPENCLAW_TOKEN` | No | OpenClaw gateway auth token |

### Getting your BRIDGE_TOKEN

Use your ClawHQ JWT access token. You can find it in:
- Browser DevTools → Application → Local Storage → `accessToken`
- Or from the ClawHQ login API response

### Getting your AGENT_ID

Find it in your ClawHQ dashboard URL: `https://clawhq.dev/agents/<AGENT_ID>`

## Run

```bash
# Set env vars first, then:
npm start

# Or on Windows:
# Edit start.ps1 with your tokens, then:
powershell -File start.ps1
```

## How it works

1. Bridge connects to ClawHQ backend via Socket.io (outbound connection — no port forwarding needed)
2. Authenticates with your JWT token
3. Registers for your specific agent
4. When someone chats with your agent on ClawHQ web, the message is relayed to your local OpenClaw
5. OpenClaw's response is sent back to the web UI

## Requirements

- Node.js 18+
- OpenClaw running locally with chat completions enabled:
  ```yaml
  gateway:
    http:
      endpoints:
        chatCompletions:
          enabled: true
  ```
