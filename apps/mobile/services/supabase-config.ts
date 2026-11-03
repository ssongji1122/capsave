export const SUPABASE_URL_KEY = 'EXPO_PUBLIC_SUPABASE_URL=' as const;
export const SUPABASE_ANON_KEY = 'EXPO_PUBLIC_SUPABASE_ANON_KEY=' as const;

export type SupabaseConfigurationKey = typeof SUPABASE_URL_KEY | typeof SUPABASE_ANON_KEY;

export type SupabaseConfiguration =
  | {
      status: 'ready';
      url: string;
      anonKey: string;
    }
  | {
      status: 'missing';
      missingKeys: SupabaseConfigurationKey[];
    };

interface ExpoExtra {
  supabaseUrl?: unknown;
  supabaseAnonKey?: unknown;
}

interface SupabaseEnvironment {
  EXPO_PUBLIC_SUPABASE_URL?: unknown;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: unknown;
}

function readValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function resolveSupabaseConfiguration(
  expoExtra: ExpoExtra,
  environment: SupabaseEnvironment
): SupabaseConfiguration {
  const url = readValue(expoExtra.supabaseUrl) || readValue(environment.EXPO_PUBLIC_SUPABASE_URL);
  const anonKey = readValue(expoExtra.supabaseAnonKey) || readValue(environment.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  const missingKeys: SupabaseConfigurationKey[] = [];

  if (!url) missingKeys.push(SUPABASE_URL_KEY);
  if (!anonKey) missingKeys.push(SUPABASE_ANON_KEY);

  if (missingKeys.length > 0) {
    return { status: 'missing', missingKeys };
  }

  return { status: 'ready', url, anonKey };
}

