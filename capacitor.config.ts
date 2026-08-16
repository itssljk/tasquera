import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.itssljk.tasquera',
  appName: 'Tasquera',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000',
    },
    AppUpdate: {
      // Manifest checked by the Android self-update flow. Defaults to the
      // latest GitHub Release's update.json asset; override for self-hosting.
      updateUrl: 'https://github.com/itssljk/tasquera/releases/latest/download/update.json',
    },
  },
  android: {
    backgroundColor: '#131211',
  },
}

export default config
