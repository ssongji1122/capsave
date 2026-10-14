import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { CaptureExperience } from '@/components/captures/CaptureExperience';
import { INTENT_STORAGE_KEY } from '@/lib/capture-intent';

beforeEach(() => { localStorage.clear(); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('real capture experience', () => {
  it('starts with real source evidence and no selected personal reason', () => {
    render(<CaptureExperience />);
    expect(screen.getByRole('heading', { name: 'FIGURE (2)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '색감' }).getAttribute('aria-pressed')).toBe('false');
    expect(localStorage.getItem(INTENT_STORAGE_KEY)).toBeNull();
  });
  it('persists selected reasons and notes, then restores after remount', () => {
    render(<CaptureExperience />);
    fireEvent.click(screen.getByRole('button', { name: '색감' }));
    fireEvent.change(screen.getByLabelText('내 메모'), { target: { value: '가을 포스터의 색 조합' } });
    fireEvent.click(screen.getByRole('button', { name: '내 보관함에 담기' }));
    expect(screen.getByRole('status').textContent).toContain('이 브라우저에 보관했습니다');
    cleanup();
    render(<CaptureExperience />);
    expect((screen.getByLabelText('내 메모') as HTMLTextAreaElement).value).toBe('가을 포스터의 색 조합');
    expect(screen.getByRole('button', { name: '색감' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '내 취향' }));
    expect(screen.getByText('직접 고른 이유')).toBeTruthy();
    expect(screen.getByText('가을 포스터의 색 조합')).toBeTruthy();
  });
  it('shows a real empty search state instead of invented recommendations', () => {
    render(<CaptureExperience />);
    fireEvent.click(screen.getByRole('button', { name: '내 보관함에 담기' }));
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: '보관함' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '제주 맛집' } });
    expect(screen.getByText('일치하는 캡처가 없습니다.')).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '보라색 노란색' } });
    expect(screen.getByRole('button', { name: /FIGURE \(2\) 상세 보기/ })).toBeTruthy();
  });
  it('reports a storage failure and does not mark the record saved', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    render(<CaptureExperience />);
    fireEvent.click(screen.getByRole('button', { name: '내 보관함에 담기' }));
    expect(screen.getByRole('alert').textContent).toContain('보관하지 못했습니다');
    expect(screen.getByRole('button', { name: '내 보관함에 담기' })).toBeTruthy();
  });
  it('does not call a single observed image an established taste', () => {
    render(<CaptureExperience />);
    fireEvent.click(screen.getByRole('button', { name: '내 취향' }));
    expect(screen.getByText('아직 직접 고른 이유가 없습니다.')).toBeTruthy();
  });
});
