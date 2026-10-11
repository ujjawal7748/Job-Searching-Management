import { NavLink } from 'react-router-dom'

function Navbar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-2 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${isActive
      ? 'bg-purple-100 text-purple-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-3 py-3 sm:flex-row sm:justify-between sm:gap-4 sm:px-6">
        <NavLink to="/" className="text-xl font-bold text-slate-900">
          AI Job Tracker
        </NavLink>

        <div className="flex w-full flex-wrap items-center justify-center gap-1 sm:w-auto sm:gap-2">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>

          <NavLink to="/resume-match" className={linkClass}>
            Resume Match AI
          </NavLink>

          <NavLink to="/analytics" className={linkClass}>
            Analytics
          </NavLink>

          <NavLink to="/cover-letter" className={linkClass}>
            AI Cover Letter
          </NavLink>
        </div>
      </div>
    </nav>
  )
}

export default Navbar