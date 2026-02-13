// Vercel Serverless Function - Waitlist signup
// Stores emails in a simple JSON file for now, upgrades to Neon DB later

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' })
    }

    // For now, just log it and return success
    // TODO: Store in Neon DB once DATABASE_URL is available
    console.log(`[WAITLIST] New signup: ${email} at ${new Date().toISOString()}`)

    return res.status(200).json({
      success: true,
      message: 'Added to waitlist!'
    })
  } catch (error) {
    console.error('Waitlist error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
