import React from 'react';
import {
  UserPreferencesProvider,
  useUserPreferences,
} from '../UserPreferencesContext';

const renderer = require('react-test-renderer');
const { act } = renderer;

const mockMaybeSingle = jest.fn();
const mockUpsert = jest.fn();
const mockFrom = jest.fn(() => ({
  select: () => ({
    eq: () => ({ maybeSingle: mockMaybeSingle }),
  }),
  upsert: mockUpsert,
}));
let mockUserId: string | null = 'account-a';

jest.mock('@/services/supabase', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

jest.mock('../AuthContext', () => ({
  useAuth: () => ({
    session: mockUserId ? { user: { id: mockUserId } } : null,
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('UserPreferencesProvider', () => {
  beforeEach(() => {
    mockUserId = 'account-a';
    mockMaybeSingle.mockReset();
    mockUpsert.mockReset();
    mockFrom.mockClear();
  });

  it('loads a valid preference and changes state only after a successful save', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { preferred_nav_app: 'naver' },
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: null });

    let current: ReturnType<typeof useUserPreferences> | undefined;
    function Probe() {
      current = useUserPreferences();
      return null;
    }

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <UserPreferencesProvider><Probe /></UserPreferencesProvider>
      );
    });

    expect(current?.preferredNavApp).toBe('naver');
    expect(current?.isLoading).toBe(false);

    let saved = false;
    await act(async () => {
      saved = await current!.setPreferredNavApp('google');
    });

    expect(saved).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: 'account-a', preferred_nav_app: 'google' },
      { onConflict: 'user_id' }
    );
    expect(current?.preferredNavApp).toBe('google');
    await act(async () => tree!.unmount());
  });

  it('keeps the previous selection and exposes an error when saving fails', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { preferred_nav_app: 'kakao' },
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: new Error('offline') });

    let current: ReturnType<typeof useUserPreferences> | undefined;
    function Probe() {
      current = useUserPreferences();
      return null;
    }

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <UserPreferencesProvider><Probe /></UserPreferencesProvider>
      );
    });

    let saved = true;
    await act(async () => {
      saved = await current!.setPreferredNavApp('google');
    });

    expect(saved).toBe(false);
    expect(current?.preferredNavApp).toBe('kakao');
    expect(current?.error).toMatch(/저장하지 못했습니다/);
    await act(async () => tree!.unmount());
  });

  it('rejects an invalid stored provider and resets on logout', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { preferred_nav_app: 'unknown-map' },
      error: null,
    });

    let current: ReturnType<typeof useUserPreferences> | undefined;
    function Probe() {
      current = useUserPreferences();
      return null;
    }

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <UserPreferencesProvider><Probe /></UserPreferencesProvider>
      );
    });

    expect(current?.preferredNavApp).toBe('tmap');
    expect(current?.error).toMatch(/불러오지 못했습니다/);

    mockUserId = null;
    await act(async () => {
      tree!.update(<UserPreferencesProvider><Probe /></UserPreferencesProvider>);
    });

    expect(current?.preferredNavApp).toBe('tmap');
    expect(current?.error).toBeNull();
    await act(async () => tree!.unmount());
  });

  it('drops an in-flight save state when the signed-in account changes', async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { preferred_nav_app: 'tmap' }, error: null })
      .mockResolvedValueOnce({ data: { preferred_nav_app: 'naver' }, error: null });
    let resolveSave!: (value: { error: null }) => void;
    mockUpsert.mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));

    let current: ReturnType<typeof useUserPreferences> | undefined;
    function Probe() {
      current = useUserPreferences();
      return null;
    }

    let tree: any;
    await act(async () => {
      tree = renderer.create(
        <UserPreferencesProvider><Probe /></UserPreferencesProvider>
      );
    });

    let savePromise!: Promise<boolean>;
    await act(async () => {
      savePromise = current!.setPreferredNavApp('google');
      await Promise.resolve();
    });
    expect(current?.savingProvider).toBe('google');

    mockUserId = 'account-b';
    await act(async () => {
      tree.update(<UserPreferencesProvider><Probe /></UserPreferencesProvider>);
    });

    expect(current?.preferredNavApp).toBe('naver');
    expect(current?.savingProvider).toBeNull();

    await act(async () => {
      resolveSave({ error: null });
      await savePromise;
    });
    expect(current?.preferredNavApp).toBe('naver');
    await act(async () => tree.unmount());
  });
});
