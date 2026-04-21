import { useLocation, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import TrabajadorAvatar from './TrabajadorAvatar'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: GridIcon },
  { path: '/maquinas', label: 'Máquinas', icon: CpuIcon },
  { path: '/trabajadores', label: 'Trabajadores', icon: UsersIcon },
  { path: '/alertas', label: 'Alertas', icon: BellIcon },
  { path: '/auditoria', label: 'Auditoría', icon: ClipboardIcon },
  { path: '/informes', label: 'Informes', icon: ChartIcon },
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    toast.success('Sesión cerrada')
    navigate('/login', { replace: true })
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-surface-0 border-r border-border-subtle flex flex-col z-30 lg:flex">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <img src="/logo-f.png" alt="" className="h-7 w-auto" />
          <div>
            <span className="text-[15px] font-bold text-text-primary tracking-tight">Fresatitan</span>
            <span className="text-[15px] font-light text-primary ml-1">OPS</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-medium
                transition-colors duration-150 no-underline
                ${isActive
                  ? 'bg-primary-muted text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
                }
              `}
            >
              <Icon size={16} active={isActive} />
              {label}
            </Link>
          )
        })}

        {/* Separador y acceso rápido al Panel */}
        <div className="pt-3 mt-3 border-t border-border-subtle">
          <a
            href="/panel"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-medium text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors no-underline"
          >
            <TabletIcon size={16} />
            Abrir Panel Planta
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="ml-auto">
              <path d="M6 3H3v10h10V10" />
              <polyline points="10,3 13,3 13,6" />
              <line x1="7" y1="9" x2="13" y2="3" />
            </svg>
          </a>
        </div>
      </nav>

      {/* Footer — usuario actual */}
      <div className="px-3 py-3 border-t border-border-subtle">
        {user ? (
          <div className="bg-surface-3 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
            <TrabajadorAvatar trabajador={{ nombre: user.nombre, apellidos: '' }} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-text-primary truncate">{user.nombre}</div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-primary">{user.role}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="text-text-tertiary hover:text-averia transition-colors p-1 -mr-1"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3" />
                <polyline points="10,11 14,8 10,5" />
                <line x1="14" y1="8" x2="6" y2="8" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-activa" />
            <span className="text-[10px] text-text-tertiary font-mono">SISTEMA ACTIVO</span>
          </div>
        )}
      </div>
    </aside>
  )
}

/* === Inline Icons (SVG, no deps) === */
function GridIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={active ? '#D09A40' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  )
}

function CpuIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={active ? '#D09A40' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
      <rect x="5.5" y="5.5" width="5" height="5" rx="0.5" />
      <line x1="8" y1="1" x2="8" y2="3" /><line x1="8" y1="13" x2="8" y2="15" />
      <line x1="1" y1="8" x2="3" y2="8" /><line x1="13" y1="8" x2="15" y2="8" />
    </svg>
  )
}


function BellIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={active ? '#D09A40' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6a4 4 0 0 1 8 0c0 4 2 5 2 5H2s2-1 2-5" />
      <path d="M6.5 13a1.5 1.5 0 0 0 3 0" />
    </svg>
  )
}

function TabletIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={active ? '#D09A40' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="1" width="12" height="14" rx="2" />
      <line x1="8" y1="12" x2="8" y2="12.01" strokeWidth="2" />
    </svg>
  )
}

function UsersIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={active ? '#D09A40' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
      <circle cx="11.5" cy="5.5" r="1.8" />
      <path d="M14.5 14c0-1.8-1.2-3.2-3-3.5" />
    </svg>
  )
}

function ChartIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={active ? '#D09A40' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="14" x2="4" y2="8" /><line x1="8" y1="14" x2="8" y2="4" /><line x1="12" y1="14" x2="12" y2="6" />
    </svg>
  )
}

function ClipboardIcon({ size = 16, active }: { size?: number; active?: boolean }) {
  const color = active ? '#D09A40' : 'currentColor'
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="2.5" width="9" height="12" rx="1" />
      <rect x="6" y="1" width="4" height="2.5" rx="0.5" />
      <line x1="5.5" y1="7" x2="10.5" y2="7" />
      <line x1="5.5" y1="10" x2="10.5" y2="10" />
      <line x1="5.5" y1="12.5" x2="8.5" y2="12.5" />
    </svg>
  )
}
