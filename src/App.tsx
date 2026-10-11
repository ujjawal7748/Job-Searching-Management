import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/dashboard'
import ResumeMatch from './pages/ResumeMatch'
import Analytics from './pages/Analytics'
import CoverLetter from './pages/CoverLetter'


function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/resume-match" element={<ResumeMatch />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/cover-letter" element={<CoverLetter />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App