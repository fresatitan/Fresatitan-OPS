import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Dashboard from './pages/Dashboard'
import Maquinas from './pages/Maquinas'
import Trabajadores from './pages/Trabajadores'
import Alertas from './pages/Alertas'
import Auditoria from './pages/Auditoria'
import Informes from './pages/Informes'
import Panel from './pages/Panel'
import Login from './pages/Login'
import RequireAuth from './components/auth/RequireAuth'
import { useAuthStore } from './store/authStore'
import { useWorkflowStore } from './store/workflowStore'
import { useTrabajadoresStore } from './store/trabajadoresStore'
import { useThemeStore } from './store/themeStore'
import { isNative } from './lib/capacitor'

export default function App() {
  const initializeAuth = useAuthStore((s) => s.initialize)

  useEffect(() => {
    // Aplica el tema persistido al DOM en el primer arranque (rehidratación
    // del store en caso de que onRehydrateStorage no haya disparado todavía).
    useThemeStore.getState().initialize()

    // Auth solo en web (admin). En APK no hay login.
    if (!isNative) initializeAuth()

    // Datos de negocio — compartidos entre APK (panel) y web (admin)
    // Ambos leen de la misma BD Supabase: lo que el trabajador registra
    // en la APK se ve en tiempo real en el dashboard del admin
    useWorkflowStore.getState().fetchAll()
    useTrabajadoresStore.getState().fetchAll()

    // Realtime — unsubscribe al desmontar
    const unsubscribe = useWorkflowStore.getState().subscribe()
    return () => unsubscribe()
  }, [initializeAuth])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-surface-3)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-default)',
            fontSize: '13px',
          },
        }}
      />
      <Routes>
        {/* Panel de Planta — disponible en APK y web */}
        <Route path="/panel" element={<Panel />} />

        {/* Admin — solo en web, no en APK */}
        {!isNative && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/maquinas" element={<RequireAuth><Maquinas /></RequireAuth>} />
            <Route path="/trabajadores" element={<RequireAuth><Trabajadores /></RequireAuth>} />
            <Route path="/alertas" element={<RequireAuth><Alertas /></RequireAuth>} />
            <Route path="/auditoria" element={<RequireAuth><Auditoria /></RequireAuth>} />
            <Route path="/informes" element={<RequireAuth><Informes /></RequireAuth>} />
          </>
        )}

        {/* Catch-all */}
        <Route path="*" element={<CatchAllRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

function CatchAllRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  // En APK nativo siempre va al panel de planta (es la app de trabajadores)
  if (isNative) return <Navigate to="/panel" replace />
  return <Navigate to={isAuthenticated ? '/' : '/panel'} replace />
}
