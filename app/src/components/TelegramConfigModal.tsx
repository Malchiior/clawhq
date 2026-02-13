import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { apiFetch } from '../lib/api'

interface TelegramConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  channelId: string
}

export default function TelegramConfigModal({ isOpen, onClose, onSuccess, channelId }: TelegramConfigModalProps) {
  const [step, setStep] = useState<'instructions' | 'configure' | 'success'>('instructions')
  const [botToken, setBotToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [botInfo, setBotInfo] = useState<{ username: string; name: string } | null>(null)

  const handleConfigure = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!botToken.trim()) return

    setLoading(true)
    setError('')

    try {
      const response = await apiFetch('/api/telegram/configure', {
        method: 'POST',
        body: JSON.stringify({ botToken: botToken.trim(), channelId })
      })

      setBotInfo(response.bot)
      setStep('success')
    } catch (err: any) {
      setError(err.message || 'Failed to configure Telegram bot')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    onSuccess()
    onClose()
    // Reset state
    setStep('instructions')
    setBotToken('')
    setBotInfo(null)
    setError('')
  }

  const handleClose = () => {
    onClose()
    // Reset state after animation
    setTimeout(() => {
      setStep('instructions')
      setBotToken('')
      setBotInfo(null)
      setError('')
    }, 300)
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
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-text">Setup Telegram Bot</h3>
              <button
                onClick={handleClose}
                className="p-1 text-text-muted hover:text-text transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {step === 'instructions' && (
                <div className="space-y-4">
                  <div className="text-sm text-text-secondary space-y-3">
                    <p>To connect a Telegram bot to ClawHQ, you'll need to create a bot and get its token:</p>
                    
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li>Open Telegram and search for <strong>@BotFather</strong></li>
                      <li>Send <code className="bg-accent/10 text-accent px-1 py-0.5 rounded text-xs">/newbot</code> and follow the instructions</li>
                      <li>Choose a name and username for your bot</li>
                      <li>Copy the bot token (looks like <code className="text-xs">123456789:ABCdefGhI...</code>)</li>
                    </ol>
                    
                    <div className="flex items-center gap-2 mt-4">
                      <ExternalLink className="w-4 h-4 text-blue-400" />
                      <a 
                        href="https://core.telegram.org/bots/tutorial" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm underline"
                      >
                        Need help? View official Telegram bot tutorial
                      </a>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep('configure')}
                    className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                  >
                    I have my bot token
                  </button>
                </div>
              )}

              {step === 'configure' && (
                <form onSubmit={handleConfigure} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Bot Token
                    </label>
                    <input
                      type="text"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder="123456789:ABCdefGhI..."
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      disabled={loading}
                      autoFocus
                    />
                    <p className="text-xs text-text-muted mt-1">
                      Paste the token you got from @BotFather
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('instructions')}
                      className="flex-1 px-4 py-2.5 border border-border text-text-secondary hover:text-text hover:border-border-light rounded-lg transition-colors"
                      disabled={loading}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={!botToken.trim() || loading}
                      className="flex-1 bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Configuring...
                        </>
                      ) : (
                        'Configure Bot'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {step === 'success' && botInfo && (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full mx-auto">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-text mb-2">Bot Connected Successfully!</h4>
                    <div className="bg-background border border-border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">✈️</span>
                        <div className="text-left">
                          <p className="font-medium text-text">@{botInfo.username}</p>
                          <p className="text-sm text-text-secondary">{botInfo.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-text-secondary bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p>Your bot is now ready! Users can message <strong>@{botInfo.username}</strong> and it will be routed to your paired agents.</p>
                  </div>

                  <button
                    onClick={handleComplete}
                    className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                  >
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