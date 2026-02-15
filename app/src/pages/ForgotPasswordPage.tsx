import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { apiFetch } from '../lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 mb-4">
            <Zap className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">Reset your password</h1>
          <p className="text-text-secondary mt-1">
            {sent ? 'Check your email' : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/20 mx-auto">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <p className="text-sm text-text-secondary">
                If an account exists for <strong className="text-text">{email}</strong>, you'll receive a password reset link shortly. The link expires in 1 hour.
              </p>
              <p className="text-xs text-text-muted">
                Didn't get the email? Check your spam folder or try again.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-primary hover:text-primary-hover transition-colors font-medium"
              >
                Try another email
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-navy/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="you@company.com"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-text-secondary mt-6">
          <Link to="/login" className="text-primary hover:text-primary-hover transition-colors font-medium inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
