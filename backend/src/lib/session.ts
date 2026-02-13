import jwt from 'jsonwebtoken'
import crypto from 'crypto'
const uuidv4 = () => crypto.randomUUID()
import prisma from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-dev-secret'

// Token lifespans
const ACCESS_TOKEN_LIFETIME = '15m' // 15 minutes
const REFRESH_TOKEN_LIFETIME = '7d' // 7 days

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  refreshExpiresAt: Date
}

export interface SessionInfo {
  userAgent?: string
  ipAddress?: string
}

export function generateTokenPair(userId: string): TokenPair {
  const jti = uuidv4() // JWT ID for session tracking
  const refreshJti = uuidv4()
  
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
  
  const accessToken = jwt.sign(
    { userId, jti, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_LIFETIME }
  )
  
  const refreshToken = jwt.sign(
    { userId, jti: refreshJti, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_LIFETIME }
  )
  
  return {
    accessToken,
    refreshToken,
    expiresAt,
    refreshExpiresAt
  }
}

export async function createSession(
  userId: string, 
  sessionInfo: SessionInfo = {}
): Promise<TokenPair> {
  const tokens = generateTokenPair(userId)
  
  // Store session in database
  await prisma.session.create({
    data: {
      userId,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      refreshExpiresAt: tokens.refreshExpiresAt,
      userAgent: sessionInfo.userAgent,
      ipAddress: sessionInfo.ipAddress,
    }
  })
  
  return tokens
}

export async function refreshSession(refreshTokenInput: string): Promise<TokenPair | null> {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshTokenInput, REFRESH_SECRET) as any
    if (decoded.type !== 'refresh') {
      return null
    }
    
    // Find session in database
    const session = await prisma.session.findUnique({
      where: { 
        refreshToken: refreshTokenInput,
        isRevoked: false
      },
      include: { user: true }
    })
    
    if (!session || session.refreshExpiresAt < new Date()) {
      return null
    }
    
    // Generate new token pair
    const newTokens = generateTokenPair(session.userId)
    
    // Update session with new tokens
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresAt: newTokens.expiresAt,
        refreshExpiresAt: newTokens.refreshExpiresAt,
        lastUsedAt: new Date()
      }
    })
    
    return newTokens
  } catch (error) {
    return null
  }
}

export async function revokeSession(token: string): Promise<boolean> {
  try {
    const session = await prisma.session.findUnique({
      where: { token }
    })
    
    if (!session) return false
    
    await prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true }
    })
    
    return true
  } catch (error) {
    return false
  }
}

export async function revokeAllUserSessions(userId: string): Promise<number> {
  try {
    const result = await prisma.session.updateMany({
      where: { 
        userId,
        isRevoked: false 
      },
      data: { isRevoked: true }
    })
    
    return result.count
  } catch (error) {
    return 0
  }
}

export async function validateSession(token: string): Promise<string | null> {
  try {
    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (decoded.type !== 'access') {
      return null
    }
    
    // Check if session exists and is not revoked
    const session = await prisma.session.findUnique({
      where: { 
        token,
        isRevoked: false
      }
    })
    
    if (!session || session.expiresAt < new Date()) {
      return null
    }
    
    // Update last used timestamp
    await prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() }
    })
    
    return decoded.userId
  } catch (error) {
    return null
  }
}

export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { refreshExpiresAt: { lt: new Date() } },
          { isRevoked: true }
        ]
      }
    })
    
    return result.count
  } catch (error) {
    return 0
  }
}

export async function getUserSessions(userId: string) {
  return prisma.session.findMany({
    where: { 
      userId,
      isRevoked: false,
      expiresAt: { gt: new Date() }
    },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      lastUsedAt: true,
      createdAt: true,
      expiresAt: true
    },
    orderBy: { lastUsedAt: 'desc' }
  })
}
