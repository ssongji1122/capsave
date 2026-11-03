import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from '@/app/(app)/settings/page';
import { UserPreferencesProvider } from '@/contexts/UserPreferencesContext';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  single: vi.fn(),
  upsert: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

beforeEach(() => {
  mocks.getUser.mockReset().mockResolvedValue({ data: { user: { id: 'account-a' } } });
  mocks.single.mockReset().mockResolvedValue({
    data: { preferred_nav_app: 'naver' },
    error: null,
  });
  mocks.upsert.mockReset().mockResolvedValue({ error: null });
  mocks.from.mockReset().mockImplementation(() => ({
    select: () => ({
      eq: () => ({ maybeSingle: mocks.single }),
    }),
    upsert: mocks.upsert,
  }));
});

afterEach(() => cleanup());

function renderSettings() {
  return render(
    <UserPreferencesProvider>
      <SettingsPage />
    </UserPreferencesProvider>
  );
}

describe('web user preference settings', () => {
  it('keeps the previous selection and reports a failed save', async () => {
    mocks.upsert.mockResolvedValue({ error: new Error('offline') });
    renderSettings();

    const naver = await screen.findByRole('radio', { name: '네이버 지도' });
    const google = screen.getByRole('radio', { name: 'Google Maps' });
    await waitFor(() => expect(naver.getAttribute('aria-checked')).toBe('true'));

    fireEvent.click(google);

    expect((await screen.findByRole('alert')).textContent).toContain('설정을 저장하지 못했습니다');
    expect(naver.getAttribute('aria-checked')).toBe('true');
    expect(google.getAttribute('aria-checked')).toBe('false');
  });

  it('changes the selected provider only after a successful upsert', async () => {
    renderSettings();

    const google = await screen.findByRole('radio', { name: 'Google Maps' });
    const naver = screen.getByRole('radio', { name: '네이버 지도' });
    await waitFor(() => expect(naver.getAttribute('aria-checked')).toBe('true'));
    fireEvent.click(google);

    await waitFor(() => expect(google.getAttribute('aria-checked')).toBe('true'));
    expect(mocks.upsert).toHaveBeenCalledWith(
      { user_id: 'account-a', preferred_nav_app: 'google' },
      { onConflict: 'user_id' }
    );
    expect(screen.getByRole('status').textContent).toContain('기본 지도 앱을 Google Maps로 저장했습니다.');
  });

  it('shows a load error and uses the safe default for an invalid stored value', async () => {
    mocks.single.mockResolvedValue({
      data: { preferred_nav_app: 'unknown-map' },
      error: null,
    });
    renderSettings();

    expect((await screen.findByRole('alert')).textContent).toContain('저장된 설정을 불러오지 못했습니다');
    expect(screen.getByRole('radio', { name: 'T map' }).getAttribute('aria-checked')).toBe('true');
  });
});
