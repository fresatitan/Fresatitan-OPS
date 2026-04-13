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

  // StatusBar oscura con texto claro
  await StatusBar.setBackgroundColor({ color: '#0A0A0A' })
  await StatusBar.setStyle({ style: Style.Dark })

  // Ocultar splash screen (ya se mostró al arrancar)
  await SplashScreen.hide()
}
