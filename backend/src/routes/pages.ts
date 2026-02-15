import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Default pages seeded for new users
const DEFAULT_PAGES = [
  { slug: 'dashboard', label: 'Command Center', icon: 'LayoutDashboard', pinned: false, sortOrder: 0 },
  { slug: 'chat', label: 'Chat', icon: 'MessageCircle', pinned: true, sortOrder: 1 },
  { slug: 'agents', label: 'Agents', icon: 'Bot', pinned: true, sortOrder: 2 },
  { slug: 'tasks', label: 'Tasks', icon: 'CheckSquare', pinned: false, sortOrder: 3 },
  { slug: 'projects', label: 'Projects', icon: 'FolderKanban', pinned: false, sortOrder: 4 },
  { slug: 'notes', label: 'Notes', icon: 'StickyNote', pinned: false, sortOrder: 5 },
  { slug: 'calendar', label: 'Calendar', icon: 'CalendarDays', pinned: false, sortOrder: 6 },
  { slug: 'automations', label: 'Automations', icon: 'Zap', pinned: false, sortOrder: 7 },
  { slug: 'ideas', label: 'Ideas', icon: 'Lightbulb', pinned: false, sortOrder: 8 },
  { slug: 'strategy', label: 'Strategy', icon: 'Target', pinned: false, sortOrder: 9 },
  { slug: 'revenue', label: 'Revenue', icon: 'TrendingUp', pinned: false, sortOrder: 10 },
  { slug: 'finances', label: 'Finances', icon: 'Wallet', pinned: false, sortOrder: 11 },
  { slug: 'gallery', label: 'Gallery', icon: 'Image', pinned: false, sortOrder: 12 },
  { slug: 'vault', label: 'Vault', icon: 'Shield', pinned: false, sortOrder: 13 },
  { slug: 'timeline', label: 'Timeline', icon: 'Clock', pinned: false, sortOrder: 14 },
  { slug: 'settings', label: 'Settings', icon: 'Settings', pinned: true, sortOrder: 15 },
]

// GET /api/pages — list user's active pages (sorted)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!

    // Check if user has any page configs; if not, seed defaults
    const count = await prisma.userPageConfig.count({ where: { userId } })
    if (count === 0) {
      await prisma.userPageConfig.createMany({
        data: DEFAULT_PAGES.map(p => ({ ...p, userId })),
      })
    }

    const pages = await prisma.userPageConfig.findMany({
      where: { userId, archived: false },
      orderBy: { sortOrder: 'asc' },
    })
    res.json(pages)
  } catch (err) {
    console.error('Failed to fetch pages:', err)
    res.status(500).json({ error: 'Failed to fetch pages' })
  }
})

// PUT /api/pages/reorder — bulk update sort orders
router.put('/reorder', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const { order } = req.body as { order: { id: string; sortOrder: number }[] }
    if (!Array.isArray(order)) {
      res.status(400).json({ error: 'order array required' })
      return
    }

    // Verify all pages belong to user, then update
    const userPages = await prisma.userPageConfig.findMany({
      where: { userId },
      select: { id: true },
    })
    const userPageIds = new Set(userPages.map(p => p.id))

    await prisma.$transaction(
      order
        .filter(({ id }) => userPageIds.has(id))
        .map(({ id, sortOrder }) =>
          prisma.userPageConfig.update({
            where: { id },
            data: { sortOrder },
          })
        )
    )

    res.json({ success: true })
  } catch (err) {
    console.error('Failed to reorder pages:', err)
    res.status(500).json({ error: 'Failed to reorder pages' })
  }
})

// POST /api/pages — add a page from template
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const { slug, label, icon, templateId } = req.body

    if (!slug || !label) {
      res.status(400).json({ error: 'slug and label required' })
      return
    }

    // Get max sortOrder
    const last = await prisma.userPageConfig.findFirst({
      where: { userId },
      orderBy: { sortOrder: 'desc' },
    })

    const page = await prisma.userPageConfig.create({
      data: {
        userId,
        slug,
        label,
        icon: icon || 'FileText',
        templateId: templateId || null,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    })

    res.json(page)
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Page with this slug already exists' })
      return
    }
    console.error('Failed to add page:', err)
    res.status(500).json({ error: 'Failed to add page' })
  }
})

// PATCH /api/pages/:id — rename or update a page
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const pageId = req.params.id as string
    const { label, icon } = req.body

    // Verify ownership
    const existing = await prisma.userPageConfig.findFirst({ where: { id: pageId, userId } })
    if (!existing) { res.status(404).json({ error: 'Page not found' }); return }

    const page = await prisma.userPageConfig.update({
      where: { id: pageId },
      data: {
        ...(label !== undefined && { label }),
        ...(icon !== undefined && { icon }),
      },
    })

    res.json(page)
  } catch (err) {
    console.error('Failed to update page:', err)
    res.status(500).json({ error: 'Failed to update page' })
  }
})

// DELETE /api/pages/:id — archive a page (or hard-delete if not pinned)
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const pageId = req.params.id as string

    const page = await prisma.userPageConfig.findFirst({
      where: { id: pageId, userId },
    })

    if (!page) { res.status(404).json({ error: 'Page not found' }); return }
    if (page.pinned) { res.status(400).json({ error: 'Cannot remove pinned pages' }); return }

    await prisma.userPageConfig.update({
      where: { id: pageId },
      data: { archived: true },
    })

    res.json({ success: true })
  } catch (err) {
    console.error('Failed to delete page:', err)
    res.status(500).json({ error: 'Failed to delete page' })
  }
})

// POST /api/pages/:id/restore — unarchive a page
router.post('/:id/restore', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const pageId = req.params.id as string

    const existing = await prisma.userPageConfig.findFirst({ where: { id: pageId, userId } })
    if (!existing) { res.status(404).json({ error: 'Page not found' }); return }

    const page = await prisma.userPageConfig.update({
      where: { id: pageId },
      data: { archived: false },
    })

    res.json(page)
  } catch (err) {
    console.error('Failed to restore page:', err)
    res.status(500).json({ error: 'Failed to restore page' })
  }
})

export default router
