import { EventEmitter } from 'events'
import prisma from './prisma'
import { containerOrchestrator } from './containerOrchestrator'

interface AgentHealthMetrics {
  agentId: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unreachable'
  containerStatus: string
  uptime: number
  cpuUsage: number
  memoryUsage: number
  lastResponseTime: number
  messageRate: number
  errorRate: number
  lastActiveAt: Date | null
  checkTime: Date
}

interface HealthCheckResult {
  agentId: string
  metrics: AgentHealthMetrics
  alerts: string[]
}

interface RestartRecord {
  count: number
  lastAttempt: number
  nextAllowedAt: number
}

class HealthMonitorService extends EventEmitter {
  private intervalId: NodeJS.Timeout | null = null
  private readonly checkInterval = 30000 // 30 seconds
  private readonly clients: Set<{ agentId?: string; res: any; userId: string }> = new Set()
  private readonly restartTracker: Map<string, RestartRecord> = new Map()
  private readonly maxRestarts = 5           // Max restarts per agent before giving up
  private readonly restartBackoffBase = 30000 // 30s base backoff, doubles each retry
  private readonly restartCooldown = 3600000  // Reset restart counter after 1 hour of stability
  
  async start(): Promise<void> {
    console.log('🔍 Starting health monitor service')
    
    // Run initial health check
    await this.runHealthCheck()
    
    // Schedule periodic health checks
    this.intervalId = setInterval(async () => {
      await this.runHealthCheck()
    }, this.checkInterval)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log('🛑 Health monitor service stopped')
  }

  async runHealthCheck(): Promise<HealthCheckResult[]> {
    try {
      const agents = await prisma.agent.findMany({
        where: { status: { in: ['RUNNING', 'STARTING', 'DEPLOYING'] } },
        include: { user: { select: { id: true } } }
      })

      const results: HealthCheckResult[] = []

      for (const agent of agents) {
        const result = await this.checkAgentHealth(agent.id)
        results.push(result)
        
        // Update agent status in database if it changed
        const newStatus = this.mapStatusToAgentStatus(result.metrics.status) as any
        if (agent.status !== newStatus) {
          await prisma.agent.update({
            where: { id: agent.id },
            data: {
              status: newStatus,
              lastActiveAt: result.metrics.lastActiveAt
            }
          })
        }

        // Auto-restart crashed/unreachable agents
        if (result.metrics.status === 'unreachable') {
          await this.attemptAutoRestart(agent.id, agent.userId, result)
        } else if (result.metrics.status === 'healthy') {
          // Reset restart counter after sustained health
          this.resetRestartTracker(agent.id)
        }

        // Emit real-time updates to connected clients
        this.emitToClients(agent.user.id, 'health-update', result)
        
        // Log critical alerts
        for (const alert of result.alerts) {
          await prisma.agentLog.create({
            data: {
              agentId: agent.id,
              level: 'warning',
              message: `Health Monitor Alert: ${alert}`,
              metadata: { 
                healthMetrics: {
                  ...result.metrics,
                  lastActiveAt: result.metrics.lastActiveAt?.toISOString() || null,
                  checkTime: result.metrics.checkTime.toISOString()
                }
              }
            }
          })
        }
      }

      return results
    } catch (error) {
      console.error('❌ Health check failed:', error)
      return []
    }
  }

