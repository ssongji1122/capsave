import { resolveSupabaseConfiguration } from '../supabase-config';

describe('resolveSupabaseConfiguration', () => {
  it('returns the two missing key names without exposing values', () => {
    expect(resolveSupabaseConfiguration({}, {})).toEqual({
      status: 'missing',
      missingKeys: [
        'EXPO_PUBLIC_SUPABASE_URL=',
        'EXPO_PUBLIC_SUPABASE_ANON_KEY=',
      ],
    });
  });

  it('reports only the missing key', () => {
    expect(resolveSupabaseConfiguration(
      { supabaseUrl: 'https://example.supabase.co' },
      {}
    )).toEqual({
      status: 'missing',
      missingKeys: ['EXPO_PUBLIC_SUPABASE_ANON_KEY='],
    });
  });

  it('prefers Expo extra values and returns a ready configuration', () => {
    expect(resolveSupabaseConfiguration(
      {
        supabaseUrl: ' https://extra.supabase.co ',
        supabaseAnonKey: ' extra-anon-key ',
      },
      {
        EXPO_PUBLIC_SUPABASE_URL: 'https://environment.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'environment-anon-key',
      }
    )).toEqual({
      status: 'ready',
      url: 'https://extra.supabase.co',
      anonKey: 'extra-anon-key',
    });
  });
});
