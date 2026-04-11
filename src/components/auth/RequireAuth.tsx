import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

interface Props {
  children: React.ReactNode
}

/**
 * Guard para rutas de admin. Si no hay sesión, redirige a /login
 * recordando la URL a la que quería acceder para volver después del login.
 */
export default function RequireAuth({ children }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
