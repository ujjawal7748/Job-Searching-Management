import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/authState'
import Navbar from './components/Navbar'
import Auth from './pages/Auth'
import { getSupabase } from './lib/supabase'

const Dashboard = lazy(() => import('./pages/dashboard'))
const ResumeMatch = lazy(() => import('./pages/ResumeMatch'))
const Analytics = lazy(() => import('./pages/Analytics'))
const CoverLetter = lazy(() => import('./pages/CoverLetter'))

function PageLoading() {
  return (
    <main className="mx-auto max-w-7xl p-6" aria-live="polite">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-8 h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </main>
  )
}

function AppContent() {
  const { session, isLoading } = useAuth()
  const queryClient = useQueryClient()
  const [authActionError, setAuthActionError] = useState('')

  async function handleSignOut() {
    setAuthActionError('')
    try {
      const { error } = await getSupabase().auth.signOut()
      if (error) throw error
      queryClient.clear()
    } catch {
      setAuthActionError('Could not sign out. Please try again.')
    }
  }

  if (isLoading) {
    return <main className="p-6 text-center text-slate-600">Restoring your session...</main>
  }

  if (!session) {
    return (
      <>
        {authActionError && (
          <p role="alert" className="mx-auto mt-4 max-w-md rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {authActionError}
          </p>
        )}
        <Auth />
      </>
    )
  }

  return (
    <>
      <Navbar
        email={session.user.email ?? ''}
        onSignOut={() => void handleSignOut()}
      />

      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/resume-match" element={<ResumeMatch />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/cover-letter" element={<CoverLetter />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App