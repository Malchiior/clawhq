import { exec } from 'child_process'
import { promisify } from 'util'
import { Agent } from '@prisma/client'
import prisma from './prisma'

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
      
      // Create a temporary config file (in production, this would be mounted as a volume)
      const configPath = `/tmp/clawhq-${config.agentId}-config.json`
      
      // Write config to temporary file
      await execAsync(`echo '${openclawConfig.replace(/'/g, "'\\''")}' > ${configPath}`)
      
      // Docker run command for OpenClaw agent
      const dockerCommand = [
        'docker', 'run',
        '-d', // detached
        '--name', containerName,
        '--restart', 'unless-stopped',
        '-v', `${configPath}:/app/config.json:ro`,
        '-e', `AGENT_ID=${config.agentId}`,
        '-e', `USER_ID=${config.userId}`,
        '-e', `CLAWHQ_WEBHOOK=http://host.docker.internal:3001/api/webhooks/agent`,
        '--network', 'host',
        'openclaw/openclaw:latest', // Official OpenClaw image
        'openclaw', 'agent', 'start', '--config', '/app/config.json'
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
          message: 'Agent container deployed successfully',
          metadata: { containerId }
        }
      })

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
          message: 'Agent container stopped',
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
}

export const dockerService = new DockerService()
export default dockerService