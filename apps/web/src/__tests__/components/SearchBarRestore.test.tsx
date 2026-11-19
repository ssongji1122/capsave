import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SearchBar } from '@/components/captures/SearchBar';

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);
it('restores the dashboard query after leaving and remounting', () => {
  const onSearch = vi.fn();
  const first = render(<SearchBar onSearch={onSearch} storageKey="dashboard-query" />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '성수 파스타' } });
  first.unmount();
  render(<SearchBar onSearch={onSearch} storageKey="dashboard-query" />);
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('성수 파스타');
  fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));
  cleanup();
  render(<SearchBar onSearch={onSearch} storageKey="dashboard-query" />);
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
});
