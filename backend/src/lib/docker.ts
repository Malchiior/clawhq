import { exec } from 'child_process'
import { promisify } from 'util'
import { Agent } from '@prisma/client'
import prisma from './prisma'
import memoryService from './memory'

const execAsync = promisify(exec)

export interface ContainerConfig {
  agentId: string
  userId: string
  model: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  apiKeys: {
    openai?: string
    anthropic?: string
    gemini?: string
  }
  channels: ChannelConfig[]
}

export interface ChannelConfig {
  type: string
  config: Record<string, any>
}

class DockerService {
  private generateContainerName(agentId: string): string {
    return `clawhq-agent-${agentId}`
  }

  private generateOpenClawConfig(config: ContainerConfig): string {
    const { model, systemPrompt, temperature, maxTokens, apiKeys, channels } = config
    
    const openclawConfig = {
      models: {
        default: model,
        apiKeys: {
          openai: apiKeys.openai || process.env.OPENAI_API_KEY,
          anthropic: apiKeys.anthropic || process.env.ANTHROPIC_API_KEY,
          google: apiKeys.gemini || process.env.GOOGLE_AI_API_KEY,
        }
      },
      agent: {
        thinking: 'low',
        systemPrompt,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 4096,
      },
      channels: channels.reduce((acc, channel) => {
        acc[channel.type.toLowerCase()] = {
          enabled: true,
          ...channel.config
        }
        return acc
      }, {} as Record<string, any>)
    }

    return JSON.stringify(openclawConfig, null, 2)
  }

  async createContainer(config: ContainerConfig): Promise<string> {
    const containerName = this.generateContainerName(config.agentId)
    
    // Update agent status to deploying
    await prisma.agent.update({
      where: { id: config.agentId },
      data: { status: 'DEPLOYING' }
    })

    try {
      // Generate OpenClaw configuration
      const openclawConfig = this.generateOpenClawConfig(config)
      
      // Create persistent directories
      const configPath = `/var/lib/clawhq/agents/${config.agentId}/config.json`
      const memoryPath = `/var/lib/clawhq/agents/${config.agentId}/memory`
      const workspacePath = `/var/lib/clawhq/agents/${config.agentId}/workspace`
      
      // Ensure directories exist
      await execAsync(`mkdir -p /var/lib/clawhq/agents/${config.agentId}`)
      await execAsync(`mkdir -p ${memoryPath}`)
      await execAsync(`mkdir -p ${workspacePath}`)
      
      // Write config to persistent file
      await execAsync(`echo '${openclawConfig.replace(/'/g, "'\\''")}' > ${configPath}`)
      
      // Restore memory from latest snapshot (if exists)
      try {
        await this.restoreAgentMemory(config.agentId)
      } catch (err) {
        console.log(`No previous memory found for agent ${config.agentId}:`, err)
      }
      
      // Docker run command for OpenClaw agent with persistent volumes
      const dockerCommand = [
        'docker', 'run',
        '-d', // detached
        '--name', containerName,
        '--restart', 'unless-stopped',
        '-v', `${configPath}:/app/config.json:ro`,
        '-v', `${memoryPath}:/app/memory:rw`, // Persistent memory
        '-v', `${workspacePath}:/app/workspace:rw`, // Persistent workspace
        '-e', `AGENT_ID=${config.agentId}`,
        '-e', `USER_ID=${config.userId}`,
        '-e', `CLAWHQ_WEBHOOK=http://host.docker.internal:3001/api/webhooks/agent`,
        '-e', `CLAWHQ_MEMORY_BACKUP_INTERVAL=300`, // Backup memory every 5 minutes
        '--network', 'host',
        'openclaw/openclaw:latest', // Official OpenClaw image
        'openclaw', 'agent', 'start', '--config', '/app/config.json', '--workspace', '/app/workspace'
      ].join(' ')

      const { stdout, stderr } = await execAsync(dockerCommand)
      
      if (stderr && !stderr.includes('Warning')) {
        throw new Error(`Docker error: ${stderr}`)
      }

      const containerId = stdout.trim()
      
      // Update agent with container ID and running status
      await prisma.agent.update({
        where: { id: config.agentId },
        data: { 
          containerId,
          status: 'RUNNING',
          lastActiveAt: new Date()
        }
      })

      // Log successful deployment
      await prisma.agentLog.create({
        data: {
          agentId: config.agentId,
          level: 'info',
          message: 'Agent container deployed successfully with persistent memory',
          metadata: { containerId, memoryPath, workspacePath }
        }
      })

      // Schedule initial memory backup after startup
      setTimeout(async () => {
        try {
          await this.createMemorySnapshot(config.agentId, 'startup')
        } catch (err) {
          console.error(`Failed to create startup snapshot for ${config.agentId}:`, err)
        }
      }, 30000) // Wait 30 seconds for agent to initialize

      return containerId
    } catch (error) {
      // Update agent status to error
      await prisma.agent.update({
        where: { id: config.agentId },
        data: { status: 'ERROR' }
      })

      // Log error
      await prisma.agentLog.create({
        data: {
          agentId: config.agentId,
          level: 'error',
          message: `Failed to deploy container: ${error}`,
          metadata: { error: String(error) }
        }
      })

      throw error
    }
  }

