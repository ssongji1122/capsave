import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GuestMigration } from '@/components/auth/GuestMigration';

const state = vi.hoisted(() => ({
  ready: false, authenticated: false,
  refresh: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn(),
  migrate: vi.fn().mockResolvedValue(1),
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user' } } }),
}));
vi.mock('@/contexts/CapturesContext', () => ({ useCaptures: () => ({
  isAuthReady: state.ready, isAuthenticated: state.authenticated, refresh: state.refresh,
}) }));
vi.mock('@/contexts/GuestCapturesContext', () => ({ useGuestCaptures: () => ({ reloadCaptures: state.reload }) }));
vi.mock('@/lib/supabase/browser', () => ({ createClient: () => ({ auth: { getUser: state.getUser } }) }));
vi.mock('@/lib/migrate-guest-captures', () => ({ migrateGuestCaptures: state.migrate }));
afterEach(() => { cleanup(); vi.clearAllMocks(); state.ready = false; state.authenticated = false; });

it('인증 준비 후에만 이관하고 저장소에 남은 임시 항목과 계정 목록을 갱신합니다', async () => {
  const view = render(<GuestMigration />);
  expect(state.getUser).not.toHaveBeenCalled();
  state.ready = true;
  state.authenticated = true;
  view.rerender(<GuestMigration />);
  await waitFor(() => expect(state.refresh).toHaveBeenCalledTimes(1));
  expect(state.reload).toHaveBeenCalledTimes(1);
  view.rerender(<GuestMigration />);
  expect(state.migrate).toHaveBeenCalledTimes(1);
});
