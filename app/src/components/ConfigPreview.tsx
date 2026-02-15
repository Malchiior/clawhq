import { useState, useEffect, useCallback } from 'react'
import { FileCode2, Download, Copy, Check, RefreshCw, AlertTriangle, Loader2, Play, Monitor, Cloud, Globe } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface ConfigPreviewProps {
  agentId: string
  deployMode: string
}

export default function ConfigPreview({ agentId, deployMode }: ConfigPreviewProps) {
  const [config, setConfig] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null)
  const [generatedAt, setGeneratedAt] = useState('')

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const format = deployMode === 'LOCAL' ? 'snippet' : 'yaml'
      const data = await apiFetch(`/api/agents/${agentId}/config?format=${format}`)
      setConfig(data.config)
      setValidation(data.validation || null)
      setGeneratedAt(data.generatedAt || '')
    } catch {
      setConfig('# Failed to generate config')
    } finally {
      setLoading(false)
    }
  }, [agentId, deployMode])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const copyConfig = async () => {
    await navigator.clipboard.writeText(config)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadConfig = () => {
    const blob = new Blob([config], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'config.yaml'
    a.click()
    URL.revokeObjectURL(url)
  }

  const applyConfig = async () => {
    setApplying(true)
    setApplyResult(null)
    try {
      const data = await apiFetch(`/api/agents/${agentId}/config/apply`, { method: 'POST' })
      setApplyResult({ ok: true, msg: data.message })
    } catch (err: unknown) {
      setApplyResult({ ok: false, msg: err instanceof Error ? err.message : 'Apply failed' })
    } finally {
      setApplying(false)
    }
  }

  const modeInfo = {
    CLOUD: { icon: Cloud, label: 'Cloud Container Config', desc: 'Full config for your Docker-deployed agent. Changes are applied on restart.' },
    LOCAL: { icon: Monitor, label: 'Local Connector Snippet', desc: 'Paste this into your existing OpenClaw config.yaml to connect to ClawHQ.' },
    DASHBOARD: { icon: Globe, label: 'Dashboard Agent Config', desc: 'Internal config for the in-browser agent. No file download needed.' },
  }[deployMode] || { icon: FileCode2, label: 'Agent Config', desc: '' }

  const ModeIcon = modeInfo.icon

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ModeIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">{modeInfo.label}</h3>
            <p className="text-xs text-text-muted">{modeInfo.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchConfig}
            className="p-2 rounded-lg border border-border text-text-muted hover:text-text hover:border-border-light transition-colors"
            title="Regenerate"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={copyConfig}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text hover:border-border-light transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {deployMode !== 'DASHBOARD' && (
            <button
              onClick={downloadConfig}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text hover:border-border-light transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          )}
          {deployMode === 'CLOUD' && (
            <button
              onClick={applyConfig}
              disabled={applying}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Apply & Restart
            </button>
          )}
        </div>
      </div>

      {/* Validation warnings */}
      {validation && !validation.valid && (
        <div className="flex items-start gap-2 p-3 bg-accent/10 border border-accent/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-accent">Config Validation Issues</p>
            <ul className="text-xs text-text-muted mt-1 space-y-0.5">
              {validation.errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Apply result */}
      {applyResult && (
        <div className={`flex items-center gap-2 p-3 rounded-lg border ${
          applyResult.ok ? 'bg-success/10 border-success/20' : 'bg-error/10 border-error/20'
        }`}>
          {applyResult.ok ? <Check className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-error" />}
          <p className={`text-sm ${applyResult.ok ? 'text-success' : 'text-error'}`}>{applyResult.msg}</p>
        </div>
      )}

      {/* Config YAML */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : (
        <div className="relative">
          <pre className="bg-navy/50 border border-border rounded-xl p-4 text-xs font-mono text-text-secondary overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed selection:bg-primary/30">
            {config.split('\n').map((line, i) => {
              // Syntax highlighting
              let className = ''
              const trimmed = line.trimStart()
              if (trimmed.startsWith('#')) className = 'text-text-muted'
              else if (trimmed.match(/^[a-zA-Z_]+:/)) className = 'text-primary'
              else if (trimmed.startsWith('- ')) className = 'text-accent'
              else if (trimmed.includes('"')) className = 'text-success'

              return (
                <div key={i} className="flex hover:bg-white/[0.02] -mx-4 px-4">
                  <span className="w-8 shrink-0 text-right mr-4 text-text-muted/40 select-none">{i + 1}</span>
                  <span className={className}>{line}</span>
                </div>
              )
            })}
          </pre>
          {generatedAt && (
            <p className="text-[10px] text-text-muted/50 mt-2 text-right">
              Generated {new Date(generatedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Contextual help */}
      {deployMode === 'LOCAL' && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-300 mb-2">How to use this snippet</h4>
          <ol className="text-xs text-text-muted space-y-1.5 list-decimal list-inside">
            <li>Copy the snippet above</li>
            <li>Open your local OpenClaw <code className="text-blue-300 bg-blue-500/10 px-1 py-0.5 rounded">config.yaml</code></li>
            <li>Paste it at the bottom of the file</li>
            <li>Restart OpenClaw: <code className="text-blue-300 bg-blue-500/10 px-1 py-0.5 rounded">openclaw gateway restart</code></li>
            <li>Your agent will appear as online in the ClawHQ dashboard</li>
          </ol>
        </div>
      )}

      {deployMode === 'CLOUD' && (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-purple-300 mb-2">About this config</h4>
          <p className="text-xs text-text-muted leading-relaxed">
            This is the actual OpenClaw <code className="text-purple-300 bg-purple-500/10 px-1 py-0.5 rounded">config.yaml</code> running 
            inside your agent's Docker container. When you change settings in the Config tab and click <strong>Apply & Restart</strong>, 
            this file is regenerated and the container is restarted with the new configuration.
          </p>
        </div>
      )}
    </div>
  )
}
