import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import prisma from './prisma'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value
        if (!email) {
          return done(new Error('No email from Google'), undefined)
        }

        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { email }
        })

        if (user) {
          // Update Google ID if not set and mark email as verified
          if (!user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { 
                googleId: profile.id,
                avatarUrl: profile.photos?.[0]?.value || user.avatarUrl,
                name: user.name || profile.displayName,
                emailVerified: true, // OAuth emails are pre-verified
                emailVerificationToken: null,
                emailVerificationExpires: null
              }
            })
          } else if (!user.emailVerified) {
            // Mark existing OAuth user as verified
            user = await prisma.user.update({
              where: { id: user.id },
              data: { emailVerified: true }
            })
          }
        } else {
          // Create new user with verified email
          user = await prisma.user.create({
            data: {
              email,
              googleId: profile.id,
              name: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value,
              plan: 'free',
              brandColor: '#3B82F6', // Default blue
              emailVerified: true // OAuth emails are pre-verified
            }
          })
        }

        return done(null, user)
      } catch (error) {
        return done(error, undefined)
      }
    }
  )
)
} else {
  console.warn('Google OAuth disabled: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set')
}

passport.serializeUser((user: any, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

export default passport