  async checkAgentHealth(agentId: string): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: { logs: { orderBy: { createdAt: 'desc' }, take: 50 }, user: { select: { id: true } } }
      })

      if (!agent) {
        throw new Error('Agent not found')
      }

      // Get container status and metrics
      let containerStatus = 'unknown'
      let cpuUsage = 0
      let memoryUsage = 0
      let containerUptime = 0

      if (agent.containerId) {
        try {
          // Get container info from orchestrator (which queries Docker)
          const info = await containerOrchestrator.getContainerInfo(agent.user.id, agent.id)
          containerStatus = info?.status || 'unknown'
          const stats = agent.containerId 
            ? await containerOrchestrator.getContainerStats(agent.containerId)
            : { cpu_percent: 0, memory_usage_mb: 0, uptime_seconds: 0 }
          cpuUsage = stats.cpu_percent || 0
          memoryUsage = stats.memory_usage_mb || 0
          containerUptime = stats.uptime_seconds || 0
        } catch (error) {
          console.error(`❌ Failed to get container stats for ${agentId}:`, error)
          containerStatus = 'error'
        }
      }

      // Calculate error rate from recent logs
      const recentLogs = agent.logs.filter(log => 
        log.createdAt > new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
      )
      const errorLogs = recentLogs.filter(log => log.level === 'error')
      const errorRate = recentLogs.length > 0 ? (errorLogs.length / recentLogs.length) * 100 : 0

      // Calculate message rate (messages per minute over last hour)
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const recentMessageLogs = agent.logs.filter(log => 
        log.createdAt > hourAgo && log.message.includes('message')
      )
      const messageRate = recentMessageLogs.length / 60 // per minute

      const responseTime = Date.now() - startTime

      // Determine overall health status
      let status: AgentHealthMetrics['status'] = 'healthy'
      const alerts: string[] = []

      if (containerStatus === 'exited' || containerStatus === 'error') {
        status = 'unreachable'
        alerts.push('Container is not running')
      } else if (errorRate > 25) {
        status = 'unhealthy'
        alerts.push(`High error rate: ${errorRate.toFixed(1)}%`)
      } else if (responseTime > 5000) {
        status = 'degraded'
        alerts.push(`Slow response time: ${responseTime}ms`)
      } else if (cpuUsage > 80) {
        status = 'degraded'
        alerts.push(`High CPU usage: ${cpuUsage.toFixed(1)}%`)
      } else if (memoryUsage > 500) { // 500MB threshold
        status = 'degraded'
        alerts.push(`High memory usage: ${memoryUsage.toFixed(1)}MB`)
      } else if (!agent.lastActiveAt || agent.lastActiveAt < new Date(Date.now() - 30 * 60 * 1000)) {
        status = 'degraded'
        alerts.push('No activity in the last 30 minutes')
      }

      const metrics: AgentHealthMetrics = {
        agentId,
        status,
        containerStatus,
        uptime: containerUptime,
        cpuUsage,
        memoryUsage,
        lastResponseTime: responseTime,
        messageRate,
        errorRate,
        lastActiveAt: agent.lastActiveAt,
        checkTime: new Date()
      }

      return { agentId, metrics, alerts }
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      return {
        agentId,
        metrics: {
          agentId,
          status: 'unreachable',
          containerStatus: 'error',
          uptime: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          lastResponseTime: responseTime,
          messageRate: 0,
          errorRate: 100,
          lastActiveAt: null,
          checkTime: new Date()
        },
        alerts: [`Health check failed: ${String(error)}`]
      }
    }
  }

  private async attemptAutoRestart(agentId: string, userId: string, result: HealthCheckResult): Promise<void> {
    const record = this.restartTracker.get(agentId) || { count: 0, lastAttempt: 0, nextAllowedAt: 0 }
    const now = Date.now()

    // Reset if cooldown has passed since last attempt (agent was stable)
    if (record.lastAttempt > 0 && now - record.lastAttempt > this.restartCooldown) {
      record.count = 0
      record.nextAllowedAt = 0
    }

    // Check if we've exhausted restart attempts
    if (record.count >= this.maxRestarts) {
      await prisma.agentLog.create({
        data: {
          agentId,
          level: 'error',
          message: `Auto-restart disabled: exceeded ${this.maxRestarts} restart attempts. Manual intervention required.`,
          metadata: { restartCount: record.count, lastAttempt: new Date(record.lastAttempt).toISOString() }
        }
      })
      this.emitToClients(userId, 'restart-failed', {
        agentId,
        reason: 'max_restarts_exceeded',
        restartCount: record.count
      })
      return
    }

    // Check backoff timer
    if (now < record.nextAllowedAt) {
      return // Too soon, wait for backoff
    }

    // Attempt restart
    record.count++
    record.lastAttempt = now
    record.nextAllowedAt = now + this.restartBackoffBase * Math.pow(2, record.count - 1)
    this.restartTracker.set(agentId, record)

    try {
      console.log(`🔄 Auto-restarting agent ${agentId} (attempt ${record.count}/${this.maxRestarts})`)
      await containerOrchestrator.startContainer(userId, agentId)

      await prisma.agentLog.create({
        data: {
          agentId,
          level: 'info',
          message: `Auto-restart successful (attempt ${record.count}/${this.maxRestarts})`,
          metadata: { restartCount: record.count }
        }
      })

      this.emitToClients(userId, 'agent-restarted', {
        agentId,
        attempt: record.count,
        maxAttempts: this.maxRestarts
      })
    } catch (error: any) {
      console.error(`❌ Auto-restart failed for ${agentId}:`, error.message)
      await prisma.agentLog.create({
        data: {
          agentId,
          level: 'error',
          message: `Auto-restart failed (attempt ${record.count}/${this.maxRestarts}): ${error.message}`,
          metadata: { restartCount: record.count, error: error.message }
        }
      })
    }
  }

  private resetRestartTracker(agentId: string): void {
    const record = this.restartTracker.get(agentId)
    if (record && record.count > 0 && Date.now() - record.lastAttempt > this.restartCooldown) {
      this.restartTracker.delete(agentId)
    }
  }

  getRestartInfo(agentId: string): RestartRecord | null {
    return this.restartTracker.get(agentId) || null
  }

  resetRestarts(agentId: string): void {
    this.restartTracker.delete(agentId)
  }

  public mapStatusToAgentStatus(healthStatus: AgentHealthMetrics['status']): string {
    switch (healthStatus) {
      case 'healthy':
      case 'degraded':
        return 'RUNNING'
      case 'unhealthy':
      case 'unreachable':
        return 'ERROR'
      default:
        return 'STOPPED'
    }
  }

  // Server-Sent Events for real-time monitoring
  addClient(client: { agentId?: string; res: any; userId: string }): void {
    this.clients.add(client)
    
    // Send initial health data
    this.sendInitialHealthData(client)
    
    // Setup cleanup
    client.res.on('close', () => {
      this.clients.delete(client)
    })
  }

  private async sendInitialHealthData(client: { agentId?: string; res: any; userId: string }): Promise<void> {
    try {
      let agents
      if (client.agentId) {
        agents = await prisma.agent.findMany({
          where: { id: client.agentId, userId: client.userId }
        })
      } else {
        agents = await prisma.agent.findMany({
          where: { userId: client.userId }
        })
      }

      for (const agent of agents) {
        if (agent.status === 'RUNNING' || agent.status === 'STARTING' || agent.status === 'DEPLOYING') {
          const result = await this.checkAgentHealth(agent.id)
          client.res.write(`data: ${JSON.stringify({ type: 'health-update', data: result })}\n\n`)
        }
      }
    } catch (error) {
      console.error('❌ Failed to send initial health data:', error)
    }
  }

  private emitToClients(userId: string, event: string, data: any): void {
    for (const client of this.clients) {
      if (client.userId === userId) {
        if (!client.agentId || client.agentId === data.agentId) {
          try {
            client.res.write(`data: ${JSON.stringify({ type: event, data })}\n\n`)
          } catch (error) {
            // Client disconnected, will be cleaned up on 'close' event
            console.log('⚠️ Failed to send to client, probably disconnected')
          }
        }
      }
    }
  }

  // Get current health status for all agents
  async getHealthSummary(userId: string): Promise<{ healthy: number; degraded: number; unhealthy: number; unreachable: number }> {
    const agents = await prisma.agent.findMany({
      where: { userId, status: { in: ['RUNNING', 'STARTING', 'DEPLOYING'] } }
    })

    const summary = { healthy: 0, degraded: 0, unhealthy: 0, unreachable: 0 }
    
    for (const agent of agents) {
      const result = await this.checkAgentHealth(agent.id)
      summary[result.metrics.status]++
    }

    return summary
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitorService()
export default healthMonitor