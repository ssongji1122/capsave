import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { serializeGuestCaptures, type GuestCapture } from '@scrave/shared';
import { GuestCapturesProvider, useGuestCaptures } from '@/contexts/GuestCapturesContext';
const STORAGE_KEY = 'scrave_guest_captures';
function Probe() {
  const { guestCaptures, reloadCaptures } = useGuestCaptures();
  return <><span>{guestCaptures.map((item) => item.title).join(',')}</span><button onClick={reloadCaptures}>갱신</button></>;
}
afterEach(() => { cleanup(); sessionStorage.clear(); });
it('일부 이관 후 남은 임시 항목을 보존하고 모두 이관하면 화면에서도 비웁니다', () => {
  const captures: GuestCapture[] = [-1, -2].map((id) => ({
    id, title: `항목${id}`, summary: '', category: 'place', confidence: 0.9,
    tags: [], places: [], imageBase64: '', createdAt: '2026-10-25T00:00:00Z',
  }));
  sessionStorage.setItem(STORAGE_KEY, serializeGuestCaptures(captures));
  render(<GuestCapturesProvider><Probe /></GuestCapturesProvider>);
  expect(screen.getByText('항목-1,항목-2')).toBeTruthy();
  sessionStorage.setItem(STORAGE_KEY, serializeGuestCaptures([captures[1]]));
  fireEvent.click(screen.getByText('갱신'));
  expect(screen.getByText('항목-2')).toBeTruthy();
  expect(screen.queryByText('항목-1,항목-2')).toBeNull();
  sessionStorage.removeItem(STORAGE_KEY);
  fireEvent.click(screen.getByText('갱신'));
  expect(screen.queryByText('항목-2')).toBeNull();
});
