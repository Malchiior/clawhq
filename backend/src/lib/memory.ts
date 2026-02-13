// @ts-nocheck
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import prisma from './prisma'

export interface MemoryFile {
  filePath: string
  content: string
  checksum: string
}

export interface MemorySnapshot {
  id: string
  snapshotType: string
  description?: string
  files: MemoryFile[]
  createdAt: Date
}

class MemoryService {
  private getAgentMemoryDir(agentId: string): string {
    return `/var/lib/clawhq/agents/${agentId}/memory`
  }

  private calculateChecksum(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex')
  }

  async createSnapshot(agentId: string, snapshotType: string = 'manual', description?: string): Promise<MemorySnapshot> {
    // Get all current memory files for the agent
    const memoryFiles = await prisma.agentMemory.findMany({
      where: { agentId, isActive: true },
      orderBy: { filePath: 'asc' }
    })

    const files: MemoryFile[] = memoryFiles.map(file => ({
      filePath: file.filePath,
      content: file.content,
      checksum: file.checksum || this.calculateChecksum(file.content)
    }))

    // Get agent configuration for context
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        model: true,
        systemPrompt: true,
        temperature: true,
        maxTokens: true
      }
    })

    const metadata = {
      fileCount: files.length,
      totalSizeBytes: files.reduce((sum, file) => sum + file.content.length, 0),
      agentConfig: agent
    }

    // Create snapshot record
    const snapshot = await prisma.agentSnapshot.create({
      data: {
        agentId,
        snapshotType,
        description,
        memoryFiles: files as any,
        config: agent as any,
        metadata: metadata as any
      }
    })

    return {
      id: snapshot.id,
      snapshotType: snapshot.snapshotType,
      description: snapshot.description || undefined,
      files,
      createdAt: snapshot.createdAt
    }
  }

  async restoreFromSnapshot(agentId: string, snapshotId: string): Promise<void> {
    const snapshot = await prisma.agentSnapshot.findFirst({
      where: { id: snapshotId, agentId }
    })

    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found for agent ${agentId}`)
    }

    const files = snapshot.memoryFiles as unknown as MemoryFile[]

    // Clear existing memory files
    await prisma.agentMemory.updateMany({
      where: { agentId },
      data: { isActive: false }
    })

    // Restore files from snapshot
    for (const file of files) {
      await this.saveMemoryFile(agentId, file.filePath, file.content)
    }
  }

  async saveMemoryFile(agentId: string, filePath: string, content: string): Promise<void> {
    const checksum = this.calculateChecksum(content)
    const fileSize = Buffer.byteLength(content, 'utf8')

    await prisma.agentMemory.upsert({
      where: { 
        agentId_filePath: { agentId, filePath }
      },
      update: {
        content,
        fileSize,
        checksum,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        agentId,
        filePath,
        content,
        fileSize,
        checksum,
        isActive: true
      }
    })
  }

  async getMemoryFile(agentId: string, filePath: string): Promise<string | null> {
    const file = await prisma.agentMemory.findFirst({
      where: { agentId, filePath, isActive: true }
    })

    return file?.content || null
  }

  async listMemoryFiles(agentId: string): Promise<Array<{filePath: string, fileSize: number, updatedAt: Date}>> {
    const files = await prisma.agentMemory.findMany({
      where: { agentId, isActive: true },
      select: { filePath: true, fileSize: true, updatedAt: true },
      orderBy: { filePath: 'asc' }
    })

    return files
  }

  async deleteMemoryFile(agentId: string, filePath: string): Promise<void> {
    await prisma.agentMemory.updateMany({
      where: { agentId, filePath },
      data: { isActive: false }
    })
  }

  async syncToFileSystem(agentId: string): Promise<void> {
    const memoryDir = this.getAgentMemoryDir(agentId)
    
    // Ensure memory directory exists
    await fs.mkdir(memoryDir, { recursive: true })

    // Get all active memory files
    const memoryFiles = await prisma.agentMemory.findMany({
      where: { agentId, isActive: true }
    })

    // Write each file to the filesystem
    for (const file of memoryFiles) {
      const fullPath = path.join(memoryDir, file.filePath)
      const dir = path.dirname(fullPath)
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true })
      
      // Write file content
      await fs.writeFile(fullPath, file.content, 'utf8')
    }
  }

  async syncFromFileSystem(agentId: string): Promise<void> {
    const memoryDir = this.getAgentMemoryDir(agentId)
    
    try {
      await fs.access(memoryDir)
    } catch {
      // Memory directory doesn't exist yet
      return
    }

    const files = await this.walkDirectory(memoryDir)
    
    for (const fullPath of files) {
      const relativePath = path.relative(memoryDir, fullPath)
      const content = await fs.readFile(fullPath, 'utf8')
      
      await this.saveMemoryFile(agentId, relativePath, content)
    }
  }

  private async walkDirectory(dir: string): Promise<string[]> {
    const files: string[] = []
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory()) {
        const subFiles = await this.walkDirectory(fullPath)
        files.push(...subFiles)
      } else {
        files.push(fullPath)
      }
    }

    return files
  }

  async getSnapshots(agentId: string, limit: number = 10): Promise<MemorySnapshot[]> {
    const snapshots = await prisma.agentSnapshot.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return snapshots.map(snapshot => ({
      id: snapshot.id,
      snapshotType: snapshot.snapshotType,
      description: snapshot.description || undefined,
      files: snapshot.memoryFiles as unknown as MemoryFile[],
      createdAt: snapshot.createdAt
    }))
  }

  async cleanupOldSnapshots(agentId: string, keepCount: number = 10): Promise<void> {
    // Get snapshots to delete (keeping the most recent ones)
    const snapshotsToDelete = await prisma.agentSnapshot.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      skip: keepCount
    })

    if (snapshotsToDelete.length > 0) {
      await prisma.agentSnapshot.deleteMany({
        where: {
          id: {
            in: snapshotsToDelete.map(s => s.id)
          }
        }
      })
    }
  }

  async getTotalMemorySize(agentId: string): Promise<number> {
    const result = await prisma.agentMemory.aggregate({
      where: { agentId, isActive: true },
      _sum: { fileSize: true }
    })

    return result._sum.fileSize || 0
  }
}

export const memoryService = new MemoryService()
export default memoryService
