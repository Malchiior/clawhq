import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Key, Plus, TestTube, Trash2, Eye, EyeOff, CheckCircle, XCircle, Shield, Zap } from 'lucide-react'
import { apiFetch } from '../lib/api'
import BundledApiDashboard from '../components/BundledApiDashboard'

interface ApiKey {
  id: string
  provider: string
  name?: string
  isActive: boolean
  lastUsed?: string
  createdAt: string
  updatedAt: string
}

const PROVIDERS = [
  { id: 'OPENAI', name: 'OpenAI', description: 'GPT-4, GPT-4o, GPT-4o Mini', placeholder: 'sk-...' },
  { id: 'ANTHROPIC', name: 'Anthropic', description: 'Claude Sonnet, Haiku, Opus', placeholder: 'sk-ant-...' },
  { id: 'GOOGLE', name: 'Google AI', description: 'Gemini Pro, Gemini Flash', placeholder: 'AIza...' },
  { id: 'DEEPSEEK', name: 'DeepSeek', description: 'DeepSeek V2, V2.5', placeholder: 'sk-...' },
  { id: 'GROK', name: 'Grok (xAI)', description: 'Grok-1, Grok-1.5', placeholder: 'xai-...' },
]

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [apiMode, setApiMode] = useState<'bundled' | 'byok'>('bundled')
  const [showAddKey, setShowAddKey] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [testingKey, setTestingKey] = useState('')
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchApiKeys()
    fetchUserSettings()
  }, [])

  const fetchApiKeys = async () => {
    try {
      const data = await apiFetch('/api/api-keys')
      setApiKeys(data.apiKeys)
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    }
  }

  const fetchUserSettings = async () => {
    try {
      const data = await apiFetch('/api/users/me')
      setApiMode(data.user.apiMode || 'bundled')
    } catch (error) {
      console.error('Failed to fetch user settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleModeChange = async (mode: 'bundled' | 'byok') => {
    setActionLoading('mode-change')
    try {
      await apiFetch('/api/api-keys/mode', {
        method: 'POST',
        body: JSON.stringify({ mode })
      })
      setApiMode(mode)
    } catch (error) {
      console.error('Failed to update API mode:', error)
    }
    setActionLoading(null)
  }

  const handleAddKey = async () => {
    if (!selectedProvider || !keyInput) return
    
    setActionLoading('add-key')
    try {
      await apiFetch('/api/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          provider: selectedProvider,
          key: keyInput,
          name: nameInput || PROVIDERS.find(p => p.id === selectedProvider)?.name
        })
      })
      
      await fetchApiKeys()
      setShowAddKey(false)
      setSelectedProvider('')
      setKeyInput('')
      setNameInput('')
    } catch (error) {
      console.error('Failed to add API key:', error)
    }
    setActionLoading(null)
  }

  const handleTestKey = async (provider: string, key: string) => {
    setTestingKey(key)
    try {
      const response = await apiFetch(`/api/api-keys/test/${provider}`, {
        method: 'POST',
        body: JSON.stringify({ key })
      })
      
      if (response.success) {
        alert('✅ API key is valid!')
      } else {
        alert(`❌ ${response.message}`)
      }
    } catch (error) {
      alert('❌ Failed to test API key')
      console.error('Failed to test API key:', error)
    }
    setTestingKey('')
  }

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return
    
    setActionLoading(`delete-${id}`)
    try {
      await apiFetch(`/api/api-keys/${id}`, { method: 'DELETE' })
      await fetchApiKeys()
    } catch (error) {
      console.error('Failed to delete API key:', error)
    }
    setActionLoading(null)
  }

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">API Keys</h1>
            <p className="text-sm text-text-secondary">Manage your AI model API keys</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddKey(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add API Key
        </button>
      </div>

      {/* API Mode Toggle */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          API Mode
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => handleModeChange('bundled')}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              apiMode === 'bundled'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-border-light'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-text">Bundled API</h4>
              {apiMode === 'bundled' && <CheckCircle className="w-5 h-5 text-primary ml-auto" />}
            </div>
            <p className="text-sm text-text-secondary">
              Use our managed API with one simple bill. No key setup required.
            </p>
          </div>
          <div
            onClick={() => handleModeChange('byok')}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              apiMode === 'byok'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-border-light'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Key className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-text">Bring Your Own Keys</h4>
              {apiMode === 'byok' && <CheckCircle className="w-5 h-5 text-primary ml-auto" />}
            </div>
            <p className="text-sm text-text-secondary">
              Use your own API keys for maximum control and potentially lower costs.
            </p>
          </div>
        </div>
      </div>

      {/* Bundled API Dashboard */}
      {apiMode === 'bundled' && <BundledApiDashboard />}

      {/* API Keys List */}
      {apiMode === 'byok' && (
        <div className="bg-card border border-border rounded-xl">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-text">Your API Keys</h3>
            <p className="text-sm text-text-secondary mt-1">
              {apiKeys.length === 0 
                ? 'No API keys added yet. Add your first key to get started.'
                : `${apiKeys.length} API key${apiKeys.length !== 1 ? 's' : ''} configured`}
            </p>
          </div>
          
          <div className="divide-y divide-border">
            {apiKeys.map((apiKey) => {
              const provider = PROVIDERS.find(p => p.id === apiKey.provider)
              return (
                <div key={apiKey.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Key className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-text">{provider?.name || apiKey.provider}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-muted">
                          {showKey[apiKey.id] ? '••••••••' : '••••••••••••••••'}
                        </span>
                        <button
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                          className="text-text-muted hover:text-text transition-colors"
                        >
                          {showKey[apiKey.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {apiKey.isActive ? (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <XCircle className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                    <button
                      onClick={() => handleTestKey(apiKey.provider, 'test')}
                      disabled={testingKey === 'test'}
                      className="p-2 text-text-muted hover:text-text transition-colors disabled:opacity-50"
                      title="Test API key"
                    >
                      <TestTube className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteKey(apiKey.id)}
                      disabled={actionLoading === `delete-${apiKey.id}`}
                      className="p-2 text-text-muted hover:text-error transition-colors disabled:opacity-50"
                      title="Delete API key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
            
            {apiKeys.length === 0 && (
              <div className="p-8 text-center">
                <Key className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="text-text-secondary">No API keys added yet</p>
                <button
                  onClick={() => setShowAddKey(true)}
                  className="text-primary hover:underline text-sm mt-2"
                >
                  Add your first API key
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Key Modal */}
      {showAddKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-text mb-4">Add API Key</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 text-text focus:outline-none focus:border-primary/50"
                >
                  <option value="">Select a provider...</option>
                  {PROVIDERS.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} - {provider.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={PROVIDERS.find(p => p.id === selectedProvider)?.placeholder || 'Enter your API key...'}
                  className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 text-text focus:outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Custom name for this key..."
                  className="w-full bg-navy/50 border border-border rounded-lg px-3 py-2 text-text focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddKey(false)}
                className="flex-1 bg-navy/50 border border-border rounded-lg px-4 py-2 text-text hover:border-border-light transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedProvider && keyInput && handleTestKey(selectedProvider, keyInput)}
                disabled={!selectedProvider || !keyInput || testingKey === keyInput}
                className="px-4 py-2 bg-accent/10 text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                Test
              </button>
              <button
                onClick={handleAddKey}
                disabled={!selectedProvider || !keyInput || actionLoading === 'add-key'}
                className="flex-1 bg-primary hover:bg-primary-hover text-white rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'add-key' ? 'Adding...' : 'Add Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}