import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BatchAnalyzeModal } from '@/components/upload/BatchAnalyzeModal';

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  save: vi.fn(),
}));

vi.mock('@/lib/batch-analysis-request', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/batch-analysis-request')>(),
  prepareBatchAnalysis: mocks.prepare,
}));

vi.mock('@/lib/batch-capture-save-flow', () => ({
  saveBatchCaptureFiles: mocks.save,
}));

const result = {
  category: 'text',
  title: '첫 분석',
  summary: 'AI 요약',
  places: [],
  extractedText: '원문',
  links: [],
  tags: [],
  source: 'instagram',
  sourceAccountId: 'account',
  confidence: 0.8,
  sourceIndices: [0],
};

beforeEach(() => {
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL() { return 'blob:preview'; }
    static revokeObjectURL() {}
  });
  mocks.prepare.mockReset().mockResolvedValue('{"images":["AAAA"]}');
  mocks.save.mockReset().mockImplementation(async ({ results, onSave }: any) => {
    const imageUrls = ['data:image/png;base64,AAAA'];
    await onSave(results, imageUrls);
    return imageUrls;
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('edits one batch result and saves the corrected array with metadata intact', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [result] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })));
  const onSave = vi.fn();
  render(<BatchAnalyzeModal files={[new File(['a'], 'a.png')]} isGuest onSave={onSave} onCancel={vi.fn()} />);

  await screen.findByText('첫 분석');
  fireEvent.click(screen.getByRole('button', { name: '내용 수정' }));
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '고친 분석' } });
  fireEvent.click(screen.getByRole('button', { name: '수정 완료' }));
  fireEvent.click(screen.getByRole('button', { name: '확인하고 저장' }));

  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  expect(onSave.mock.calls[0][0][0]).toMatchObject({
    title: '고친 분석',
    source: 'instagram',
    sourceIndices: [0],
  });
});

it('keeps all edited batch results visible after a save failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [result] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })));
  mocks.save.mockRejectedValueOnce(new Error('offline'));
  render(<BatchAnalyzeModal files={[new File(['a'], 'a.png')]} isGuest onSave={vi.fn()} onCancel={vi.fn()} />);

  await screen.findByText('첫 분석');
  fireEvent.click(screen.getByRole('button', { name: '내용 수정' }));
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '실패해도 남는 제목' } });
  fireEvent.click(screen.getByRole('button', { name: '수정 완료' }));
  fireEvent.click(screen.getByRole('button', { name: '확인하고 저장' }));

  expect((await screen.findByRole('alert')).textContent).toContain('수정한 내용은 그대로 남아 있습니다');
  expect(screen.getByText('실패해도 남는 제목')).toBeTruthy();
});

it('reports capacity overflow before attempting to save', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [result] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })));
  const onCapacityExceeded = vi.fn();
  render(
    <BatchAnalyzeModal
      files={[new File(['a'], 'a.png')]}
      isGuest
      maxSaveCount={0}
      onCapacityExceeded={onCapacityExceeded}
      onSave={vi.fn()}
      onCancel={vi.fn()}
    />
  );

  await screen.findByText('첫 분석');
  fireEvent.click(screen.getByRole('button', { name: '확인하고 저장' }));

  await waitFor(() => expect(onCapacityExceeded).toHaveBeenCalledTimes(1));
  expect(mocks.save).not.toHaveBeenCalled();
});
