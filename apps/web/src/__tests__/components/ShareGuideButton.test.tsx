import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShareGuideButton } from '@/components/guides/ShareGuideButton';

const CANONICAL_URL = 'https://scrave.app/g/uluwatu-afterglow';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ShareGuideButton', () => {
  it('uses the device share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    });

    render(
      <ShareGuideButton
        title="울루와뚜의 세 장면"
        description="절벽에서 바다까지 이어지는 공개 가이드"
        canonicalUrl={CANONICAL_URL}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '가이드 공유' }));

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        title: '울루와뚜의 세 장면',
        text: '절벽에서 바다까지 이어지는 공개 가이드',
        url: CANONICAL_URL,
      });
    });
  });

  it('copies the canonical URL when native sharing is unavailable', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <ShareGuideButton
        title="울루와뚜의 세 장면"
        description="절벽에서 바다까지 이어지는 공개 가이드"
        canonicalUrl={CANONICAL_URL}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '가이드 공유' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(CANONICAL_URL);
      expect(screen.getByText('링크 복사됨')).toBeTruthy();
    });
  });
});
