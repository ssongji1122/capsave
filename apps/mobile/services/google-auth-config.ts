export const GOOGLE_CLIENT_ID_KEY = 'EXPO_PUBLIC_GOOGLE_CLIENT_ID=' as const;
export const GOOGLE_IOS_CLIENT_ID_KEY = 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=' as const;

export type GoogleAuthConfigurationKey =
  | typeof GOOGLE_CLIENT_ID_KEY
  | typeof GOOGLE_IOS_CLIENT_ID_KEY;

export type GoogleAuthConfiguration =
  | { status: 'ready' }
  | {
      status: 'missing';
      missingKeys: GoogleAuthConfigurationKey[];
    };

interface ExpoExtra {
  googleClientId?: unknown;
  googleIosClientId?: unknown;
}

interface GoogleAuthEnvironment {
  EXPO_PUBLIC_GOOGLE_CLIENT_ID?: unknown;
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: unknown;
}

function hasValue(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function resolveGoogleAuthConfiguration(
  platform: string,
  expoExtra: ExpoExtra,
  environment: GoogleAuthEnvironment
): GoogleAuthConfiguration {
  const hasPlatformClientId = platform === 'ios'
    ? hasValue(expoExtra.googleIosClientId) || hasValue(environment.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID)
    : hasValue(expoExtra.googleClientId) || hasValue(environment.EXPO_PUBLIC_GOOGLE_CLIENT_ID);

  if (hasPlatformClientId) return { status: 'ready' };

  return {
    status: 'missing',
    missingKeys: [platform === 'ios' ? GOOGLE_IOS_CLIENT_ID_KEY : GOOGLE_CLIENT_ID_KEY],
  };
}
