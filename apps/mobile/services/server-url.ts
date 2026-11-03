import Constants from 'expo-constants';

export const DEFAULT_SCRAVE_SERVER_URL = 'https://scrave.vercel.app';

interface ExpoExtra {
  serverUrl?: unknown;
}

interface ServerEnvironment {
  EXPO_PUBLIC_API_URL?: unknown;
}

function normalizeUrl(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
}

export function resolveMobileServerUrl(
  expoExtra: ExpoExtra,
  environment: ServerEnvironment
): string {
  return normalizeUrl(expoExtra.serverUrl)
    || normalizeUrl(environment.EXPO_PUBLIC_API_URL)
    || DEFAULT_SCRAVE_SERVER_URL;
}

export function getMobileServerUrl(): string {
  return resolveMobileServerUrl(
    Constants.expoConfig?.extra ?? {},
    { EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL }
  );
}
