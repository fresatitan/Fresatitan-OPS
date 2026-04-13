import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initCapacitor } from './lib/capacitor.ts'

// Inicializar plugins nativos (StatusBar, SplashScreen) si estamos en APK
initCapacitor()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
