import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, CheckCircle, AlertCircle, Loader2, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { apiFetch } from '../lib/api'

interface WhatsAppConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  channelId: string
}

export default function WhatsAppConfigModal({ isOpen, onClose, onSuccess, channelId }: WhatsAppConfigModalProps) {
  const [step, setStep] = useState<'instructions' | 'configure' | 'webhook' | 'success'>('instructions')
  const [accessToken, setAccessToken] = useState('')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [businessDisplayName, setBusinessDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [businessInfo, setBusinessInfo] = useState<{ displayName: string; phoneNumber: string } | null>(null)
  const [webhookInfo, setWebhookInfo] = useState<{ url: string; verifyToken: string } | null>(null)
  const [copied, setCopied] = useState<'url' | 'token' | null>(null)

  const handleConfigure = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken.trim() || !phoneNumberId.trim()) return

    setLoading(true)
    setError('')

    try {
      const response = await apiFetch('/api/whatsapp/configure', {
        method: 'POST',
        body: JSON.stringify({ 
          accessToken: accessToken.trim(), 
          phoneNumberId: phoneNumberId.trim(),
          businessDisplayName: businessDisplayName.trim() || undefined,
          channelId 
        })
      })

      setBusinessInfo(response.business)
      setWebhookInfo(response.webhookSetup)
      setStep('webhook')
    } catch (err: any) {
      setError(err.message || 'Failed to configure WhatsApp Business API')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'url' | 'token') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleWebhookComplete = () => {
    setStep('success')
  }

  const handleComplete = () => {
    onSuccess()
    onClose()
    // Reset state
    setStep('instructions')
    setAccessToken('')
    setPhoneNumberId('')
    setBusinessDisplayName('')
    setBusinessInfo(null)
    setWebhookInfo(null)
    setError('')
  }

  const handleClose = () => {
    onClose()
    // Reset state after animation
    setTimeout(() => {
      setStep('instructions')
      setAccessToken('')
      setPhoneNumberId('')
      setBusinessDisplayName('')
      setBusinessInfo(null)
      setWebhookInfo(null)
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
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-text">Setup WhatsApp Business</h3>
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
                    <p>To connect WhatsApp Business API to ClawHQ, you'll need to set up a WhatsApp Business account in Meta for Developers:</p>
                    
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li>Go to <strong>Meta for Developers Console</strong></li>
                      <li>Create an app or select existing app</li>
                      <li>Add <strong>WhatsApp Business Platform</strong> product</li>
                      <li>Get your <strong>Access Token</strong> from the app dashboard</li>
                      <li>Copy your <strong>Phone Number ID</strong> from WhatsApp settings</li>
                    </ol>
                    
                    <div className="flex items-center gap-2 mt-4">
                      <ExternalLink className="w-4 h-4 text-green-400" />
                      <a 
                        href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-green-400 hover:text-green-300 text-sm underline"
                      >
                        View WhatsApp Business API setup guide
                      </a>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep('configure')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                  >
                    I have my credentials
                  </button>
                </div>
              )}

              {step === 'configure' && (
                <form onSubmit={handleConfigure} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Access Token
                    </label>
                    <input
                      type="password"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="EAAxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                      disabled={loading}
                      autoFocus
                    />
                    <p className="text-xs text-text-muted mt-1">
                      Permanent access token from your Meta app
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Phone Number ID
                    </label>
                    <input
                      type="text"
                      value={phoneNumberId}
                      onChange={(e) => setPhoneNumberId(e.target.value)}
                      placeholder="123456789012345"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                      disabled={loading}
                    />
                    <p className="text-xs text-text-muted mt-1">
                      From WhatsApp Business Platform phone number settings
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Business Display Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={businessDisplayName}
                      onChange={(e) => setBusinessDisplayName(e.target.value)}
                      placeholder="Your Business Name"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                      disabled={loading}
                    />
                    <p className="text-xs text-text-muted mt-1">
                      How your business will appear to customers
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
                      disabled={!accessToken.trim() || !phoneNumberId.trim() || loading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Configuring...
                        </>
                      ) : (
                        'Configure WhatsApp'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {step === 'webhook' && webhookInfo && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-semibold text-text mb-2">Configure Webhook</h4>
                    <p className="text-sm text-text-secondary">
                      You need to add these webhook settings to your WhatsApp Business App in Meta for Developers:
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">Webhook URL</label>
                      <div className="flex items-center gap-2 p-3 bg-background border border-border rounded-lg">
                        <code className="flex-1 text-xs text-text font-mono break-all">{webhookInfo.url}</code>
                        <button
                          onClick={() => copyToClipboard(webhookInfo.url, 'url')}
                          className="p-1 text-text-muted hover:text-text transition-colors flex-shrink-0"
                        >
                          {copied === 'url' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">Verify Token</label>
                      <div className="flex items-center gap-2 p-3 bg-background border border-border rounded-lg">
                        <code className="flex-1 text-xs text-text font-mono break-all">{webhookInfo.verifyToken}</code>
                        <button
                          onClick={() => copyToClipboard(webhookInfo.verifyToken, 'token')}
                          className="p-1 text-text-muted hover:text-text transition-colors flex-shrink-0"
                        >
                          {copied === 'token' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-200">
                    <p className="font-medium mb-1">Setup Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Go to your app in Meta for Developers</li>
                      <li>Select WhatsApp &gt; Configuration</li>
                      <li>Add the webhook URL and verify token above</li>
                      <li>Subscribe to "messages" webhook field</li>
                      <li>Click "Verify and Save"</li>
                    </ol>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('configure')}
                      className="flex-1 px-4 py-2.5 border border-border text-text-secondary hover:text-text hover:border-border-light rounded-lg transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleWebhookComplete}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                    >
                      I've configured the webhook
                    </button>
                  </div>
                </div>
              )}

              {step === 'success' && businessInfo && (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full mx-auto">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-text mb-2">WhatsApp Connected Successfully!</h4>
                    <div className="bg-background border border-border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📱</span>
                        <div className="text-left">
                          <p className="font-medium text-text">{businessInfo.displayName}</p>
                          <p className="text-sm text-text-secondary">{businessInfo.phoneNumber}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-text-secondary bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <p>Your WhatsApp Business number is now ready! Customers can message <strong>{businessInfo.phoneNumber}</strong> and it will be routed to your paired agents.</p>
                  </div>

                  <button
                    onClick={handleComplete}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
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