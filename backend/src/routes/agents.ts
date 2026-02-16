import { Router, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { containerOrchestrator, AgentConfig } from '../lib/containerOrchestrator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateOpenClawConfig, generateLocalSnippet, generateDockerEnv, validateConfig, AgentSettings, ChannelConfig } from '../lib/configGenerator';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/agents — list user's agents
// ---------------------------------------------------------------------------

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const agents = await prisma.agent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { machine: { select: { id: true, name: true, isOnline: true } } },
    });

    const agentsWithContainer = await Promise.all(
      agents.map(async (agent) => {
        const containerInfo = await containerOrchestrator.getContainerInfo(userId, agent.id);
        return {
          id: agent.id,
          name: agent.name,
          modelProvider: agent.modelProvider,
          model: agent.model,
          deployMode: agent.deployMode,
          usesBundledApi: agent.usesBundledApi,
          channels: agent.channels,
          status: agent.status,
          containerStatus: containerInfo?.status || 'not-deployed',
          containerPort: containerInfo?.port || null,
          lastHealthCheck: containerInfo?.lastHealthCheck || null,
          totalMessages: agent.totalMessages,
          totalTokens: agent.totalTokens,
          lastActiveAt: agent.lastActiveAt,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
          machine: (agent as any).machine || null,
        };
      }),
    );

    res.json({ agents: agentsWithContainer });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/agents — create new agent
