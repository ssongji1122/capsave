import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { SearchEvidence } from '@/components/captures/SearchEvidence';

afterEach(cleanup);
it('renders saved text safely and exposes additional evidence with a native disclosure', () => {
  const { container } = render(<SearchEvidence evidence={[
    { label: '제목', excerpt: '<script>alert(1)</script>' },
    { label: '장소 주소', excerpt: '서울 성수' },
    { label: '사진에서 읽은 글', excerpt: '파스타' },
  ]} />);
  expect(container.querySelector('script')).toBeNull();
  expect(screen.getByText('<script>alert(1)</script>', { exact: false })).toBeTruthy();
  fireEvent.click(screen.getByText('검색 근거 1개 더 보기'));
  expect(container.querySelector('details')?.open).toBe(true);
  expect(screen.getByText('파스타', { exact: false })).toBeTruthy();
});
it('omits the region when the result has no explainable literal match', () => {
  render(<SearchEvidence evidence={[]} />);
  expect(screen.queryByLabelText('검색 근거')).toBeNull();
});
