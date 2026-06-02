import { describe, expect, it, vi } from 'vitest';
import type { AnalysisResult } from '@scrave/shared';
import { saveBatchCaptureFiles } from '@/lib/batch-capture-save-flow';

const firstResult: AnalysisResult = {
  category: 'place',
  title: '첫 번째',
  summary: '',
  places: [{ name: '카페' }],
  extractedText: '',
  links: [],
  tags: [],
  source: 'other',
  confidence: 0.9,
  sourceAccountId: null,
  sourceIndices: [0],
};

const secondResult: AnalysisResult = {
  category: 'text',
  title: '두 번째',
  summary: '',
  places: [],
  extractedText: 'note',
  links: [],
  tags: [],
  source: 'other',
  confidence: 0.8,
  sourceAccountId: null,
  sourceIndices: [1],
};

describe('saveBatchCaptureFiles', () => {
  it('saves guest batch results without uploading', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const uploadFilesForResults = vi.fn();
    const deleteUploadedFiles = vi.fn();

    await saveBatchCaptureFiles({
      isGuest: true,
      results: [firstResult, secondResult],
      guestImageUrls: ['guest-1', 'guest-2'],
      uploadFilesForResults,
      deleteUploadedFiles,
      onSave,
    });

    expect(uploadFilesForResults).not.toHaveBeenCalled();
    expect(deleteUploadedFiles).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith([firstResult, secondResult], ['guest-1', 'guest-2']);
  });

  it('deletes authenticated batch uploads when saving fails', async () => {
    const uploadedPaths = ['user-1/a.png', 'user-1/b.png'];
    const deleteUploadedFiles = vi.fn().mockResolvedValue(undefined);

    await expect(saveBatchCaptureFiles({
      isGuest: false,
      results: [firstResult, secondResult],
      guestImageUrls: [],
      uploadFilesForResults: vi.fn().mockResolvedValue(uploadedPaths),
      deleteUploadedFiles,
      onSave: vi.fn().mockRejectedValue(new Error('save failed')),
    })).rejects.toThrow('save failed');

    expect(deleteUploadedFiles).toHaveBeenCalledWith(uploadedPaths);
  });

  it('preserves the original batch save error when cleanup also fails', async () => {
    const saveError = new Error('batch save failed');

    await expect(saveBatchCaptureFiles({
      isGuest: false,
      results: [firstResult, secondResult],
      guestImageUrls: [],
      uploadFilesForResults: vi.fn().mockResolvedValue(['user-1/a.png', 'user-1/b.png']),
      deleteUploadedFiles: vi.fn().mockRejectedValue(new Error('cleanup failed')),
      onSave: vi.fn().mockRejectedValue(saveError),
    })).rejects.toThrow(saveError);
  });
});