// ---------------------------------------------------------------------------

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, modelProvider, model, apiKey, channels, usesBundledApi, deployMode, systemPrompt, temperature, maxTokens } = req.body;

    if (!name || typeof name !== 'string' || name.length > 50) {
      return res.status(400).json({ error: 'Name is required (max 50 chars)' });
    }

    // Validate deploy mode
    const validModes = ['CLOUD', 'CONNECTOR', 'DESKTOP'];
    const mode = validModes.includes(deployMode) ? deployMode : 'CLOUD';

    // Check agent limit by plan
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const agentCount = await prisma.agent.count({ where: { userId } });
    if (agentCount >= user.maxAgents) {
      return res.status(403).json({
        error: `Agent limit reached (${user.maxAgents}). Upgrade your plan.`,
      });
    }

    // BYOK requires API key, but CONNECTOR and DESKTOP modes can skip it
    if (!usesBundledApi && !apiKey && mode === 'CLOUD') {
      return res.status(400).json({ error: 'API key required for cloud deployment when not using bundled API' });
    }

    // Validate system prompt length
    if (systemPrompt && systemPrompt.length > 10000) {
      return res.status(400).json({ error: 'System prompt too long (max 10,000 characters)' });
    }

    // For CONNECTOR mode, set status to STOPPED (will become RUNNING when relay connects)
    // For DESKTOP mode, set status to RUNNING immediately (uses bundled API)
    const initialStatus = mode === 'DESKTOP' ? 'RUNNING' : 'STOPPED';

    const agent = await prisma.agent.create({
      data: {
        userId,
        name,
        modelProvider: modelProvider || 'claude',
        model: model || 'claude-sonnet-4-20250514',
        deployMode: mode,
        apiKey: (usesBundledApi || mode === 'CONNECTOR') ? null : apiKey,
        usesBundledApi: mode === 'DESKTOP' ? true : !!usesBundledApi,
        channels: channels || [],
        status: initialStatus,
        systemPrompt: systemPrompt || null,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        maxTokens: typeof maxTokens === 'number' ? maxTokens : 4096,
      },
    });

    res.status(201).json({
      agent: {
        id: agent.id,
        name: agent.name,
        modelProvider: agent.modelProvider,
        model: agent.model,
        deployMode: agent.deployMode,
        usesBundledApi: agent.usesBundledApi,
        channels: agent.channels,
        status: agent.status,
        createdAt: agent.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/agents/:agentId/deploy — deploy agent to container
// ---------------------------------------------------------------------------

router.post('/:agentId/deploy', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const agentId = req.params.agentId as string;

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // Plan-tier gating: free users cannot deploy cloud containers
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.plan === 'FREE') {
      return res.status(403).json({
        error: 'Cloud deployment requires a paid plan. Use the Local Connector or upgrade to Pro.',
        upgradeUrl: '/billing',
      });
    }

    // Check agent limit for cloud containers
    const deployedCount = await prisma.agent.count({
      where: { userId, containerId: { not: null } },
    });
    if (deployedCount >= user.maxAgents) {
      return res.status(403).json({
        error: `Cloud container limit reached (${user.maxAgents}). Upgrade your plan for more.`,
        upgradeUrl: '/billing',
      });
    }

    const existing = await containerOrchestrator.getContainerInfo(userId, agentId);
    if (existing && existing.status === 'running') {
      return res.status(409).json({ error: 'Agent is already deployed' });
    }

    // Resolve API key
    let resolvedKey = agent.apiKey;
    if (agent.usesBundledApi) {
      const bundledKeys: Record<string, string | undefined> = {
        claude: process.env.CLAWHQ_CLAUDE_API_KEY,
        openai: process.env.CLAWHQ_OPENAI_API_KEY,
        gemini: process.env.CLAWHQ_GEMINI_API_KEY,
        deepseek: process.env.CLAWHQ_DEEPSEEK_API_KEY,
        grok: process.env.CLAWHQ_GROK_API_KEY,
      };
      resolvedKey = bundledKeys[agent.modelProvider] || null;
      if (!resolvedKey) {
        return res.status(503).json({ error: `Bundled API for ${agent.modelProvider} unavailable` });
      }
    }
    if (!resolvedKey) {
      return res.status(400).json({ error: 'No API key available' });
    }

    const config: AgentConfig = {
      userId,
      agentId,
      agentName: agent.name,
      modelProvider: agent.modelProvider as AgentConfig['modelProvider'],
      model: agent.model,
      apiKey: resolvedKey,
      channels: agent.channels,
      systemPrompt: agent.systemPrompt || undefined,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
    };

    const containerInfo = await containerOrchestrator.createContainer(config);

    res.json({
      message: 'Agent deployed',
      container: {
        status: containerInfo.status,
        port: containerInfo.port,
      },
    });
  } catch (error) {
    console.error('Error deploying agent:', error);
    res.status(500).json({ error: 'Failed to deploy agent' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/agents/:agentId/start
// ---------------------------------------------------------------------------

router.post('/:agentId/start', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const agentId = req.params.agentId as string;

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    await containerOrchestrator.startContainer(userId, agentId);
    res.json({ message: 'Agent starting' });
  } catch (error) {
    console.error('Error starting agent:', error);
    res.status(500).json({ error: 'Failed to start agent' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/agents/:agentId/stop
// ---------------------------------------------------------------------------

router.post('/:agentId/stop', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const agentId = req.params.agentId as string;

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    await containerOrchestrator.stopContainer(userId, agentId);
    res.json({ message: 'Agent stopped' });
  } catch (error) {
    console.error('Error stopping agent:', error);
    res.status(500).json({ error: 'Failed to stop agent' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/agents/:agentId/restart
// ---------------------------------------------------------------------------

router.post('/:agentId/restart', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const agentId = req.params.agentId as string;

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    if (agent.containerId) {
      await containerOrchestrator.stopContainer(userId, agentId);
    }
    await containerOrchestrator.startContainer(userId, agentId);
    res.json({ message: 'Agent restarting' });
  } catch (error) {
    console.error('Error restarting agent:', error);
    res.status(500).json({ error: 'Failed to restart agent' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/agents/:agentId — single agent detail
// ---------------------------------------------------------------------------

router.get('/:agentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const agentId = req.params.agentId as string;

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
      include: {
        agentChannels: { include: { channel: true } },
        logs: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const containerInfo = await containerOrchestrator.getContainerInfo(userId, agent.id);

    res.json({
      agent: {
        id: agent.id,
        name: agent.name,
        modelProvider: agent.modelProvider,
        model: agent.model,
        deployMode: agent.deployMode,
        status: agent.status,
        containerStatus: containerInfo?.status || (agent.containerId ? 'stopped' : 'not-deployed'),
        containerPort: containerInfo?.port || null,
        systemPrompt: agent.systemPrompt,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        sessionMode: agent.sessionMode || 'separate',
        skills: agent.skills || [],
        totalMessages: agent.totalMessages,
        totalTokens: agent.totalTokens,
        createdAt: agent.createdAt,
        channels: agent.agentChannels.map((ac: any) => ({ channel: ac.channel })),
        logs: agent.logs,
      },
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/agents/:agentId — update agent config
// ---------------------------------------------------------------------------

router.patch('/:agentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const agentId = req.params.agentId as string;

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const { name, model, systemPrompt, temperature, maxTokens, skills, sessionMode, machineId } = req.body;
    const data: any = {};

    if (machineId !== undefined) {
      data.machineId = machineId // null to unassign
    }

    if (sessionMode !== undefined) {
      if (!['separate', 'shared'].includes(sessionMode)) {
        return res.status(400).json({ error: 'sessionMode must be "separate" or "shared"' });
      }
      data.sessionMode = sessionMode;
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.length < 1 || name.length > 50) {
        return res.status(400).json({ error: 'Name must be 1-50 characters' });
      }
      data.name = name.trim();
    }
    if (model !== undefined) data.model = model;
    if (systemPrompt !== undefined) {
      if (systemPrompt && systemPrompt.length > 10000) {
        return res.status(400).json({ error: 'System prompt too long (max 10,000 chars)' });
      }
      data.systemPrompt = systemPrompt || null;
    }
    if (temperature !== undefined) data.temperature = Math.max(0, Math.min(2, Number(temperature) || 0));
    if (maxTokens !== undefined) data.maxTokens = Math.max(1, Math.min(128000, Number(maxTokens) || 4096));
    if (skills !== undefined) {
      if (!Array.isArray(skills)) return res.status(400).json({ error: 'Skills must be an array' });
      data.skills = skills;
    }

    const updated = await prisma.agent.update({ where: { id: agentId }, data });

    // For CLOUD agents with running containers, flag that config needs re-apply
    const configChanged = data.model || data.systemPrompt !== undefined || data.temperature !== undefined || data.maxTokens !== undefined || data.skills;
    const needsReapply = agent.deployMode === 'CLOUD' && agent.containerId && configChanged;

    res.json({
      agent: updated,
      configDirty: !!needsReapply,
      hint: needsReapply ? 'Config changed. Apply via POST /api/agents/:id/config/apply to update running container.' : undefined,
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/agents/:agentId — destroy agent + container
// ---------------------------------------------------------------------------

router.delete('/:agentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const agentId = req.params.agentId as string;

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // Destroy container (safe if none exists)
    try { await containerOrchestrator.destroyContainer(userId, agentId); } catch {}

    await prisma.agent.delete({ where: { id: agentId } });
    res.json({ message: 'Agent deleted' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/agents/:agentId/duplicate — clone an agent
// ---------------------------------------------------------------------------
router.post('/:agentId/duplicate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const agentId = req.params.agentId as string
    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }

    const { includeMemory } = req.body || {}

    const duplicate = await prisma.agent.create({
      data: {
        name: `${agent.name} (Copy)`,
        modelProvider: agent.modelProvider,
        model: agent.model,
        deployMode: agent.deployMode,
        systemPrompt: agent.systemPrompt,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        skills: agent.skills as any,
        sessionMode: agent.sessionMode,
        machineId: agent.machineId,
        userId,
      },
    })

    if (includeMemory) {
      const memories = await prisma.agentMemory.findMany({ where: { agentId: agentId, isActive: true } })
      if (memories.length > 0) {
        await prisma.agentMemory.createMany({
          data: memories.map(m => ({
            filePath: m.filePath,
            content: m.content,
            fileSize: m.fileSize,
            checksum: m.checksum,
            agentId: duplicate.id,
          })),
        })
      }
    }

    res.json({ agent: duplicate })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// GET /api/agents/:agentId/export — export agent as .claw JSON backup
// ---------------------------------------------------------------------------
router.get('/:agentId/export', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const agentId = req.params.agentId as string
    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } })
    if (!agent) { res.status(404).json({ error: 'Agent not found' }); return }

    const includeMemory = req.query.memory === 'true'
    let memoryData: { filePath: string; content: string }[] = []
    if (includeMemory) {
      const memories = await prisma.agentMemory.findMany({ where: { agentId, isActive: true } })
      memoryData = memories.map((m: any) => ({ filePath: m.filePath, content: m.content }))
    }

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      agent: {
        name: agent.name,
        modelProvider: agent.modelProvider,
        model: agent.model,
        deployMode: agent.deployMode,
        systemPrompt: agent.systemPrompt,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        skills: agent.skills,
        sessionMode: agent.sessionMode,
      },
      memory: memoryData,
    }

    const filename = `${agent.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.claw`
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.json(backup)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// POST /api/agents/import — import agent from .claw backup
// ---------------------------------------------------------------------------
router.post('/import', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { backup, machineId } = req.body
    if (!backup?.agent) { res.status(400).json({ error: 'Invalid backup file' }); return }

    const agent = await prisma.agent.create({
      data: {
        name: backup.agent.name || 'Imported Agent',
        modelProvider: backup.agent.modelProvider || 'claude',
        model: backup.agent.model || 'claude-sonnet-4-20250514',
        deployMode: backup.agent.deployMode || 'CLOUD',
        systemPrompt: backup.agent.systemPrompt || null,
        temperature: backup.agent.temperature ?? 0.7,
        maxTokens: backup.agent.maxTokens ?? 4096,
        skills: backup.agent.skills || '[]',
        sessionMode: backup.agent.sessionMode || 'separate',
        machineId: machineId || null,
        userId,
      },
    })

    // Import memory if present
    if (backup.memory?.length > 0) {
      await prisma.agentMemory.createMany({
        data: backup.memory.map((m: any) => ({
          filePath: m.filePath,
          content: m.content,
          fileSize: m.content?.length || 0,
          agentId: agent.id,
        })),
      })
    }

    res.json({ agent })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// GET /api/agents/:agentId/stats — live container metrics
// ---------------------------------------------------------------------------

router.get('/:agentId/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const agentId = req.params.agentId as string;

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
    if (!agent?.containerId) {
      return res.status(404).json({ error: 'No running container' });
    }

    const stats = await containerOrchestrator.getContainerStats(agent.containerId);
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/agents/:agentId/logs — container logs
// ---------------------------------------------------------------------------

router.get('/:agentId/logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const agentId = req.params.agentId as string;
    const lines = Math.min(parseInt(req.query.lines as string) || 100, 500);

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
    if (!agent?.containerId) {
      return res.status(404).json({ error: 'No container found' });
    }

    const logs = await containerOrchestrator.getContainerLogs(agent.containerId, lines);
    res.json({ logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// ---------------------------------------------------------------------------
// Helper: Build AgentSettings from DB agent + channels
// ---------------------------------------------------------------------------

async function buildAgentSettings(agent: any): Promise<AgentSettings> {
  // Fetch connected channels with their configs
  const agentChannels = await prisma.channelAgent.findMany({
    where: { agentId: agent.id },
    include: { channel: true },
  });

  const channels: ChannelConfig[] = agentChannels.map((ac: any) => ({
    type: ac.channel.type as string,
    config: (ac.channel.config || {}) as Record<string, any>,
    isActive: ac.channel.isActive,
  }));

  return {
    agentId: agent.id,
    agentName: agent.name,
    modelProvider: agent.modelProvider,
    model: agent.model,
    deployMode: agent.deployMode,
    usesBundledApi: agent.usesBundledApi,
    apiKey: agent.apiKey,
    systemPrompt: agent.systemPrompt,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
    skills: Array.isArray(agent.skills) ? agent.skills : [],
    webhookToken: agent.webhookToken,
    channels,
  };
}

// ---------------------------------------------------------------------------
// GET /api/agents/:agentId/config — generated OpenClaw config.yaml
// ---------------------------------------------------------------------------

router.get('/:agentId/config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const agentId = req.params.agentId as string;
    const format = (req.query.format as string) || 'yaml';

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const settings = await buildAgentSettings(agent);

    if (format === 'snippet' && agent.deployMode === 'CONNECTOR') {
      // Connector snippet only
      const snippet = generateLocalSnippet(settings);
      return res.json({ config: snippet, format: 'snippet', deployMode: 'CONNECTOR' });
    }

    const yaml = generateOpenClawConfig(settings);
    const validation = validateConfig(yaml);

    if (format === 'download') {
      res.setHeader('Content-Type', 'text/yaml');
      res.setHeader('Content-Disposition', `attachment; filename="config-${agent.name.replace(/[^a-zA-Z0-9]/g, '-')}.yaml"`);
      return res.send(yaml);
    }

    res.json({
      config: yaml,
      format: 'yaml',
      deployMode: agent.deployMode,
      validation,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating config:', error);
    res.status(500).json({ error: 'Failed to generate config' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/agents/:agentId/config/apply — regenerate + apply config to running container
// ---------------------------------------------------------------------------

router.post('/:agentId/config/apply', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const agentId = req.params.agentId as string;

    const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    if (agent.deployMode !== 'CLOUD') {
      return res.json({
        message: 'Config generated. For local/dashboard agents, download and apply manually.',
        applied: false,
      });
    }

    if (!agent.containerId) {
      return res.status(400).json({ error: 'No running container. Deploy the agent first.' });
    }

    const settings = await buildAgentSettings(agent);
    const yaml = generateOpenClawConfig(settings);
    const validation = validateConfig(yaml);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Generated config has validation errors',
        validationErrors: validation.errors,
      });
    }

    // Write new config to the container's config directory
    const agentConfig: AgentConfig = {
      userId,
      agentId,
      agentName: agent.name,
      modelProvider: agent.modelProvider as AgentConfig['modelProvider'],
      model: agent.model,
      apiKey: agent.apiKey || '',
      channels: agent.channels as string[],
      systemPrompt: agent.systemPrompt || undefined,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      webhookToken: agent.webhookToken || undefined,
    };
    containerOrchestrator.writeConfigForAgent(agentConfig, agent.containerPort || 18789);

    // Restart the container to pick up the new config
    try {
      await containerOrchestrator.stopContainer(userId, agentId);
      await containerOrchestrator.startContainer(userId, agentId);
    } catch (restartErr: any) {
      return res.status(500).json({
        error: `Config written but restart failed: ${restartErr.message}`,
        configWritten: true,
      });
    }

    // Log the config change
    try {
      await prisma.agentLog.create({
        data: {
          agentId,
          level: 'info',
          message: 'Configuration updated and applied via ClawHQ dashboard',
        },
      });
    } catch {}

    res.json({
      message: 'Config applied and agent restarted',
      applied: true,
      validation,
    });
  } catch (error) {
    console.error('Error applying config:', error);
    res.status(500).json({ error: 'Failed to apply config' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/agents/:agentId/webhook — agent container callbacks
// ---------------------------------------------------------------------------

router.post('/:agentId/webhook', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.params.agentId as string;
    const webhookToken = req.headers['x-webhook-token'] as string | undefined;
    const data = req.body;

    // Validate webhook token
    if (!webhookToken) {
      return res.status(401).json({ error: 'Missing webhook token' });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { webhookToken: true }
    });

    if (!agent?.webhookToken) {
      return res.status(401).json({ error: 'Invalid agent' });
    }

    try {
      const valid = crypto.timingSafeEqual(
        Buffer.from(agent.webhookToken),
        Buffer.from(webhookToken)
      );
      if (!valid) {
        return res.status(401).json({ error: 'Invalid webhook token' });
      }
    } catch {
      return res.status(401).json({ error: 'Invalid webhook token' });
    }

    if (data.status) {
      await prisma.agent.update({
        where: { id: agentId },
        data: { lastHeartbeat: new Date() },
      });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export default router;
