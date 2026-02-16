import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'
import { PROJECT_TEMPLATES } from '../data/project-templates'

const router = Router()
const prisma = new PrismaClient()

async function recalcProgress(projectId: string) {
  const items = await prisma.projectItem.findMany({ where: { projectId }, select: { completed: true } })
  const progress = items.length === 0 ? 0 : Math.round((items.filter(i => i.completed).length / items.length) * 100)
  await prisma.project.update({ where: { id: projectId }, data: { progress } })
  return progress
}

// GET /api/projects
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.userId! },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { items: true } }, agent: { select: { id: true, name: true, model: true, status: true } } },
    })
    res.json(projects)
  } catch (err) {
    console.error('Failed to fetch projects:', err)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// POST /api/projects
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, template, color, startedFrom, techStack } = req.body
    if (!name || !template) {
      res.status(400).json({ error: 'name and template required' })
      return
    }

    const tmpl = PROJECT_TEMPLATES.find(t => t.id === template)
    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        template,
        color: color || '#7c3aed',
        startedFrom: startedFrom || 'scratch',
        techStack: techStack || [],
        userId: req.userId!,
        items: tmpl ? {
          create: tmpl.items.map(item => ({
            stage: item.stage,
            category: item.category || null,
            title: item.title,
            description: item.description || null,
            order: item.order,
          }))
        } : undefined,
      },
      include: { items: true },
    })

    res.json(project)
  } catch (err) {
    console.error('Failed to create project:', err)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// GET /api/projects/templates
router.get('/templates', authenticate, async (_req: AuthRequest, res) => {
  res.json(PROJECT_TEMPLATES.map(t => ({ id: t.id, name: t.name, icon: t.icon, description: t.description, itemCount: t.items.length })))
})

// GET /api/projects/:id
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id as string
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.userId! },
      include: { items: { orderBy: { order: 'asc' } }, agent: { select: { id: true, name: true, model: true, status: true } } },
    })
    if (!project) { res.status(404).json({ error: 'Project not found' }); return }
    res.json(project)
  } catch (err) {
    console.error('Failed to fetch project:', err)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

// PATCH /api/projects/:id
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id as string
    const existing = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! } })
    if (!existing) { res.status(404).json({ error: 'Project not found' }); return }

    const { name, description, color, status, techStack, agentId } = req.body
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(status !== undefined && { status }),
        ...(techStack !== undefined && { techStack }),
        ...(agentId !== undefined && { agentId: agentId || null }),
      },
      include: { agent: { select: { id: true, name: true, model: true, status: true } } },
    })
    res.json(project)
  } catch (err) {
    console.error('Failed to update project:', err)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

// DELETE /api/projects/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id as string
    const existing = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! } })
    if (!existing) { res.status(404).json({ error: 'Project not found' }); return }
    await prisma.project.delete({ where: { id: projectId } })
    res.json({ success: true })
  } catch (err) {
    console.error('Failed to delete project:', err)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

// PATCH /api/projects/:id/items/:itemId
router.patch('/:id/items/:itemId', authenticate, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id as string
    const itemId = req.params.itemId as string
    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! } })
    if (!project) { res.status(404).json({ error: 'Project not found' }); return }

    const { completed, blockedBy } = req.body
    const item = await prisma.projectItem.update({
      where: { id: itemId },
      data: {
        ...(completed !== undefined && { completed }),
        ...(blockedBy !== undefined && { blockedBy }),
      },
    })

    const progress = await recalcProgress(projectId)
    res.json({ item, progress })
  } catch (err) {
    console.error('Failed to update item:', err)
    res.status(500).json({ error: 'Failed to update item' })
  }
})

// POST /api/projects/:id/items
router.post('/:id/items', authenticate, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id as string
    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! } })
    if (!project) { res.status(404).json({ error: 'Project not found' }); return }

    const { stage, title, category, description } = req.body
    if (!stage || !title) { res.status(400).json({ error: 'stage and title required' }); return }

    const maxOrder = await prisma.projectItem.findFirst({
      where: { projectId, stage },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const item = await prisma.projectItem.create({
      data: {
        projectId,
        stage,
        title,
        category: category || null,
        description: description || null,
        order: (maxOrder?.order ?? -1) + 1,
      },
    })

    const progress = await recalcProgress(projectId)
    res.json({ item, progress })
  } catch (err) {
    console.error('Failed to add item:', err)
    res.status(500).json({ error: 'Failed to add item' })
  }
})

// DELETE /api/projects/:id/items/:itemId
router.delete('/:id/items/:itemId', authenticate, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.id as string
    const itemId = req.params.itemId as string
    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! } })
    if (!project) { res.status(404).json({ error: 'Project not found' }); return }

    await prisma.projectItem.delete({ where: { id: itemId } })
    const progress = await recalcProgress(projectId)
    res.json({ success: true, progress })
  } catch (err) {
    console.error('Failed to delete item:', err)
    res.status(500).json({ error: 'Failed to delete item' })
  }
})

export default router
