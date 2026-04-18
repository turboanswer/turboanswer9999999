import type { CapacitorConfig } from '@capacitor/cli';

const PRODUCTION_URL = 'https://turboanswergroup-dce0g0azd4bnanhs.westus2-01.azurewebsites.net';

const config: CapacitorConfig = {
  appId: 'com.turboanswer.app',
  appName: 'Turbo Answer',
  webDir: 'dist/public',
  bundledWebRuntime: false,
  server: {
    url: PRODUCTION_URL,
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000'
    }
  }
};

export default config;
