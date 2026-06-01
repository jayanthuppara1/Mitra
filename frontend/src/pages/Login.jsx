import { useState } from 'react'
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/useAuth'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const { user, loading: authLoading } = useAuth()
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      if (data.user) {
        const { error: upsertError } = await supabase.from('users').upsert({
          id: data.user.id,
          email: data.user.email,
          display_name: email.split('@')[0],
        }, { onConflict: 'id' })
        if (upsertError) {
          console.error('Profile creation failed:', upsertError.message)
        }
      }
      if (!data.session) {
        setMessage('Check your email for a confirmation link before signing in.')
        setLoading(false)
        return
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    navigate(next, { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Mitra</h1>
          <p className="mt-2 text-gray-400 text-sm">
            Plan together. Live together. Remember together.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="6+ characters"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {message && (
            <p className="text-green-400 text-sm">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium transition"
          >
            {loading
              ? 'Please wait...'
              : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          onClick={() => { setIsSignup(!isSignup); setError(''); setMessage('') }}
          className="mt-6 w-full text-center text-sm text-gray-500 hover:text-gray-300 transition"
        >
          {isSignup
            ? 'Already have an account? Sign in'
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  )
}
