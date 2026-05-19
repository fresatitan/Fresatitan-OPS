import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Base relativa para que Capacitor cargue los assets correctamente en el WebView
  base: './',
  build: {
    // Importante para tablets Android antiguas (kiosko / cocina): muchas tienen
    // WebView muy desactualizado (Chromium 50–70) que no entiende sintaxis ES2020+
    // (optional chaining ?.,  nullish coalescing ??, top-level await, etc.).
    // Si dejamos el target por defecto, el bundle se carga pero da "Unexpected
    // token" al parsear y el operario ve la app en negro.
    // ES2015 + cssTarget chrome61 cubre prácticamente cualquier dispositivo
    // Android 7+ con WebView mínimamente actualizado.
    target: ['es2015', 'chrome61', 'safari11.1'],
    cssTarget: 'chrome61',
  },
})
