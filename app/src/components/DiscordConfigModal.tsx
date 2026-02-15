import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, CheckCircle, AlertCircle, Loader2, Copy, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

interface DiscordConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  channelId: string
}

export default function DiscordConfigModal({ isOpen, onClose, onSuccess, channelId }: DiscordConfigModalProps) {
  const [step, setStep] = useState<'instructions' | 'configure' | 'invite' | 'success'>('instructions')
  const [botToken, setBotToken] = useState('')
  const [applicationId, setApplicationId] = useState('')
  const [guildId, setGuildId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [botInfo, setBotInfo] = useState<{ id: string; username: string; discriminator: string } | null>(null)
  const [guildInfo, setGuildInfo] = useState<{ id: string; name: string } | null>(null)
  const [inviteUrl, setInviteUrl] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

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
      if (cfg?.applicationId) setApplicationId(cfg.applicationId)
      if (cfg?.guildId) setGuildId(cfg.guildId)
    } catch { /* ignore */ }
  }

  const handleConfigure = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!botToken.trim() || !applicationId.trim()) return

    setLoading(true)
    setError('')

    try {
      const response = await apiFetch('/api/discord/configure', {
        method: 'POST',
        body: JSON.stringify({
          botToken: botToken.trim(),
          applicationId: applicationId.trim(),
          guildId: guildId.trim() || undefined,
          channelId,
        }),
      })

      setBotInfo(response.bot)
      setGuildInfo(response.guild || null)
      setInviteUrl(response.inviteUrl)
      setWebhookUrl(response.webhookUrl)
      setStep('invite')
    } catch (err: any) {
      setError(err.message || 'Failed to configure Discord bot')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
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
    setApplicationId('')
    setGuildId('')
    setBotInfo(null)
    setGuildInfo(null)
    setInviteUrl('')
    setWebhookUrl('')
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
              <h3 className="text-lg font-semibold text-text">Setup Discord Bot</h3>
              <button onClick={handleClose} className="p-1 text-text-muted hover:text-text transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Step 1: Instructions */}
              {step === 'instructions' && (
                <div className="space-y-4">
                  <div className="text-sm text-text-secondary space-y-3">
                    <p>To connect a Discord bot to ClawHQ, you'll need a bot from the Discord Developer Portal:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li>Go to the <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">Discord Developer Portal</a></li>
                      <li>Click <strong>"New Application"</strong> and name it</li>
                      <li>Go to <strong>Bot</strong> → click <strong>"Add Bot"</strong></li>
                      <li>Copy the <strong>Bot Token</strong> (click "Reset Token" if needed)</li>
                      <li>Copy the <strong>Application ID</strong> from General Information</li>
                      <li>Enable <strong>Message Content Intent</strong> under Bot → Privileged Gateway Intents</li>
                    </ol>
                    <div className="flex items-center gap-2 mt-4">
                      <ExternalLink className="w-4 h-4 text-indigo-400" />
                      <a href="https://discord.com/developers/docs/getting-started" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-sm underline">
                        Discord bot setup guide
                      </a>
                    </div>
                  </div>
                  <button onClick={() => setStep('configure')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
                    I have my bot credentials
                  </button>
                </div>
              )}

              {/* Step 2: Enter credentials */}
              {step === 'configure' && (
                <form onSubmit={handleConfigure} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Bot Token *</label>
                    <input
                      type="password"
                      value={botToken}
                      onChange={e => setBotToken(e.target.value)}
                      placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4OQ..."
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      disabled={loading}
                      autoFocus
                    />
                    <p className="text-xs text-text-muted mt-1">From Developer Portal → Bot → Token</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Application ID *</label>
                    <input
                      type="text"
                      value={applicationId}
                      onChange={e => setApplicationId(e.target.value)}
                      placeholder="123456789012345678"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      disabled={loading}
                    />
                    <p className="text-xs text-text-muted mt-1">From Developer Portal → General Information → Application ID</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Server (Guild) ID <span className="text-text-muted font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={guildId}
                      onChange={e => setGuildId(e.target.value)}
                      placeholder="Right-click server → Copy Server ID"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      disabled={loading}
                    />
                    <p className="text-xs text-text-muted mt-1">Enable Developer Mode in Discord settings to copy IDs</p>
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
                    <button type="submit" disabled={!botToken.trim() || !applicationId.trim() || loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</> : 'Connect Bot'}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Invite bot + interactions URL */}
              {step === 'invite' && botInfo && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-green-400">
                      Connected as <strong>{botInfo.username}#{botInfo.discriminator}</strong>
                      {guildInfo && <> in <strong>{guildInfo.name}</strong></>}
                    </span>
                  </div>

                  {/* Invite URL */}
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Bot Invite Link</label>
                    <div className="flex items-center gap-2 p-3 bg-background border border-border rounded-lg">
                      <code className="flex-1 text-xs text-text font-mono break-all">{inviteUrl}</code>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => copyToClipboard(inviteUrl, 'invite')} className="p-1 text-text-muted hover:text-text transition-colors">
                          {copied === 'invite' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-text-muted hover:text-text transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                    <p className="text-xs text-text-muted mt-1">Use this link to add the bot to your Discord server</p>
                  </div>

                  {/* Interactions URL */}
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Interactions Endpoint URL</label>
                    <div className="flex items-center gap-2 p-3 bg-background border border-border rounded-lg">
                      <code className="flex-1 text-xs text-text font-mono break-all">{webhookUrl}</code>
                      <button onClick={() => copyToClipboard(webhookUrl, 'webhook')} className="p-1 text-text-muted hover:text-text transition-colors flex-shrink-0">
                        {copied === 'webhook' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      Paste this in Developer Portal → General Information → Interactions Endpoint URL
                    </p>
                  </div>

                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-sm text-indigo-200">
                    <p className="font-medium mb-1">Final steps:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Click the invite link above to add the bot to your server</li>
                      <li>In Developer Portal, paste the Interactions URL and save</li>
                      <li>Under Bot → Privileged Gateway Intents, enable <strong>Message Content Intent</strong></li>
                    </ol>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep('configure')} className="flex-1 px-4 py-2.5 border border-border text-text-secondary hover:text-text rounded-lg transition-colors">
                      Back
                    </button>
                    <button onClick={() => setStep('success')} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
                      I've completed the steps
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
                    <h4 className="font-semibold text-text mb-2">Discord Bot Connected!</h4>
                    <div className="bg-background border border-border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🎮</span>
                        <div className="text-left">
                          <p className="font-medium text-text">{botInfo.username}#{botInfo.discriminator}</p>
                          {guildInfo && <p className="text-sm text-text-secondary">{guildInfo.name}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-text-secondary bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
                    <p>Your Discord bot is live! Messages in your server will be routed to your paired agents.</p>
                  </div>
                  <button onClick={handleComplete} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
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
