import type { AnalysisResult } from '../ai-analyzer';
import {
  saveAnalyzedCapture,
  CaptureSaveLimitError,
} from '../analyze-save-flow';

const analysis: AnalysisResult = {
  category: 'text',
  title: 'Receipt',
  summary: 'Lunch',
  places: [],
  extractedText: 'total 10000',
  links: [],
  tags: [],
  source: 'other',
  confidence: 0.9,
  sourceAccountId: null,
};

describe('saveAnalyzedCapture', () => {
  it('checks server capacity before uploading a local image', async () => {
    const uploadImage = jest.fn().mockResolvedValue('user-1/uploaded.jpg');
    const saveCapture = jest.fn().mockResolvedValue(undefined);

    await expect(saveAnalyzedCapture({
      result: analysis,
      imageUri: 'file:///local.jpg',
      userId: 'user-1',
      localCaptureCount: 0,
      maxCaptures: 10,
      existingStoragePath: null,
      uploadStatus: 'idle',
      countServerCaptures: jest.fn().mockResolvedValue(10),
      uploadImage,
      saveCapture,
    })).rejects.toBeInstanceOf(CaptureSaveLimitError);

    expect(uploadImage).not.toHaveBeenCalled();
    expect(saveCapture).not.toHaveBeenCalled();
  });

  it('uploads and saves only after capacity allows it', async () => {
    const uploadImage = jest.fn().mockResolvedValue('user-1/uploaded.jpg');
    const saveCapture = jest.fn().mockResolvedValue(undefined);

    const result = await saveAnalyzedCapture({
      result: analysis,
      imageUri: 'file:///local.jpg',
      userId: 'user-1',
      localCaptureCount: 2,
      maxCaptures: 10,
      existingStoragePath: null,
      uploadStatus: 'idle',
      countServerCaptures: jest.fn().mockResolvedValue(2),
      uploadImage,
      saveCapture,
    });

    expect(result).toEqual({ saved: true, storagePath: 'user-1/uploaded.jpg' });
    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(saveCapture).toHaveBeenCalledWith(analysis, 'user-1/uploaded.jpg');
  });

  it('reuses an existing storage path without uploading again', async () => {
    const uploadImage = jest.fn();
    const saveCapture = jest.fn().mockResolvedValue(undefined);

    await expect(saveAnalyzedCapture({
      result: analysis,
      imageUri: 'file:///local.jpg',
      userId: 'user-1',
      localCaptureCount: 2,
      maxCaptures: 10,
      existingStoragePath: 'user-1/existing.jpg',
      uploadStatus: 'done',
      countServerCaptures: jest.fn().mockResolvedValue(2),
      uploadImage,
      saveCapture,
    })).resolves.toEqual({ saved: true, storagePath: 'user-1/existing.jpg' });

    expect(uploadImage).not.toHaveBeenCalled();
    expect(saveCapture).toHaveBeenCalledWith(analysis, 'user-1/existing.jpg');
  });

  it('deletes an image uploaded in this attempt when saving fails', async () => {
    const saveError = new Error('save failed after upload');
    const deleteUploadedImage = jest.fn().mockResolvedValue(undefined);

    await expect(saveAnalyzedCapture({
      result: analysis,
      imageUri: 'file:///local.jpg',
      userId: 'user-1',
      localCaptureCount: 2,
      maxCaptures: 10,
      existingStoragePath: null,
      uploadStatus: 'idle',
      countServerCaptures: jest.fn().mockResolvedValue(2),
      uploadImage: jest.fn().mockResolvedValue('user-1/uploaded.jpg'),
      saveCapture: jest.fn().mockRejectedValue(saveError),
      deleteUploadedImage,
    })).rejects.toThrow(saveError);

    expect(deleteUploadedImage).toHaveBeenCalledWith('user-1/uploaded.jpg');
  });

  it('does not delete a storage path that existed before this save attempt', async () => {
    const deleteUploadedImage = jest.fn();

    await expect(saveAnalyzedCapture({
      result: analysis,
      imageUri: 'file:///local.jpg',
      userId: 'user-1',
      localCaptureCount: 2,
      maxCaptures: 10,
      existingStoragePath: 'user-1/existing.jpg',
      uploadStatus: 'done',
      countServerCaptures: jest.fn().mockResolvedValue(2),
      uploadImage: jest.fn(),
      saveCapture: jest.fn().mockRejectedValue(new Error('save failed')),
      deleteUploadedImage,
    })).rejects.toThrow('save failed');

    expect(deleteUploadedImage).not.toHaveBeenCalled();
  });

  it('preserves the original save error when cleanup also fails', async () => {
    const saveError = new Error('save failed after upload');

    await expect(saveAnalyzedCapture({
      result: analysis,
      imageUri: 'file:///local.jpg',
      userId: 'user-1',
      localCaptureCount: 2,
      maxCaptures: 10,
      existingStoragePath: null,
      uploadStatus: 'idle',
      countServerCaptures: jest.fn().mockResolvedValue(2),
      uploadImage: jest.fn().mockResolvedValue('user-1/uploaded.jpg'),
      saveCapture: jest.fn().mockRejectedValue(saveError),
      deleteUploadedImage: jest.fn().mockRejectedValue(new Error('cleanup failed')),
    })).rejects.toThrow(saveError);
  });
});
