import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const saveGuideToArchive = vi.fn();

vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({ auth: { getUser } }),
}));

vi.mock('@/lib/guide-save', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/guide-save')>()),
  saveGuideToArchive: (...args: unknown[]) => saveGuideToArchive(...args),
}));

import { SaveGuideButton } from '@/components/guides/SaveGuideButton';
import { ULUWATU_CAPTURE_GUIDE } from '@/lib/public-guides';

beforeEach(() => {
  window.history.replaceState({}, '', '/g/uluwatu-cliff-captures');
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SaveGuideButton', () => {
  it('sends a signed-out visitor to login and back to save', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    render(<SaveGuideButton guide={ULUWATU_CAPTURE_GUIDE} />);

    const link = await screen.findByRole('link', { name: /내 지도에 저장/ });
    expect(link.getAttribute('href')).toBe(
      '/login?next=%2Fg%2Fuluwatu-cliff-captures%3Fsave%3D1'
    );
    expect(saveGuideToArchive).not.toHaveBeenCalled();
  });

  it('saves for a signed-in user and links to the map', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    saveGuideToArchive.mockResolvedValue({ status: 'saved', captureId: 77 });

    render(<SaveGuideButton guide={ULUWATU_CAPTURE_GUIDE} />);

    fireEvent.click(await screen.findByRole('button', { name: /내 지도에 저장/ }));

    const mapLink = await screen.findByRole('link', { name: /지도에서 보기/ });
    expect(mapLink.getAttribute('href')).toBe('/map?capture=77');
    expect(saveGuideToArchive).toHaveBeenCalledWith(
      expect.anything(),
      ULUWATU_CAPTURE_GUIDE,
      'user-1'
    );
  });

  it('passes a cover image for a draft guide', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    saveGuideToArchive.mockResolvedValue({ status: 'saved', captureId: 78 });

    render(<SaveGuideButton guide={ULUWATU_CAPTURE_GUIDE} imageUrl="captures/user-1/5.jpg" />);
    fireEvent.click(await screen.findByRole('button', { name: /내 지도에 저장/ }));

    await screen.findByRole('link', { name: /지도에서 보기/ });
    expect(saveGuideToArchive).toHaveBeenCalledWith(
      expect.anything(),
      ULUWATU_CAPTURE_GUIDE,
      'user-1',
      { imageUrl: 'captures/user-1/5.jpg' }
    );
  });

  it('saves on its own after coming back from login', async () => {
    window.history.replaceState({}, '', '/g/uluwatu-cliff-captures?save=1');
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    saveGuideToArchive.mockResolvedValue({ status: 'already', captureId: 12 });

    render(<SaveGuideButton guide={ULUWATU_CAPTURE_GUIDE} />);

    const mapLink = await screen.findByRole('link', { name: /지도에서 보기/ });
    expect(mapLink.getAttribute('href')).toBe('/map?capture=12');
    expect(window.location.search).toBe('');
  });

  it('explains when the free plan is full', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    saveGuideToArchive.mockResolvedValue({ status: 'limit' });

    render(<SaveGuideButton guide={ULUWATU_CAPTURE_GUIDE} />);
    fireEvent.click(await screen.findByRole('button', { name: /내 지도에 저장/ }));

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain('100개');
    });
  });
});
