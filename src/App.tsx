import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Dashboard from './pages/Dashboard'
import Maquinas from './pages/Maquinas'
import Trabajadores from './pages/Trabajadores'
import Panel from './pages/Panel'
import Login from './pages/Login'
import RequireAuth from './components/auth/RequireAuth'
import { useAuthStore } from './store/authStore'
import { useWorkflowStore } from './store/workflowStore'
import { useTrabajadoresStore } from './store/trabajadoresStore'

export default function App() {
  const initializeAuth = useAuthStore((s) => s.initialize)

  useEffect(() => {
    // Auth
    initializeAuth()

    // Datos de negocio (compartidos entre Panel público y Dashboard admin)
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
            background: '#1A1A1A',
            color: '#F0F0F0',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '13px',
          },
        }}
      />
      <Routes>
        {/* Públicas */}
        <Route path="/panel" element={<Panel />} />
        <Route path="/login" element={<Login />} />

        {/* Admin — protegidas */}
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/maquinas" element={<RequireAuth><Maquinas /></RequireAuth>} />
        <Route path="/trabajadores" element={<RequireAuth><Trabajadores /></RequireAuth>} />

        {/* Catch-all */}
        <Route path="*" element={<CatchAllRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

function CatchAllRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return <Navigate to={isAuthenticated ? '/' : '/panel'} replace />
}
