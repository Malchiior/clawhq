import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

interface RelaySetupProps {
  agentId: string
  agentName: string
}

interface RelayStatus {
  connected: boolean
  connectedAt?: string
  lastPing?: string
}

export default function RelaySetup({ agentId, agentName }: RelaySetupProps) {
  const [status, setStatus] = useState<RelayStatus>({ connected: false })
  const [token, setToken] = useState<string | null>(null)
  const [wsUrl, setWsUrl] = useState<string>('')
  const [copied, setCopied] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 10_000)
    return () => clearInterval(interval)
  }, [agentId])

  async function fetchStatus() {
    try {
      const data = await apiFetch(`/api/relay/status/${agentId}`)
      setStatus(data)
    } catch { /* ignore */ }
  }

  async function generateToken() {
    setLoading(true)
    try {
      const data = await apiFetch('/api/relay/token', { method: 'POST' })
      setToken(data.token)
      setWsUrl(data.wsUrl)
    } catch (err: any) {
      console.error('Failed to generate relay token:', err)
    }
    setLoading(false)
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  // Connect command for future CLI integration
  void (token
    ? `openclaw gateway config.apply --set relay.url="${wsUrl}" --set relay.token="${token}" --set relay.agentId="${agentId}"`
    : '')

  const configSnippet = token
    ? `# Add to your OpenClaw config.yaml
relay:
  enabled: true
  url: "${wsUrl}"
  token: "${token}"
  agentId: "${agentId}"`
    : ''

  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🔌</div>
          <div>
            <h3 className="text-lg font-semibold text-white">Local Connector</h3>
            <p className="text-sm text-gray-400">
              Connect your local OpenClaw to ClawHQ — no port forwarding needed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            status.connected 
              ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' 
              : 'bg-gray-500'
          }`} />
          <span className={`text-sm font-medium ${
            status.connected ? 'text-green-400' : 'text-gray-400'
          }`}>
            {status.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Connected state */}
      {status.connected && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Agent "{agentName}" is connected via relay</span>
          </div>
          <div className="text-sm text-gray-400 space-y-1">
            <p>Connected: {status.connectedAt ? new Date(status.connectedAt).toLocaleString() : 'Unknown'}</p>
            <p>Last ping: {status.lastPing ? new Date(status.lastPing).toLocaleString() : 'Unknown'}</p>
          </div>
          <p className="text-sm text-green-300/70 mt-2">
            Chat messages from the dashboard will be routed directly to your local agent.
          </p>
        </div>
      )}

      {/* Setup instructions */}
      {!status.connected && (
        <>
          {/* Step 1: Generate token */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span className="text-white font-medium">Generate a connection token</span>
            </div>
            {!token ? (
              <button
                onClick={generateToken}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? 'Generating...' : 'Generate Relay Token'}
              </button>
            ) : (
              <div className="bg-[#0d0d1a] rounded-lg p-3 flex items-center justify-between">
                <code className="text-green-400 text-xs font-mono truncate flex-1">{token.substring(0, 40)}...</code>
                <button
                  onClick={() => copyToClipboard(token, 'token')}
                  className="ml-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  {copied === 'token' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Config */}
          {token && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span className="text-white font-medium">Add to your OpenClaw config</span>
                </div>
                <div className="bg-[#0d0d1a] rounded-lg p-4 relative">
                  <pre className="text-sm text-gray-300 font-mono whitespace-pre overflow-x-auto">{configSnippet}</pre>
                  <button
                    onClick={() => copyToClipboard(configSnippet, 'config')}
                    className="absolute top-2 right-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                  >
                    {copied === 'config' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span className="text-white font-medium">Restart OpenClaw</span>
                </div>
                <div className="bg-[#0d0d1a] rounded-lg p-3">
                  <code className="text-yellow-400 text-sm font-mono">openclaw gateway restart</code>
                </div>
                <p className="text-sm text-gray-400">
                  Your agent will automatically connect to ClawHQ. You'll see the green dot appear above when it's ready.
                </p>
              </div>
            </>
          )}

          {/* How it works */}
          <div className="border-t border-[#2a2a4a] pt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">How it works</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { icon: '💻', title: 'Your Machine', desc: 'OpenClaw runs locally with your API keys' },
                { icon: '🔒', title: 'Secure Tunnel', desc: 'Encrypted WebSocket — no ports to open' },
                { icon: '🌐', title: 'ClawHQ Dashboard', desc: 'Chat with your agent from anywhere' },
              ].map((item) => (
                <div key={item.title} className="bg-[#0d0d1a] rounded-lg p-3 text-center">
                  <div className="text-xl mb-1">{item.icon}</div>
                  <div className="text-sm font-medium text-white">{item.title}</div>
                  <div className="text-xs text-gray-400 mt-1">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
