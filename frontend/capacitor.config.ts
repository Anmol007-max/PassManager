import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.passmanager.app',
  appName: 'MyPassWords',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'passmanager.app',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#0a0a0f',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0f',
    },
  },
};

export default config;
