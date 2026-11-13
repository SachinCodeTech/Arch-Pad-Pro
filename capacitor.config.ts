import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.archpad.pro',
  appName: 'Arch Pad',
  webDir: 'dist',
  backgroundColor: '#0a0a0f',
  server: {
    androidScheme: 'https',
    cleartext: false
  },
  android: {
    backgroundColor: '#0a0a0f',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
