import { Router, Response } from 'express'
import crypto from 'crypto'
import dns from 'dns'
import { promisify } from 'util'
import prisma from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'

const resolveTxt = promisify(dns.resolveTxt)
const resolveCname = promisify(dns.resolveCname)

const router = Router()
router.use(authenticate)

// GET /api/domains - Get current domain config
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        customDomain: true,
        customDomainVerified: true,
        customDomainToken: true,
        plan: true,
      },
    })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    res.json({
      domain: user.customDomain,
      verified: user.customDomainVerified,
      verificationToken: user.customDomainToken,
      plan: user.plan,
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/domains - Set a custom domain (generates verification token)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { domain } = req.body
    if (!domain || typeof domain !== 'string') {
      res.status(400).json({ error: 'Domain is required' }); return
    }

    // Basic domain validation
    const cleaned = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(cleaned)) {
      res.status(400).json({ error: 'Invalid domain format. Use something like agents.yourdomain.com' }); return
    }

    // Check plan allows custom domains (business+)
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }
    if (!['business', 'enterprise'].includes(user.plan)) {
      res.status(403).json({ error: 'Custom domains require a Business or Enterprise plan' }); return
    }

    // Check domain not already taken by another user
    const existing = await prisma.user.findFirst({
      where: { customDomain: cleaned, id: { not: req.userId } },
    })
    if (existing) {
      res.status(409).json({ error: 'This domain is already in use by another account' }); return
    }

    // Generate verification token
    const token = `clawhq-verify-${crypto.randomBytes(16).toString('hex')}`

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        customDomain: cleaned,
        customDomainVerified: false,
        customDomainToken: token,
      },
    })

    res.json({
      domain: updated.customDomain,
      verified: false,
      verificationToken: token,
      dnsInstructions: {
        txt: {
          type: 'TXT',
          name: `_clawhq-verification.${cleaned}`,
          value: token,
          purpose: 'Proves you own this domain',
        },
        cname: {
          type: 'CNAME',
          name: cleaned,
          value: 'custom.clawhq.dev',
          purpose: 'Routes traffic to your ClawHQ agents',
        },
      },
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/domains/verify - Check DNS records and mark as verified
router.post('/verify', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user || !user.customDomain || !user.customDomainToken) {
      res.status(400).json({ error: 'No custom domain configured' }); return
    }

    const domain = user.customDomain
    const token = user.customDomainToken
    const errors: string[] = []
    let txtVerified = false
    let cnameVerified = false

    // Check TXT record
    try {
      const txtRecords = await resolveTxt(`_clawhq-verification.${domain}`)
      const flatRecords = txtRecords.map(r => r.join(''))
      txtVerified = flatRecords.some(r => r === token)
      if (!txtVerified) {
        errors.push(`TXT record found but value doesn't match. Expected: ${token}`)
      }
    } catch (e: any) {
      if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') {
        errors.push(`No TXT record found at _clawhq-verification.${domain}`)
      } else {
        errors.push(`DNS lookup failed for TXT record: ${e.message}`)
      }
    }

    // Check CNAME record
    try {
      const cnameRecords = await resolveCname(domain)
      cnameVerified = cnameRecords.some(r =>
        r.toLowerCase().replace(/\.$/, '') === 'custom.clawhq.dev'
      )
      if (!cnameVerified) {
        errors.push(`CNAME record found but points to ${cnameRecords[0]} instead of custom.clawhq.dev`)
      }
    } catch (e: any) {
      if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') {
        errors.push(`No CNAME record found for ${domain}. Point it to custom.clawhq.dev`)
      } else {
        errors.push(`DNS lookup failed for CNAME: ${e.message}`)
      }
    }

    const verified = txtVerified && cnameVerified

    if (verified) {
      await prisma.user.update({
        where: { id: req.userId },
        data: { customDomainVerified: true },
      })
    }

    res.json({
      verified,
      checks: {
        txt: { passed: txtVerified, record: `_clawhq-verification.${domain}` },
        cname: { passed: cnameVerified, record: domain, target: 'custom.clawhq.dev' },
      },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/domains - Remove custom domain
router.delete('/', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        customDomain: null,
        customDomainVerified: false,
        customDomainToken: null,
      },
    })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
