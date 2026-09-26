import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/guides/SaveGuideButton', () => ({
  SaveGuideButton: ({ imageUrl }: { imageUrl?: string }) => (
    <button type="button" data-image-url={imageUrl ?? ''}>
      내 지도에 저장
    </button>
  ),
}));

import { PublicGuideExperience } from '@/components/guides/PublicGuideExperience';
import { ULUWATU_GUIDE } from '@/lib/public-guides';

afterEach(cleanup);

const DRAFT = {
  ...ULUWATU_GUIDE,
  slug: 'my-guide-abcdefghij',
  status: 'draft' as const,
  places: ULUWATU_GUIDE.places.slice(0, 2).map((place) => ({ ...place, references: [] })),
};

describe('PublicGuideExperience', () => {
  it('shows the public badge and share buttons for a published guide', () => {
    render(<PublicGuideExperience guide={ULUWATU_GUIDE} canonicalUrl="https://scrave.test/g/x" />);
    expect(screen.getByText('PUBLIC')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /공유|링크/ }).length).toBeGreaterThan(0);
  });

  it('marks a draft as an AI draft, hides sharing and saves with the cover image', () => {
    render(<PublicGuideExperience guide={DRAFT} mode="draft" saveImageUrl="captures/u/1.jpg" />);

    expect(screen.getByText('AI 초안')).toBeTruthy();
    expect(screen.queryByText('PUBLIC')).toBeNull();
    expect(screen.queryByRole('button', { name: /공유|링크/ })).toBeNull();
    expect(screen.queryByText('PASS IT ON')).toBeNull();
    expect(
      screen.getByRole('button', { name: '내 지도에 저장' }).getAttribute('data-image-url')
    ).toBe('captures/u/1.jpg');
  });

  it('shows the local map instead of the fixed Bali globe for a draft', () => {
    render(<PublicGuideExperience guide={DRAFT} mode="draft" />);
    expect(screen.queryByRole('button', { name: /지구본/ })).toBeNull();
    expect(screen.queryByText('SEOUL → BALI')).toBeNull();
  });

  it('names the map app the link opens', () => {
    render(<PublicGuideExperience guide={{ ...DRAFT, countryCode: 'KR' }} mode="draft" />);
    expect(screen.getAllByText(/T map에서 보기/).length).toBe(DRAFT.places.length);
    cleanup();
    render(<PublicGuideExperience guide={ULUWATU_GUIDE} canonicalUrl="https://scrave.test/g/x" />);
    expect(screen.getAllByText(/Google 지도에서 보기/).length).toBe(ULUWATU_GUIDE.places.length);
  });

  it('renders places without photos or references', () => {
    render(<PublicGuideExperience guide={DRAFT} mode="draft" />);
    for (const place of DRAFT.places) {
      expect(screen.getAllByText(place.localName).length).toBeGreaterThan(0);
    }
  });
});
