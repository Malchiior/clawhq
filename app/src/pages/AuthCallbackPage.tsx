import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, CheckCircle, AlertCircle } from 'lucide-react'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')
    
    if (error) {
      // Handle OAuth error
      console.error('OAuth error:', error)
      navigate('/login?error=oauth_failed')
      return
    }
    
    if (token) {
      // Store token and redirect to dashboard
      localStorage.setItem('clawhq_token', token)
      
      // Trigger a storage event to update AuthContext
      window.dispatchEvent(new Event('storage'))
      
      // Small delay to ensure AuthContext updates
      setTimeout(() => {
        navigate('/dashboard')
      }, 100)
    } else {
      // No token provided
      navigate('/login?error=no_token')
    }
  }, [navigate, searchParams])

  const error = searchParams.get('error')

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
          <Zap className="w-8 h-8 text-primary" />
        </div>
        
        {error ? (
          <>
            <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-text mb-2">Authentication Failed</h1>
            <p className="text-text-secondary">
              {error === 'oauth_failed' && 'Google authentication was not successful.'}
              {error === 'oauth_error' && 'An error occurred during authentication.'}
              {error === 'no_token' && 'No authentication token received.'}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 bg-primary hover:bg-primary-hover text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-text mb-2">Signing you in...</h1>
            <p className="text-text-secondary">Please wait while we complete your authentication.</p>
            <div className="mt-6 flex justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}