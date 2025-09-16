import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.rolodex',
  appName: 'Rolodex',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};
export default config;
