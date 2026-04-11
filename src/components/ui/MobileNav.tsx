import { useLocation, Link } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/', label: 'Panel', icon: '⊞' },
  { path: '/maquinas', label: 'Máq.', icon: '⚙' },
  { path: '/trabajadores', label: 'Equipo', icon: '⊡' },
  { path: '/alertas', label: 'Alert.', icon: '▲' },
]

export default function MobileNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-0 border-t border-border-subtle z-30 lg:hidden">
      <div className="flex items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map(({ path, label, icon }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`
                flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg text-[10px] font-medium
                no-underline transition-colors
                ${isActive
                  ? 'text-primary bg-primary-muted'
                  : 'text-text-tertiary'
                }
              `}
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
