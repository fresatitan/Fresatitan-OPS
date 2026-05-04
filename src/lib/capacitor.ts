import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

/**
 * Detecta si la app corre dentro de Capacitor (APK nativo)
 */
export const isNative = Capacitor.isNativePlatform()

/**
 * Inicializa plugins nativos de Capacitor (solo en APK, no en web)
 */
export async function initCapacitor() {
  if (!isNative) return

  // Splash hide always; theme se aplicará luego
  await SplashScreen.hide()
}

/**
 * Aplica el color y estilo de la barra de estado del dispositivo Android
 * para que coincida con el tema actual de la app.
 */
export async function applyStatusBarTheme(theme: 'dark' | 'light') {
  if (!isNative) return
  try {
    if (theme === 'light') {
      await StatusBar.setBackgroundColor({ color: '#FFFFFF' })
      await StatusBar.setStyle({ style: Style.Light })
    } else {
      await StatusBar.setBackgroundColor({ color: '#0A0A0A' })
      await StatusBar.setStyle({ style: Style.Dark })
    }
  } catch (e) {
    console.warn('[capacitor] no se pudo aplicar StatusBar theme', e)
  }
}
