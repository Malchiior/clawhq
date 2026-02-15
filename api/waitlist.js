import { neon } from '@neondatabase/serverless'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { email } = req.body
    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Valid email required' })
    }

    const sanitized = email.trim().toLowerCase()

    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      console.error('[WAITLIST] DATABASE_URL not set')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const sql = neon(dbUrl)
    await sql`
      INSERT INTO "WaitlistEntry" (id, email, "createdAt")
      VALUES (gen_random_uuid()::text, ${sanitized}, NOW())
      ON CONFLICT (email) DO NOTHING
    `

    console.log(`[WAITLIST] Signup: ${sanitized}`)
    return res.status(200).json({ success: true, message: 'You\'re on the list! We\'ll be in touch soon.' })
  } catch (error) {
    console.error('[WAITLIST] Error:', error)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
