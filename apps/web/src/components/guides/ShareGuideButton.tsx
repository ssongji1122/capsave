'use client';

import { useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { buildGuideSharePayload } from '@/lib/guide-share';

interface ShareGuideButtonProps {
  title: string;
  description: string;
  canonicalUrl: string;
  className?: string;
}

type ShareStatus = 'idle' | 'copied' | 'error';

const STATUS_RESET_DELAY_MS = 2400;

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const didCopy = document.execCommand('copy');
  input.remove();

  if (!didCopy) {
    throw new Error('GUIDE_SHARE_COPY_FAILED');
  }
}

export function ShareGuideButton({
  title,
  description,
  canonicalUrl,
  className,
}: ShareGuideButtonProps) {
  const [status, setStatus] = useState<ShareStatus>('idle');

  const handleShare = async () => {
    const payload = buildGuideSharePayload({
      title,
      description,
      url: canonicalUrl,
    });

    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }

      await copyText(payload.url);
      setStatus('copied');
      window.setTimeout(() => setStatus('idle'), STATUS_RESET_DELAY_MS);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setStatus('error');
      window.setTimeout(() => setStatus('idle'), STATUS_RESET_DELAY_MS);
    }
  };

  return (
    <button
      type="button"
      aria-label="가이드 공유"
      onClick={handleShare}
      className={className}
    >
      {status === 'copied' ? (
        <Check size={16} aria-hidden="true" />
      ) : status === 'error' ? (
        <Link2 size={16} aria-hidden="true" />
      ) : (
        <Share2 size={16} aria-hidden="true" />
      )}
      <span aria-live="polite">
        {status === 'copied'
          ? '링크 복사됨'
          : status === 'error'
            ? '다시 시도'
            : '공유'}
      </span>
    </button>
  );
}
