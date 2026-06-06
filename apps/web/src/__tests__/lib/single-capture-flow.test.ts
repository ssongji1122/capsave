import { describe, expect, it, vi } from 'vitest';
import type { AnalysisResult } from '@scrave/shared';
import {
  analyzeSingleCaptureFile,
  saveSingleCaptureFile,
} from '@/lib/single-capture-flow';

const analysisResult: AnalysisResult = {
  category: 'place',
  title: '테스트 장소',
  summary: '분석 결과',
  places: [{ name: '테스트 카페' }],
  extractedText: '',
  links: [],
  tags: ['테스트'],
  source: 'other',
  confidence: 0.9,
  sourceAccountId: null,
};

function createImageFile() {
  return new File([new Uint8Array([1, 2, 3])], 'capture.png', { type: 'image/png' });
}

describe('analyzeSingleCaptureFile', () => {
  it('analyzes authenticated files without uploading before the user saves', async () => {
    const analyzeImage = vi.fn().mockResolvedValue(analysisResult);
    const getGuestImageUrl = vi.fn();

    const result = await analyzeSingleCaptureFile({
      file: createImageFile(),
      isGuest: false,
      analyzeImage,
      getGuestImageUrl,
    });

    expect(result).toEqual({ result: analysisResult, imageUrl: '' });
    expect(analyzeImage).toHaveBeenCalledTimes(1);
    expect(getGuestImageUrl).not.toHaveBeenCalled();
  });

  it('keeps a guest base64 image url because guests cannot upload to storage', async () => {
    const result = await analyzeSingleCaptureFile({
      file: createImageFile(),
      isGuest: true,
      analyzeImage: vi.fn().mockResolvedValue(analysisResult),
      getGuestImageUrl: vi.fn().mockResolvedValue('guest-base64'),
    });

    expect(result).toEqual({ result: analysisResult, imageUrl: 'guest-base64' });
  });
});

describe('saveSingleCaptureFile', () => {
  it('uploads authenticated files only when saving', async () => {
    const uploadFile = vi.fn().mockResolvedValue('user-1/capture.png');
    const onSave = vi.fn().mockResolvedValue(undefined);

    await saveSingleCaptureFile({
      file: createImageFile(),
      isGuest: false,
      result: analysisResult,
      imageUrl: '',
      uploadFile,
      onSave,
    });

    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(analysisResult, 'user-1/capture.png');
  });

  it('saves guest files without uploading', async () => {
    const uploadFile = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    await saveSingleCaptureFile({
      file: createImageFile(),
      isGuest: true,
      result: analysisResult,
      imageUrl: 'guest-base64',
      uploadFile,
      onSave,
    });

    expect(uploadFile).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledWith(analysisResult, 'guest-base64');
  });

  it('deletes an authenticated upload when saving fails', async () => {
    const saveError = new Error('database insert failed');
    const deleteUploadedFile = vi.fn().mockResolvedValue(undefined);

    await expect(saveSingleCaptureFile({
      file: createImageFile(),
      isGuest: false,
      result: analysisResult,
      imageUrl: '',
      uploadFile: vi.fn().mockResolvedValue('user-1/capture.png'),
      onSave: vi.fn().mockRejectedValue(saveError),
      deleteUploadedFile,
    })).rejects.toThrow(saveError);

    expect(deleteUploadedFile).toHaveBeenCalledWith('user-1/capture.png');
  });

  it('does not delete guest base64 images when saving fails', async () => {
    const deleteUploadedFile = vi.fn();

    await expect(saveSingleCaptureFile({
      file: createImageFile(),
      isGuest: true,
      result: analysisResult,
      imageUrl: 'guest-base64',
      uploadFile: vi.fn(),
      onSave: vi.fn().mockRejectedValue(new Error('guest save failed')),
      deleteUploadedFile,
    })).rejects.toThrow('guest save failed');

    expect(deleteUploadedFile).not.toHaveBeenCalled();
  });

  it('preserves the original save error when cleanup also fails', async () => {
    const saveError = new Error('database insert failed');
    const cleanupError = new Error('cleanup failed');

    await expect(saveSingleCaptureFile({
      file: createImageFile(),
      isGuest: false,
      result: analysisResult,
      imageUrl: '',
      uploadFile: vi.fn().mockResolvedValue('user-1/capture.png'),
      onSave: vi.fn().mockRejectedValue(saveError),
      deleteUploadedFile: vi.fn().mockRejectedValue(cleanupError),
    })).rejects.toThrow(saveError);
  });
});
