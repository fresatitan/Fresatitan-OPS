import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fresatitan.ops',
  appName: 'FRESATITAN OPS',
  webDir: 'dist',
  server: {
    // Allow loading from Supabase
    allowNavigation: ['*.supabase.co'],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0A0A0A',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#0A0A0A',
      style: 'LIGHT',
    },
  },
  android: {
    backgroundColor: '#0A0A0A',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
