import { Request, Response, NextFunction } from 'express'
import { validateSession } from '../lib/session'

export interface AuthRequest extends Request {
  userId?: string
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' })
    return
  }

  try {
    const token = header.slice(7)
    const userId = await validateSession(token)
    
    if (!userId) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }
    
    req.userId = userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
