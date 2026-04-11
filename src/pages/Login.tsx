import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import TrabajadorAvatar from '../components/ui/TrabajadorAvatar'
import toast from 'react-hot-toast'

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
    <div className="min-h-screen bg-surface-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo-f.png" alt="" className="h-14 w-auto mb-4" />
          <div>
            <span className="text-2xl font-bold text-text-primary tracking-tight">Fresatitan</span>
            <span className="text-2xl font-light text-primary ml-1.5">OPS</span>
          </div>
          <p className="text-sm text-text-tertiary mt-2">Panel de administración</p>
        </div>

        {/* Form email/password — activo solo si Supabase está configurado */}
        <form
          onSubmit={handleSubmit}
          className={`bg-surface-2 border ${hasSupabase ? 'border-border-default' : 'border-border-subtle opacity-60'} rounded-xl p-5 mb-5`}
        >
          {!hasSupabase && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-tertiary bg-surface-3 px-1.5 py-0.5 rounded">
                NO CONECTADO
              </span>
              <span className="text-[11px] text-text-tertiary">Supabase no configurado</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toni@fresatitan.com"
                disabled={!hasSupabase || loading}
                className="input-field"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={!hasSupabase || loading}
                className="input-field"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={!hasSupabase || loading || !email || !password}
              className="w-full py-3 rounded text-sm font-semibold bg-primary text-text-inverse hover:bg-primary-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Entrando...' : 'Iniciar sesión'}
            </button>
          </div>
        </form>

        {/* DEV — Selección directa de admin (siempre disponible para pruebas) */}
        <div className="bg-surface-2 border border-primary/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary bg-primary-muted px-1.5 py-0.5 rounded">
              MODO DESARROLLO
            </span>
            <span className="text-xs text-text-tertiary">Acceso rápido sin contraseña</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {devAdmins.map((admin) => (
              <button
                key={admin.id}
                onClick={() => handleDevLogin(admin.id, admin.nombre)}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border-subtle bg-surface-3 hover:border-primary hover:bg-surface-4 active:scale-[0.97] transition-all"
              >
                <TrabajadorAvatar trabajador={{ nombre: admin.nombre, apellidos: '' }} size="xl" />
                <div className="text-center">
                  <div className="text-base font-bold text-text-primary">{admin.nombre}</div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-primary mt-0.5">
                    {admin.role}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-text-tertiary mt-6">
          ¿Eres operario? Usa la tablet del taller — no necesitas cuenta.
        </p>
      </div>
    </div>
  )
}
