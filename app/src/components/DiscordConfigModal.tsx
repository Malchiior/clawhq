import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, CheckCircle, AlertCircle, Loader2, Copy } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

interface DiscordConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  channelId: string
}

interface DiscordConfig {
  botToken?: string
  applicationId?: string
  guildId?: string
  isConfigured?: boolean
  botName?: string
  status?: string
}

export default function DiscordConfigModal({ isOpen, onClose, onSuccess, channelId }: DiscordConfigModalProps) {
  const [, setConfig] = useState<DiscordConfig>({})
  const [botToken, setBotToken] = useState('')
  const [applicationId, setApplicationId] = useState('')
  const [guildId, setGuildId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; botInfo?: any; guildInfo?: any } | null>(null)

  useEffect(() => {
    if (isOpen && channelId) {
      loadConfig()
    }
  }, [isOpen, channelId])

  const loadConfig = async () => {
    try {
      const response = await apiFetch(`/api/channels/${channelId}`)
      const channelConfig = response.channel.config as DiscordConfig
      setConfig(channelConfig)
      setBotToken(channelConfig.botToken || '')
      setApplicationId(channelConfig.applicationId || '')
      setGuildId(channelConfig.guildId || '')
    } catch (err) {
      setError('Failed to load Discord configuration')
    }
  }

  const testConnection = async () => {
    if (!botToken || !applicationId) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')
    setTestResult(null)

    try {
      const response = await apiFetch(`/api/discord/test`, {
        method: 'POST',
        body: JSON.stringify({
          botToken,
          applicationId,
          guildId: guildId || undefined
        })
      })

      setTestResult(response)
      setStep(2)
    } catch (err: any) {
      const message = err.message || 'Connection failed'
      setTestResult({ success: false, message })
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    setLoading(true)
    setError('')

    try {
      await apiFetch(`/api/channels/${channelId}`, {
        method: 'PUT',
        body: JSON.stringify({
          config: {
            botToken,
            applicationId,
            guildId: guildId || undefined,
            isConfigured: true,
            botName: testResult?.botInfo?.username ? `${testResult.botInfo.username}#${testResult.botInfo.discriminator}` : 'Discord Bot'
          }
        })
      })

      onSuccess()
      onClose()
      reset()
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setBotToken('')
    setApplicationId('')
    setGuildId('')
    setError('')
    setStep(1)
    setTestResult(null)
    setConfig({})
  }

  const handleClose = () => {
    onClose()
    reset()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const inviteUrl = applicationId ? `https://discord.com/api/oauth2/authorize?client_id=${applicationId}&permissions=8&scope=bot%20applications.commands` : ''

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-text flex items-center gap-2">
                  🎮 Discord Bot Configuration
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  Connect your Discord bot to start receiving messages from your Discord server.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            <div className="space-y-6">
              {step === 1 && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Setup Instructions</h3>
                    <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                      <li>Go to the <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">Discord Developer Portal</a></li>
                      <li>Create a new application or select an existing one</li>
                      <li>Go to the "Bot" section and create a bot (if not already created)</li>
                      <li>Copy the bot token and application ID</li>
                      <li>Optional: Copy your Discord server (guild) ID for server-specific setup</li>
                    </ol>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="botToken" className="block text-sm font-medium text-text mb-2">
                        Bot Token *
                      </label>
                      <input
                        id="botToken"
                        type="password"
                        placeholder="Your Discord bot token"
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text"
                      />
                      <p className="text-xs text-text-muted mt-1">
                        Found in Discord Developer Portal → Your App → Bot → Token
                      </p>
                    </div>

                    <div>
                      <label htmlFor="applicationId" className="block text-sm font-medium text-text mb-2">
                        Application ID *
                      </label>
                      <input
                        id="applicationId"
                        placeholder="Your Discord application ID"
                        value={applicationId}
                        onChange={(e) => setApplicationId(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text"
                      />
                      <p className="text-xs text-text-muted mt-1">
                        Found in Discord Developer Portal → Your App → General Information → Application ID
                      </p>
                    </div>

                    <div>
                      <label htmlFor="guildId" className="block text-sm font-medium text-text mb-2">
                        Server (Guild) ID (Optional)
                      </label>
                      <input
                        id="guildId"
                        placeholder="Your Discord server ID"
                        value={guildId}
                        onChange={(e) => setGuildId(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text"
                      />
                      <p className="text-xs text-text-muted mt-1">
                        Right-click your server icon → Copy Server ID (Developer Mode must be enabled)
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  {testResult && !testResult.success && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{testResult.message}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleClose}
                      disabled={loading}
                      className="px-4 py-2 text-text-secondary hover:text-text transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={testConnection}
                      disabled={loading || !botToken || !applicationId}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {loading ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                </>
              )}

              {step === 2 && testResult?.success && (
                <>
                  <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">
                      Connected successfully as {testResult.botInfo?.username}#{testResult.botInfo?.discriminator}
                      {testResult.guildInfo && ` in ${testResult.guildInfo.name}`}
                    </span>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-3">Add Bot to Your Server</h3>
                    <p className="text-sm text-blue-800 mb-3">
                      Use this invite link to add your bot to your Discord server:
                    </p>
                    {inviteUrl && (
                      <div className="bg-white border border-blue-300 rounded p-2 flex items-center justify-between">
                        <code className="text-xs text-blue-900 break-all mr-2">{inviteUrl}</code>
                        <div className="flex gap-1">
                          <button
                            onClick={() => copyToClipboard(inviteUrl)}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <a
                            href={inviteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-medium text-yellow-900 mb-2">Important Notes</h3>
                    <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                      <li>Make sure your bot has appropriate permissions in your Discord server</li>
                      <li>The bot needs "Send Messages" and "Read Message History" permissions at minimum</li>
                      <li>You can restrict the bot to specific channels using Discord's permission system</li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="px-4 py-2 text-text-secondary hover:text-text transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={saveConfiguration}
                      disabled={loading}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {loading ? 'Saving...' : 'Complete Setup'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}