import { NavLink } from 'react-router-dom'

type NavbarProps = {
  email: string
  onSignOut: () => void
}

function Navbar({ email, onSignOut }: NavbarProps) {
  function prefetchPage(path: string) {
    if (path === '/') void import('../pages/dashboard')
    if (path === '/resume-match') void import('../pages/ResumeMatch')
    if (path === '/analytics') void import('../pages/Analytics')
    if (path === '/cover-letter') void import('../pages/CoverLetter')
  }

  const prefetchOnIntent = (path: string) => ({
    onMouseEnter: () => prefetchPage(path),
    onFocus: () => prefetchPage(path),
    onTouchStart: () => prefetchPage(path),
  })

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-2 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${isActive
      ? 'bg-purple-100 text-purple-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-3 py-3 sm:flex-row sm:justify-between sm:gap-4 sm:px-6">
        <NavLink to="/" {...prefetchOnIntent('/')} className="text-xl font-bold text-slate-900">
          AI Job Tracker
        </NavLink>

        <div className="flex w-full flex-wrap items-center justify-center gap-1 sm:w-auto sm:justify-end sm:gap-2">
          <div className="flex w-full flex-wrap items-center justify-center gap-1 sm:w-auto sm:gap-2">
            <NavLink to="/" end {...prefetchOnIntent('/')} className={linkClass}>
              Dashboard
            </NavLink>

            <NavLink to="/resume-match" {...prefetchOnIntent('/resume-match')} className={linkClass}>
              Resume Match AI
            </NavLink>

            <NavLink to="/analytics" {...prefetchOnIntent('/analytics')} className={linkClass}>
              Analytics
            </NavLink>

            <NavLink to="/cover-letter" {...prefetchOnIntent('/cover-letter')} className={linkClass}>
              AI Cover Letter
            </NavLink>
          </div>
          <span className="hidden max-w-40 truncate text-xs text-slate-500 lg:block" title={email}>
            {email}
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-lg px-2 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 sm:px-3 sm:text-sm"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar