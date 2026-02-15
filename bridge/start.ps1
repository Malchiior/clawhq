# ClawHQ Bridge — Start Script
# Connects your local OpenClaw to ClawHQ's web dashboard

$env:CLAWHQ_URL = "https://clawhq-api-production-f6d7.up.railway.app"
$env:BRIDGE_TOKEN = ""   # Your ClawHQ JWT access token (from browser devtools or login API)
$env:AGENT_ID = ""       # Your agent ID from ClawHQ dashboard
$env:OPENCLAW_PORT = "18789"
$env:OPENCLAW_TOKEN = "" # Optional: OpenClaw gateway token

if (-not $env:BRIDGE_TOKEN) {
    Write-Host "ERROR: Set BRIDGE_TOKEN before running." -ForegroundColor Red
    Write-Host "Get your JWT token from ClawHQ (browser devtools > Application > Local Storage > accessToken)"
    exit 1
}

if (-not $env:AGENT_ID) {
    Write-Host "ERROR: Set AGENT_ID before running." -ForegroundColor Red
    Write-Host "Find your agent ID in the ClawHQ dashboard URL: /agents/<AGENT_ID>"
    exit 1
}

Write-Host "Starting ClawHQ Bridge..." -ForegroundColor Cyan
node index.js