  async stopContainer(agentId: string): Promise<void> {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } })
    if (!agent?.containerId) {
      throw new Error('Container not found')
    }

    try {
      // Create memory snapshot before stopping
      try {
        await this.createMemorySnapshot(agentId, 'shutdown')
      } catch (err) {
        console.error(`Failed to create shutdown snapshot for ${agentId}:`, err)
      }

      await execAsync(`docker stop ${agent.containerId}`)
      await execAsync(`docker rm ${agent.containerId}`)
      
      await prisma.agent.update({
        where: { id: agentId },
        data: { 
          status: 'STOPPED',
          containerId: null 
        }
      })

      await prisma.agentLog.create({
        data: {
          agentId,
          level: 'info',
          message: 'Agent container stopped with memory backup',
        }
      })
    } catch (error) {
      await prisma.agentLog.create({
        data: {
          agentId,
          level: 'error',
          message: `Failed to stop container: ${error}`,
        }
      })
      throw error
    }
  }

  async restartContainer(agentId: string): Promise<void> {
    const agent = await prisma.agent.findUnique({ 
      where: { id: agentId },
      include: { 
        channels: { include: { channel: true } },
        user: true
      }
    })
    
    if (!agent) {
      throw new Error('Agent not found')
    }

    // Stop existing container if running
    if (agent.containerId) {
      await this.stopContainer(agentId)
    }

    // Start new container
    const config: ContainerConfig = {
      agentId: agent.id,
      userId: agent.userId,
      model: agent.model,
      systemPrompt: agent.systemPrompt || undefined,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      apiKeys: {
        // In production, these would come from user's API key settings
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        gemini: process.env.GOOGLE_AI_API_KEY,
      },
      channels: agent.channels.map(ca => ({
        type: ca.channel.type,
        config: ca.channel.config as Record<string, any>
      }))
    }

    await this.createContainer(config)
  }

  async getContainerStatus(containerId: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`docker inspect --format='{{.State.Status}}' ${containerId}`)
      return stdout.trim()
    } catch {
      return 'not-found'
    }
  }

  async getContainerLogs(containerId: string, lines: number = 100): Promise<string> {
    try {
      const { stdout } = await execAsync(`docker logs --tail ${lines} ${containerId}`)
      return stdout
    } catch (error) {
      return `Failed to get logs: ${error}`
    }
  }

  async getContainerStats(containerId: string): Promise<{
    cpu_percent: number
    memory_usage_mb: number
    uptime_seconds: number
  }> {
    try {
      // Get container stats (one-shot, not streaming)
      const { stdout: statsOutput } = await execAsync(`docker stats --no-stream --format "{{.CPUPerc}},{{.MemUsage}}" ${containerId}`)
      const [cpuStr, memStr] = statsOutput.trim().split(',')
      
      // Parse CPU percentage (remove % sign)
      const cpu_percent = parseFloat(cpuStr.replace('%', '')) || 0
      
      // Parse memory usage (format: "123.4MiB / 1.234GiB")
      const memUsagePart = memStr.split(' / ')[0]
      let memory_usage_mb = 0
      
      if (memUsagePart.includes('MiB')) {
        memory_usage_mb = parseFloat(memUsagePart.replace('MiB', '')) || 0
      } else if (memUsagePart.includes('GiB')) {
        memory_usage_mb = (parseFloat(memUsagePart.replace('GiB', '')) || 0) * 1024
      } else if (memUsagePart.includes('MB')) {
        memory_usage_mb = parseFloat(memUsagePart.replace('MB', '')) || 0
      } else if (memUsagePart.includes('GB')) {
        memory_usage_mb = (parseFloat(memUsagePart.replace('GB', '')) || 0) * 1000
      }

      // Get container uptime
      const { stdout: inspectOutput } = await execAsync(`docker inspect --format='{{.State.StartedAt}}' ${containerId}`)
      const startedAt = new Date(inspectOutput.trim())
      const uptime_seconds = Math.floor((Date.now() - startedAt.getTime()) / 1000)

      return {
        cpu_percent,
        memory_usage_mb,
        uptime_seconds
      }
    } catch (error) {
      console.error(`Failed to get container stats for ${containerId}:`, error)
      return {
        cpu_percent: 0,
        memory_usage_mb: 0,
        uptime_seconds: 0
      }
    }
  }

  private async createMemorySnapshot(agentId: string, snapshotType: string): Promise<void> {
    try {
      // Sync memory from filesystem first
      await memoryService.syncFromFileSystem(agentId)
      
      // Create snapshot
      await memoryService.createSnapshot(agentId, snapshotType, `Automatic ${snapshotType} backup`)
      
      // Cleanup old snapshots (keep last 10)
      await memoryService.cleanupOldSnapshots(agentId, 10)
      
      console.log(`Created ${snapshotType} memory snapshot for agent ${agentId}`)
    } catch (error) {
      console.error(`Failed to create ${snapshotType} snapshot for agent ${agentId}:`, error)
      throw error
    }
  }

  private async restoreAgentMemory(agentId: string): Promise<void> {
    try {
      // Get the most recent snapshot
      const snapshots = await memoryService.getSnapshots(agentId, 1)
      
      if (snapshots.length > 0) {
        const latestSnapshot = snapshots[0]
        
        // Restore from snapshot
        await memoryService.restoreFromSnapshot(agentId, latestSnapshot.id)
        
        // Sync to filesystem
        await memoryService.syncToFileSystem(agentId)
        
        console.log(`Restored agent ${agentId} memory from snapshot ${latestSnapshot.id} (${latestSnapshot.snapshotType})`)
      } else {
        console.log(`No memory snapshots found for agent ${agentId} - starting with clean slate`)
      }
    } catch (error) {
      console.error(`Failed to restore memory for agent ${agentId}:`, error)
      throw error
    }
  }
}

export const dockerService = new DockerService()
export default dockerService