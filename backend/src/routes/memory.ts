import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import memoryService from '../lib/memory'

const router = Router()
router.use(authenticate)

function paramId(req: AuthRequest): string {
  return req.params.id as string
}

function paramFilePath(req: AuthRequest): string {
  return req.params.filePath as string
}

// Get memory files for an agent
router.get('/agents/:id/memory', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = paramId(req)
    
    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    const files = await memoryService.listMemoryFiles(agentId)
    const totalSize = await memoryService.getTotalMemorySize(agentId)
    
    res.json({ 
      agentId,
      files,
      totalSize,
      fileCount: files.length
    })
  } catch (error) {
    console.error('Failed to get memory files:', error)
    res.status(500).json({ error: 'Failed to get memory files' })
  }
})

// Get specific memory file content
router.get('/agents/:id/memory/:filePath', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = paramId(req)
    const filePath = decodeURIComponent(paramFilePath(req))
    
    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    const content = await memoryService.getMemoryFile(agentId, filePath)
    
    if (content === null) {
      res.status(404).json({ error: 'Memory file not found' })
      return
    }
    
    res.json({ 
      agentId,
      filePath,
      content
    })
  } catch (error) {
    console.error('Failed to get memory file:', error)
    res.status(500).json({ error: 'Failed to get memory file' })
  }
})

// Save/update memory file
router.put('/agents/:id/memory/:filePath', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = paramId(req)
    const filePath = decodeURIComponent(paramFilePath(req))
    const { content } = req.body
    
    if (!content && content !== '') {
      res.status(400).json({ error: 'Content is required' })
      return
    }
    
    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    await memoryService.saveMemoryFile(agentId, filePath, content)
    
    res.json({ 
      success: true,
      message: 'Memory file saved successfully'
    })
  } catch (error) {
    console.error('Failed to save memory file:', error)
    res.status(500).json({ error: 'Failed to save memory file' })
  }
})

// Delete memory file
router.delete('/agents/:id/memory/:filePath', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = paramId(req)
    const filePath = decodeURIComponent(paramFilePath(req))
    
    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    await memoryService.deleteMemoryFile(agentId, filePath)
    
    res.json({ 
      success: true,
      message: 'Memory file deleted successfully'
    })
  } catch (error) {
    console.error('Failed to delete memory file:', error)
    res.status(500).json({ error: 'Failed to delete memory file' })
  }
})

// Create memory snapshot
router.post('/agents/:id/memory/snapshots', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = paramId(req)
    const { snapshotType = 'manual', description } = req.body
    
    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    // First sync from filesystem to capture latest changes
    await memoryService.syncFromFileSystem(agentId)
    
    // Create snapshot
    const snapshot = await memoryService.createSnapshot(agentId, snapshotType, description)
    
    res.status(201).json({ 
      success: true,
      snapshot
    })
  } catch (error) {
    console.error('Failed to create memory snapshot:', error)
    res.status(500).json({ error: 'Failed to create memory snapshot' })
  }
})

// Get memory snapshots
router.get('/agents/:id/memory/snapshots', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = paramId(req)
    const limit = parseInt(req.query.limit as string) || 10
    
    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    const snapshots = await memoryService.getSnapshots(agentId, limit)
    
    res.json({ 
      agentId,
      snapshots
    })
  } catch (error) {
    console.error('Failed to get memory snapshots:', error)
    res.status(500).json({ error: 'Failed to get memory snapshots' })
  }
})

// Restore from memory snapshot
router.post('/agents/:id/memory/snapshots/:snapshotId/restore', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = paramId(req)
    const snapshotId = req.params.snapshotId as string
    
    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    await memoryService.restoreFromSnapshot(agentId, snapshotId)
    
    // Sync restored memory to filesystem
    await memoryService.syncToFileSystem(agentId)
    
    res.json({ 
      success: true,
      message: 'Memory restored from snapshot successfully'
    })
  } catch (error) {
    console.error('Failed to restore from snapshot:', error)
    res.status(500).json({ error: 'Failed to restore from snapshot' })
  }
})

// Sync memory from filesystem (useful after agent restarts)
router.post('/agents/:id/memory/sync-from-filesystem', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = paramId(req)
    
    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    await memoryService.syncFromFileSystem(agentId)
    
    res.json({ 
      success: true,
      message: 'Memory synced from filesystem successfully'
    })
  } catch (error) {
    console.error('Failed to sync memory from filesystem:', error)
    res.status(500).json({ error: 'Failed to sync memory from filesystem' })
  }
})

// Sync memory to filesystem (useful before agent restarts)
router.post('/agents/:id/memory/sync-to-filesystem', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = paramId(req)
    
    // Verify agent ownership
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: req.userId }
    })
    
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' })
      return
    }

    await memoryService.syncToFileSystem(agentId)
    
    res.json({ 
      success: true,
      message: 'Memory synced to filesystem successfully'
    })
  } catch (error) {
    console.error('Failed to sync memory to filesystem:', error)
    res.status(500).json({ error: 'Failed to sync memory to filesystem' })
  }
})

export default router