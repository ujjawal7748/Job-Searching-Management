import { useState } from 'react'
import type { FormEvent } from 'react'
import { getSupabase } from '../lib/supabase'
import { useAuth } from '../auth/authState'

function Auth() {
  const { error: sessionError, isConfigured } = useAuth()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const client = getSupabase()
      const result = mode === 'sign-in'
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({ email, password })

      if (result.error) {
        throw result.error
      }

      if (mode === 'sign-up' && !result.data.session) {
        setMessage('Check your email to confirm your account, then sign in.')
      }
    } catch {
      setError(
        mode === 'sign-in'
          ? 'Could not sign in. Check your email and password and try again.'
          : 'Could not create your account. Check the details and try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-slate-50 px-4 py-8">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {!isConfigured ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900">
              Cloud storage setup required
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Configure <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> locally, or{' '}
              <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> on
              Vercel.
            </p>
          </>
        ) : (
          <>
        <h1 className="text-2xl font-bold text-slate-900">
          {mode === 'sign-in' ? 'Sign in to AI Job Tracker' : 'Create your account'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Your jobs sync securely across your signed-in devices.
        </p>

        {(sessionError || error) && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error || sessionError}
          </p>
        )}
        {message && (
          <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            {message}
          </p>
        )}

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
          <div>
            <label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-3"
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-2 my-auto h-9 rounded-md px-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? 'Please wait...'
              : mode === 'sign-in'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((current) => current === 'sign-in' ? 'sign-up' : 'sign-in')
            setError('')
            setMessage('')
          }}
          className="mt-5 w-full text-sm font-medium text-purple-700 hover:text-purple-800"
        >
          {mode === 'sign-in'
            ? 'New here? Create an account'
            : 'Already have an account? Sign in'}
        </button>
          </>
        )}
      </section>
    </main>
  )
}

export default Auth
