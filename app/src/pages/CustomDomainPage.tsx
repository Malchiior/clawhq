import { motion } from 'framer-motion'
import { Globe, CheckCircle2, XCircle, AlertCircle, Loader2, Copy, Check, Trash2, ArrowRight, Shield, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

interface DomainConfig {
  domain: string | null
  verified: boolean
  verificationToken: string | null
  plan: string
}

interface VerifyResult {
  verified: boolean
  checks: {
    txt: { passed: boolean; record: string }
    cname: { passed: boolean; record: string; target: string }
  }
  errors?: string[]
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

export default function CustomDomainPage() {
  const [config, setConfig] = useState<DomainConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [newDomain, setNewDomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/api/domains').then(data => {
      setConfig(data)
      if (data.domain) setNewDomain(data.domain)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const setDomain = async () => {
    if (!newDomain.trim()) return
    setSaving(true)
    setError(null)
    setVerifyResult(null)
    try {
      const data = await apiFetch('/api/domains', {
        method: 'POST',
        body: JSON.stringify({ domain: newDomain.trim() }),
      })
      setConfig({ domain: data.domain, verified: false, verificationToken: data.verificationToken, plan: config?.plan || 'free' })
    } catch (e: any) {
      const msg = e?.message || 'Failed to set domain'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }
    setSaving(false)
  }

  const verifyDomain = async () => {
    setVerifying(true)
    setError(null)
    try {
      const data = await apiFetch('/api/domains/verify', { method: 'POST' })
      setVerifyResult(data)
      if (data.verified) {
        setConfig(c => c ? { ...c, verified: true } : c)
      }
    } catch (e: any) {
      setError(e?.message || 'Verification failed')
    }
    setVerifying(false)
  }

  const removeDomain = async () => {
    try {
      await apiFetch('/api/domains', { method: 'DELETE' })
      setConfig(c => c ? { ...c, domain: null, verified: false, verificationToken: null } : c)
      setNewDomain('')
      setVerifyResult(null)
    } catch { /* */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  const planAllowed = config && ['business', 'enterprise'].includes(config.plan)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" /> Custom Domain
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Serve your AI agents from your own domain — complete white-label experience.
        </p>
      </div>

      {/* Plan Gate */}
      {!planAllowed && (
        <motion.div variants={item} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300">Business Plan Required</p>
              <p className="text-xs text-amber-300/70 mt-1">
                Custom domains are available on the Business ($49/mo) and Enterprise plans.
                Upgrade to connect your own domain and remove all ClawHQ branding.
              </p>
              <button className="mt-3 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg transition-colors">
                Upgrade Plan →
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Domain Status */}
      {config?.domain && (
        <motion.div variants={item} className={`border rounded-xl p-5 ${config.verified ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config.verified ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              )}
              <div>
                <p className="text-sm font-medium text-text">{config.domain}</p>
                <p className={`text-xs ${config.verified ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {config.verified ? 'Verified & Active' : 'Pending DNS Verification'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!config.verified && (
                <button
                  onClick={verifyDomain}
                  disabled={verifying}
                  className="flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Verify DNS
                </button>
              )}
              <button
                onClick={removeDomain}
                className="flex items-center gap-1.5 text-xs bg-error/10 hover:bg-error/20 text-error px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Verification Results */}
      {verifyResult && (
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-text">DNS Verification Results</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {verifyResult.checks.txt.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-error" />
              )}
              <span className="text-sm text-text">TXT Record</span>
              <code className="text-xs text-text-muted ml-auto font-mono">{verifyResult.checks.txt.record}</code>
            </div>
            <div className="flex items-center gap-2">
              {verifyResult.checks.cname.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-error" />
              )}
              <span className="text-sm text-text">CNAME Record</span>
              <code className="text-xs text-text-muted ml-auto font-mono">{verifyResult.checks.cname.target}</code>
            </div>
          </div>
          {verifyResult.errors && verifyResult.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {verifyResult.errors.map((err, i) => (
                <p key={i} className="text-xs text-error/80">• {err}</p>
              ))}
            </div>
          )}
          {verifyResult.verified && (
            <div className="mt-2 p-3 bg-emerald-500/10 rounded-lg">
              <p className="text-sm text-emerald-400 font-medium">✓ Domain verified successfully! Your agents are now accessible at https://{config?.domain}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Set Domain Form */}
      {(!config?.domain || !config.verified) && planAllowed && (
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-text">{config?.domain ? 'Change Domain' : 'Connect Your Domain'}</h2>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Domain</label>
            <div className="flex gap-2">
              <div className="flex items-center gap-0 flex-1">
                <span className="text-sm text-text-muted bg-navy/50 border border-border border-r-0 rounded-l-lg px-3 py-2.5">https://</span>
                <input
                  type="text"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  placeholder="agents.yourdomain.com"
                  className="flex-1 bg-navy/50 border border-border rounded-r-lg px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50 placeholder:text-text-muted"
                />
              </div>
              <button
                onClick={setDomain}
                disabled={saving || !newDomain.trim()}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {config?.domain ? 'Update' : 'Connect'}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs text-error">{error}</p>
          )}
        </motion.div>
      )}

      {/* DNS Instructions */}
      {config?.domain && !config.verified && config.verificationToken && (
        <motion.div variants={item} className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-text mb-1">DNS Configuration Required</h2>
            <p className="text-xs text-text-muted">
              Add these records at your DNS provider (Cloudflare, Namecheap, GoDaddy, etc). DNS changes may take up to 48 hours to propagate, but usually happen within minutes.
            </p>
          </div>

          {/* Step 1: TXT Record */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</span>
              <h3 className="text-sm font-medium text-text">Add TXT Record (Verification)</h3>
            </div>
            <div className="bg-navy/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-[80px_1fr_auto] gap-2 items-center">
                <span className="text-xs text-text-muted">Type</span>
                <code className="text-xs font-mono text-text bg-navy/80 px-2 py-1 rounded">TXT</code>
                <div />
              </div>
              <div className="grid grid-cols-[80px_1fr_auto] gap-2 items-center">
                <span className="text-xs text-text-muted">Name</span>
                <code className="text-xs font-mono text-text bg-navy/80 px-2 py-1 rounded break-all">_clawhq-verification.{config.domain}</code>
                <button onClick={() => copyText(`_clawhq-verification.${config.domain}`, 'txt-name')} className="p-1 text-text-muted hover:text-text transition-colors">
                  {copied === 'txt-name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="grid grid-cols-[80px_1fr_auto] gap-2 items-center">
                <span className="text-xs text-text-muted">Value</span>
                <code className="text-xs font-mono text-primary bg-navy/80 px-2 py-1 rounded break-all">{config.verificationToken}</code>
                <button onClick={() => copyText(config.verificationToken!, 'txt-value')} className="p-1 text-text-muted hover:text-text transition-colors">
                  {copied === 'txt-value' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: CNAME Record */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="text-sm font-medium text-text">Add CNAME Record (Routing)</h3>
            </div>
            <div className="bg-navy/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-[80px_1fr_auto] gap-2 items-center">
                <span className="text-xs text-text-muted">Type</span>
                <code className="text-xs font-mono text-text bg-navy/80 px-2 py-1 rounded">CNAME</code>
                <div />
              </div>
              <div className="grid grid-cols-[80px_1fr_auto] gap-2 items-center">
                <span className="text-xs text-text-muted">Name</span>
                <code className="text-xs font-mono text-text bg-navy/80 px-2 py-1 rounded">{config.domain}</code>
                <button onClick={() => copyText(config.domain!, 'cname-name')} className="p-1 text-text-muted hover:text-text transition-colors">
                  {copied === 'cname-name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="grid grid-cols-[80px_1fr_auto] gap-2 items-center">
                <span className="text-xs text-text-muted">Target</span>
                <code className="text-xs font-mono text-primary bg-navy/80 px-2 py-1 rounded">custom.clawhq.dev</code>
                <button onClick={() => copyText('custom.clawhq.dev', 'cname-value')} className="p-1 text-text-muted hover:text-text transition-colors">
                  {copied === 'cname-value' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">3</span>
            <h3 className="text-sm font-medium text-text">Click "Verify DNS" above once records are set</h3>
          </div>

          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-300">
              <strong>Tip:</strong> If you're using Cloudflare, make sure the CNAME proxy is set to "DNS only" (gray cloud) initially. 
              You can enable the orange cloud (proxy) after verification completes.
            </p>
          </div>
        </motion.div>
      )}

      {/* Info about what custom domain does */}
      <motion.div variants={item} className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-text mb-3">What Custom Domains Enable</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: 'Agent Chat Widget', desc: 'Your agents served from your domain' },
            { title: 'API Endpoints', desc: 'api.yourdomain.com for webhooks' },
            { title: 'White-Label Email', desc: 'Notifications from your brand' },
            { title: 'Zero ClawHQ Branding', desc: 'Complete brand ownership' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-2.5 p-3 bg-navy/30 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">{f.title}</p>
                <p className="text-xs text-text-muted">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
