import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Mail, Lock, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { track } from '../lib/analytics'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const result = await signup(email, password, name, '')
      track('user_signed_up', {})
      if (result.needsVerification) {
        setSuccess('Account created! Check your email to verify your account.')
      } else {
        navigate('/setup')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 mb-4">
            <Zap className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">Create your account</h1>
          <p className="text-text-secondary mt-1">Get started with ClawHQ for free</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">

          {error && <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{error}</div>}
          {success && <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-navy/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50" placeholder="John Doe" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-navy/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50" placeholder="you@company.com" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-navy/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50" placeholder="Min 8 characters" required minLength={8} />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-secondary mt-6">
          Already have an account? <Link to="/login" className="text-primary hover:text-primary-hover font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
