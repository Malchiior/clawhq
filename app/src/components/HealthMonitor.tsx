import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Activity, Cpu, MemoryStick, Clock, Zap, AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { apiFetch } from '../lib/api'

interface HealthMetrics {
  agentId: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unreachable'
  containerStatus: string
  uptime: number
  cpuUsage: number
  memoryUsage: number
  lastResponseTime: number
  messageRate: number
  errorRate: number
  lastActiveAt: string | null
  checkTime: string
}

interface HealthCheckResult {
  agentId: string
  metrics: HealthMetrics
  alerts: string[]
}

interface HealthMonitorProps {
  agentId: string
}

const statusConfig = {
  healthy: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Healthy' },
  degraded: { icon: AlertTriangle, color: 'text-accent', bg: 'bg-accent/10', label: 'Degraded' },
  unhealthy: { icon: XCircle, color: 'text-error', bg: 'bg-error/10', label: 'Unhealthy' },
  unreachable: { icon: XCircle, color: 'text-text-muted', bg: 'bg-text-muted/10', label: 'Unreachable' },
}

export default function HealthMonitor({ agentId }: HealthMonitorProps) {
  const [healthData, setHealthData] = useState<HealthCheckResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manualCheckLoading, setManualCheckLoading] = useState(false)
  const [realTimeEnabled, setRealTimeEnabled] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  
  // Load initial health data
  useEffect(() => {
    loadHealthData()
  }, [agentId])

  // Setup real-time monitoring via Server-Sent Events
  useEffect(() => {
    if (!realTimeEnabled) return

    const token = localStorage.getItem('token')
    if (!token) return

    const eventSource = new EventSource(`/api/health/stream?agentId=${agentId}`, {
      withCredentials: true
    })

    eventSource.onopen = () => {
      console.log('🔗 Health monitoring stream connected')
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'health-update' && data.data.agentId === agentId) {
          setHealthData(data.data)
          setError(null)
        } else if (data.type === 'connected') {
          console.log('✅ Health monitoring stream established')
        }
      } catch (err) {
        console.error('❌ Failed to parse health stream data:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('❌ Health monitoring stream error:', err)
      setError('Real-time connection lost. Using manual refresh.')
      setRealTimeEnabled(false)
    }

    eventSourceRef.current = eventSource

    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [agentId, realTimeEnabled])

  const loadHealthData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await apiFetch(`/api/health/agent/${agentId}`)
      setHealthData(data)
    } catch (err) {
      setError('Failed to load health data')
      console.error('❌ Health check failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const triggerManualCheck = async () => {
    setManualCheckLoading(true)
    
    try {
      const data = await apiFetch(`/api/health/check/${agentId}`, { method: 'POST' })
      setHealthData(data.result)
      setError(null)
    } catch (err) {
      setError('Manual health check failed')
    } finally {
      setManualCheckLoading(false)
    }
  }

  const toggleRealTime = () => {
    if (realTimeEnabled) {
      eventSourceRef.current?.close()
      eventSourceRef.current = null
    }
    setRealTimeEnabled(!realTimeEnabled)
  }

  const formatUptime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`
  }

  const formatLastActive = (timestamp: string | null): string => {
    if (!timestamp) return 'Never'
    const diff = Date.now() - new Date(timestamp).getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  if (error && !healthData) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-8 h-8 text-error mx-auto mb-2" />
        <p className="text-error text-sm mb-3">{error}</p>
        <button
          onClick={loadHealthData}
          className="text-primary hover:text-primary-hover text-sm underline"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!healthData) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <Activity className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">No health data available</p>
      </div>
    )
  }

  const { metrics, alerts } = healthData
  const status = statusConfig[metrics.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Health Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${status.bg} flex items-center justify-center`}>
            <status.icon className={`w-5 h-5 ${status.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-text">{status.label}</h3>
            <p className="text-xs text-text-muted">
              Last checked: {new Date(metrics.checkTime).toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleRealTime}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              realTimeEnabled 
                ? 'bg-success/10 text-success border border-success/20' 
                : 'bg-card border border-border text-text-secondary hover:text-text'
            }`}
          >
            {realTimeEnabled ? '● Live' : 'Manual'}
          </button>
          
          <button
            onClick={triggerManualCheck}
            disabled={manualCheckLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-card border border-border text-text-secondary hover:text-text transition-colors disabled:opacity-50"
          >
            {manualCheckLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Check Now
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-error/5 border border-error/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-error" />
            <span className="text-sm font-medium text-error">Health Alerts</span>
          </div>
          <ul className="text-sm text-error/80 space-y-1">
            {alerts.map((alert, index) => (
              <li key={index} className="flex items-start gap-1.5">
                <span className="text-error mt-1">•</span>
                {alert}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Container Status',
            value: metrics.containerStatus,
            icon: Activity,
            color: metrics.containerStatus === 'running' ? 'text-success' : 'text-error',
            bg: metrics.containerStatus === 'running' ? 'bg-success/10' : 'bg-error/10'
          },
          {
            label: 'CPU Usage',
            value: `${metrics.cpuUsage.toFixed(1)}%`,
            icon: Cpu,
            color: metrics.cpuUsage > 80 ? 'text-error' : metrics.cpuUsage > 60 ? 'text-accent' : 'text-success',
            bg: 'bg-primary/10'
          },
          {
            label: 'Memory Usage',
            value: `${metrics.memoryUsage.toFixed(0)}MB`,
            icon: MemoryStick,
            color: metrics.memoryUsage > 500 ? 'text-error' : metrics.memoryUsage > 300 ? 'text-accent' : 'text-success',
            bg: 'bg-accent/10'
          },
          {
            label: 'Uptime',
            value: formatUptime(metrics.uptime),
            icon: Clock,
            color: 'text-success',
            bg: 'bg-success/10'
          },
        ].map(metric => (
          <div key={metric.label} className="bg-card border border-border rounded-lg p-3">
            <div className={`w-6 h-6 rounded ${metric.bg} flex items-center justify-center mb-2`}>
              <metric.icon className={`w-3 h-3 ${metric.color}`} />
            </div>
            <p className="text-lg font-semibold text-text">{metric.value}</p>
            <p className="text-xs text-text-muted">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Response Time
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-sm">Latest:</span>
              <span className="text-text font-medium">{metrics.lastResponseTime}ms</span>
            </div>
            <div className="w-full bg-navy/50 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all ${
                  metrics.lastResponseTime > 5000 ? 'bg-error' :
                  metrics.lastResponseTime > 2000 ? 'bg-accent' : 'bg-success'
                }`}
                style={{ width: `${Math.min((metrics.lastResponseTime / 5000) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Message Rate
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-sm">Per minute:</span>
              <span className="text-text font-medium">{metrics.messageRate.toFixed(1)}</span>
            </div>
            <div className="w-full bg-navy/50 rounded-full h-1.5">
              <div 
                className="h-1.5 bg-primary rounded-full transition-all"
                style={{ width: `${Math.min((metrics.messageRate / 10) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h4 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Error Rate
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-sm">Last 15min:</span>
              <span className="text-text font-medium">{metrics.errorRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-navy/50 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all ${
                  metrics.errorRate > 25 ? 'bg-error' :
                  metrics.errorRate > 10 ? 'bg-accent' : 'bg-success'
                }`}
                style={{ width: `${Math.min((metrics.errorRate / 50) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Last Activity */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="text-sm font-medium text-text mb-2">Last Activity</h4>
        <p className="text-text-secondary text-sm">
          {formatLastActive(metrics.lastActiveAt)}
        </p>
      </div>

      {/* Connection Status */}
      {error && (
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 text-center">
          <p className="text-accent text-sm">{error}</p>
        </div>
      )}
    </motion.div>
  )
}