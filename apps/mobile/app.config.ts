import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Scrave',
  slug: 'scrave',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'scrave',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0F',
  },
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        '스크린샷을 선택하여 AI가 분석할 수 있도록 사진 접근 권한이 필요합니다.',
      LSApplicationQueriesSchemes: [
        'nmap',
        'kakaomap',
        'comgooglemaps',
        'tmap',
      ],
    },
    bundleIdentifier: 'com.anonymous.scrave',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#0A0A0F',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: ['android.permission.RECORD_AUDIO'],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-secure-store',
    [
      'expo-image-picker',
      {
        photosPermission: '스크린샷 분석을 위해 사진 접근 권한이 필요합니다.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    serverUrl: process.env.SCRAVE_SERVER_URL,
    aiProvider: process.env.AI_PROVIDER,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    kakaoJsKey: process.env.EXPO_PUBLIC_KAKAO_JS_KEY,
    kakaoRestApiKey: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY,
  },
});
