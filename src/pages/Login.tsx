import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import TrabajadorAvatar from '../components/ui/TrabajadorAvatar'
import { IconMill, IconSinter, IconPrinter3D } from '../components/ui/icons'
import toast from 'react-hot-toast'

/**
 * Login — pantalla partida (rediseño julio 2026).
 *
 * Izquierda: panel de marca en oscuro FIJO (no sigue al tema, como el taller
 * físico): retícula técnica de fondo, claim y las tres áreas de la planta
 * (fresado / sinterizado / impresión 3D) como fila discreta de iconos.
 * Derecha: formulario limpio sobre tokens del tema. En móvil el panel visual
 * se oculta y queda el formulario con el logo.
 */

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const loginAs = useAuthStore((s) => s.loginAs)
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const hasSupabase = useAuthStore((s) => s.hasSupabase())
  const devAdmins = useAuthStore((s) => s.getDevAdmins())

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  const redirectAfterLogin = () => {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    navigate(from, { replace: true })
  }

  const handleDevLogin = async (adminId: string, nombre: string) => {
    await loginAs(adminId)
    toast.success(`Bienvenida, ${nombre}`)
    redirectAfterLogin()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await login(email, password)
    if (!result.ok) {
      toast.error(result.error ?? 'No se pudo iniciar sesión')
      return
    }
    toast.success('Sesión iniciada')
    redirectAfterLogin()
  }

  return (
    <div className="min-h-screen flex bg-surface-1">
      {/* ================= Panel de marca (oculto en móvil) ================= */}
      <aside
        className="hidden lg:flex flex-col justify-between w-[46%] max-w-[640px] p-12 relative overflow-hidden"
        style={{ backgroundColor: '#12100C', color: '#F0EDE6' }}
      >
        {/* Retícula técnica de fondo */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(208,154,64,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(208,154,64,0.07) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            maskImage: 'radial-gradient(ellipse 90% 80% at 30% 20%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 30% 20%, black 40%, transparent 100%)',
          }}
        />

        {/* Marca */}
        <div className="relative flex items-center gap-3">
          <img src="/logo-f.png" alt="" className="h-9 w-auto" />
          <div className="leading-none">
            <span className="text-[19px] font-bold tracking-tight">Fresatitan</span>
            <span className="text-[19px] font-medium ml-1.5" style={{ color: '#D09A40' }}>OPS</span>
            <div className="text-[10px] uppercase tracking-[0.22em] mt-1" style={{ color: '#8F877A' }}>
              Control de planta · CAD-CAM dental
            </div>
          </div>
        </div>

        {/* Claim + muro de placas */}
        <div className="relative">
          <h1 className="text-[42px] font-bold leading-[1.08] tracking-tight">
            Toda la planta,
            <br />
            <span style={{ color: '#D09A40' }}>en tiempo real.</span>
          </h1>
          <p className="text-[14px] leading-relaxed mt-4 max-w-[380px]" style={{ color: '#A89F90' }}>
            Cada máquina del laboratorio con su etiqueta, su estado y su historial.
            Fresado, sinterizado e impresión 3D bajo un mismo panel.
          </p>

          {/* Las tres áreas de la planta — discreto, sin protagonismo */}
          <div className="flex items-center gap-7 mt-9">
            {([
              { Icon: IconMill, label: 'Fresado' },
              { Icon: IconSinter, label: 'Sinterizado' },
              { Icon: IconPrinter3D, label: 'Impresión 3D' },
            ] as const).map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-2" style={{ color: '#8F877A' }}>
                <Icon size={17} style={{ color: '#D09A40', opacity: 0.75 }} />
                <span className="text-[12px]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie del panel */}
        <div className="relative flex items-center gap-2 text-[11px]" style={{ color: '#6E6659' }}>
          <span>FRESATITAN, S.L.</span>
          <span aria-hidden>·</span>
          <span>Laboratorio dental CAD-CAM</span>
        </div>
      </aside>

      {/* ================= Formulario ================= */}
      <main className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          {/* Logo (solo cuando el panel visual está oculto) */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src="/logo-f.png" alt="" className="h-12 w-auto mb-3" />
            <div>
              <span className="text-xl font-bold text-text-primary tracking-tight">Fresatitan</span>
              <span className="text-xl font-medium text-primary-ink ml-1.5">OPS</span>
            </div>
          </div>

          <div className="mb-7 text-center lg:text-left">
            <h2 className="text-[24px] font-bold text-text-primary tracking-tight">
              Panel de administración
            </h2>
            <p className="text-[13.5px] text-text-secondary mt-1.5">
              Entra con tu cuenta para gestionar la planta.
            </p>
          </div>

          {/* Form email/password — activo solo si Supabase está configurado */}
          <form onSubmit={handleSubmit}>
            {!hasSupabase && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary bg-surface-3 px-1.5 py-0.5 rounded">
                  NO CONECTADO
                </span>
                <span className="text-[11px] text-text-tertiary">Supabase no configurado</span>
              </div>
            )}

            <div className={`space-y-4 ${hasSupabase ? '' : 'opacity-50'}`}>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="toni@fresatitan.com"
                  disabled={!hasSupabase || loading}
                  className="input-field !py-2.5 !text-[14px]"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={!hasSupabase || loading}
                  className="input-field !py-2.5 !text-[14px]"
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={!hasSupabase || loading || !email || !password}
                className="w-full py-3 rounded-lg text-[14.5px] font-bold bg-primary text-[#1F1608] hover:bg-primary-light active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Entrando...' : 'Iniciar sesión'}
              </button>
            </div>
          </form>

          {/* DEV — selección directa de admin (para pruebas) */}
          {devAdmins.length > 0 && (
            <div className="mt-7 pt-6 border-t border-border-subtle">
              <div className="flex items-center gap-2 mb-3.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary-ink bg-primary-muted px-1.5 py-0.5 rounded">
                  MODO DESARROLLO
                </span>
                <span className="text-[11px] text-text-tertiary">Acceso rápido sin contraseña</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {devAdmins.map((admin) => (
                  <button
                    key={admin.id}
                    onClick={() => handleDevLogin(admin.id, admin.nombre)}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-lg border border-border-subtle bg-surface-2 shadow-card hover:border-border-default hover:shadow-card-hover active:scale-[0.98] transition-all text-left"
                  >
                    <TrabajadorAvatar trabajador={{ nombre: admin.nombre, apellidos: '' }} size="sm" />
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-text-primary truncate">{admin.nombre}</div>
                      <div className="text-[9.5px] font-mono uppercase tracking-wider text-text-tertiary">
                        {admin.role}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="text-[11.5px] text-text-tertiary mt-8">
            ¿Eres operario? Usa la tablet del taller — no necesitas cuenta.
          </p>
        </div>
      </main>
    </div>
  )
}
