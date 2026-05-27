import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.turboanswer.app',
  appName: 'Turbo Answer',
  webDir: 'dist/public',
  server: {
    url: 'https://turboanswergroup-dce0g0azd4bnanhs.westus2-01.azurewebsites.net',
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2800,
      launchAutoHide: true,
      launchFadeOutDuration: 600,
      backgroundColor: "#0a0a1a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#00d4ff",
      splashFullScreen: true,
      splashImmersive: true,
      useDialog: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a1a',
      overlaysWebView: false
    }
  }
};

export default config;
