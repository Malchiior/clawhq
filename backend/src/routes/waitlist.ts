import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    if (!email) { res.status(400).json({ error: 'Email required' }); return }

    await prisma.waitlistEntry.upsert({
      where: { email },
      create: { email },
      update: {},
    })

    res.json({ success: true, message: 'Added to waitlist!' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
