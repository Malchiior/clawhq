import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Loader2, ExternalLink, Copy, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

interface SlackConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  channelId: string
}

export default function SlackConfigModal({ isOpen, onClose, onSuccess, channelId }: SlackConfigModalProps) {
  const [step, setStep] = useState<'instructions' | 'configure' | 'events' | 'success'>('instructions')
  const [botToken, setBotToken] = useState('')
  const [signingSecret, setSigningSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [botInfo, setBotInfo] = useState<{ username: string; userId: string } | null>(null)
  const [teamInfo, setTeamInfo] = useState<{ id: string; name: string; domain: string | null } | null>(null)
  const [eventsUrl, setEventsUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen && channelId) {
      loadExistingConfig()
    }
  }, [isOpen, channelId])

  const loadExistingConfig = async () => {
    try {
      const response = await apiFetch(`/api/channels/${channelId}`)
      const cfg = response.channel.config as any
      if (cfg?.botToken) setBotToken(cfg.botToken)
      if (cfg?.signingSecret) setSigningSecret(cfg.signingSecret)
    } catch { /* ignore */ }
  }

  const handleConfigure = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!botToken.trim() || !signingSecret.trim()) return

    setLoading(true)
    setError('')

    try {
      const response = await apiFetch('/api/slack/configure', {
        method: 'POST',
        body: JSON.stringify({
          botToken: botToken.trim(),
          signingSecret: signingSecret.trim(),
          channelId,
        }),
      })

      setBotInfo(response.bot)
      setTeamInfo(response.team)
      setEventsUrl(response.eventsUrl)
      setStep('events')
    } catch (err: any) {
      setError(err.message || 'Failed to configure Slack app')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleComplete = () => {
    onSuccess()
    onClose()
    reset()
  }

  const reset = () => {
    setStep('instructions')
    setBotToken('')
    setSigningSecret('')
    setBotInfo(null)
    setTeamInfo(null)
    setEventsUrl('')
    setError('')
  }

  const handleClose = () => {
    onClose()
    setTimeout(reset, 300)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-text">Setup Slack App</h3>
              <button onClick={handleClose} className="p-1 text-text-muted hover:text-text transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Step 1: Instructions */}
              {step === 'instructions' && (
                <div className="space-y-4">
                  <div className="text-sm text-text-secondary space-y-3">
                    <p>To connect a Slack app to ClawHQ:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">api.slack.com/apps</a> → <strong>Create New App</strong></li>
                      <li>Choose <strong>From scratch</strong>, name it, select workspace</li>
                      <li>Under <strong>OAuth & Permissions</strong>, add scopes:
                        <div className="flex flex-wrap gap-1 mt-1 ml-4">
                          {['chat:write', 'channels:read', 'channels:history', 'app_mentions:read', 'im:read', 'im:history'].map(s => (
                            <code key={s} className="bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded text-xs">{s}</code>
                          ))}
                        </div>
                      </li>
                      <li>Click <strong>Install to Workspace</strong></li>
                      <li>Copy <strong>Bot User OAuth Token</strong> (<code className="text-xs">xoxb-...</code>)</li>
                      <li>Under <strong>Basic Information</strong>, copy <strong>Signing Secret</strong></li>
                    </ol>
                    <div className="flex items-center gap-2 mt-4">
                      <ExternalLink className="w-4 h-4 text-purple-400" />
                      <a href="https://api.slack.com/start/quickstart" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-sm underline">
                        Slack app quickstart guide
                      </a>
                    </div>
                  </div>
                  <button onClick={() => setStep('configure')} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
                    I have my credentials
                  </button>
                </div>
              )}

              {/* Step 2: Enter credentials */}
              {step === 'configure' && (
                <form onSubmit={handleConfigure} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Bot User OAuth Token *</label>
                    <input
                      type="password"
                      value={botToken}
                      onChange={e => setBotToken(e.target.value)}
                      placeholder="xoxb-..."
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                      disabled={loading}
                      autoFocus
                    />
                    <p className="text-xs text-text-muted mt-1">OAuth & Permissions → Bot User OAuth Token</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Signing Secret *</label>
                    <input
                      type="password"
                      value={signingSecret}
                      onChange={e => setSigningSecret(e.target.value)}
                      placeholder="Your app's signing secret"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                      disabled={loading}
                    />
                    <p className="text-xs text-text-muted mt-1">Basic Information → App Credentials → Signing Secret</p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep('instructions')} className="flex-1 px-4 py-2.5 border border-border text-text-secondary hover:text-text rounded-lg transition-colors" disabled={loading}>
                      Back
                    </button>
                    <button type="submit" disabled={!botToken.trim() || !signingSecret.trim() || loading} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</> : 'Connect App'}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Event subscriptions setup */}
              {step === 'events' && botInfo && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-green-400">
                      Connected as <strong>{botInfo.username}</strong> in <strong>{teamInfo?.name}</strong>
                    </span>
                  </div>

                  {/* Events URL */}
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Request URL for Event Subscriptions</label>
                    <div className="flex items-center gap-2 p-3 bg-background border border-border rounded-lg">
                      <code className="flex-1 text-xs text-text font-mono break-all">{eventsUrl}</code>
                      <button onClick={() => copyToClipboard(eventsUrl)} className="p-1 text-text-muted hover:text-text transition-colors flex-shrink-0">
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-sm text-purple-200">
                    <p className="font-medium mb-1">Set up Event Subscriptions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Go to your Slack app → <strong>Event Subscriptions</strong></li>
                      <li>Toggle <strong>Enable Events</strong> to On</li>
                      <li>Paste the Request URL above (Slack will verify it)</li>
                      <li>Under <strong>Subscribe to bot events</strong>, add:
                        <div className="flex flex-wrap gap-1 mt-1 ml-4">
                          {['message.channels', 'message.im', 'app_mention'].map(e => (
                            <code key={e} className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded text-xs">{e}</code>
                          ))}
                        </div>
                      </li>
                      <li>Click <strong>Save Changes</strong></li>
                      <li>Invite the bot to channels: <code className="bg-purple-500/20 px-1 rounded text-xs">/invite @YourBot</code></li>
                    </ol>
                  </div>

                  {teamInfo?.domain && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <ExternalLink className="w-4 h-4" />
                      <a href={`https://${teamInfo.domain}.slack.com`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                        Open {teamInfo.name} workspace
                      </a>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setStep('configure')} className="flex-1 px-4 py-2.5 border border-border text-text-secondary hover:text-text rounded-lg transition-colors">
                      Back
                    </button>
                    <button onClick={() => setStep('success')} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
                      I've configured events
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Success */}
              {step === 'success' && botInfo && (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full mx-auto">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text mb-2">Slack App Connected!</h4>
                    <div className="bg-background border border-border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💬</span>
                        <div className="text-left">
                          <p className="font-medium text-text">{botInfo.username}</p>
                          <p className="text-sm text-text-secondary">{teamInfo?.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-text-secondary bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                    <p>Your Slack app is live! Messages in subscribed channels will be routed to your paired agents. Use <code className="bg-purple-500/20 px-1 rounded text-xs">/invite @{botInfo.username}</code> to add the bot to channels.</p>
                  </div>
                  <button onClick={handleComplete} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
                    Complete Setup
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
