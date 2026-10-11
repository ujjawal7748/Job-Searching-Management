import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/authState'
import Navbar from './components/Navbar'
import Dashboard from './pages/dashboard'
import ResumeMatch from './pages/ResumeMatch'
import Analytics from './pages/Analytics'
import CoverLetter from './pages/CoverLetter'
import Auth from './pages/Auth'
import { getSupabase } from './lib/supabase'

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
      <Navbar email={session.user.email ?? ''} onSignOut={() => void handleSignOut()} />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/resume-match" element={<ResumeMatch />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/cover-letter" element={<CoverLetter />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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