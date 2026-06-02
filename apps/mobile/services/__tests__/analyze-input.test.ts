import {
  ANALYZE_IMAGE_URI_MISSING_ERROR,
  getAnalyzeImageUriState,
} from '../analyze-input';

describe('getAnalyzeImageUriState', () => {
  it('accepts a non-empty image URI', () => {
    expect(getAnalyzeImageUriState('file:///capture.jpg')).toEqual({
      imageUri: 'file:///capture.jpg',
      error: null,
    });
  });

  it('rejects missing image URI values', () => {
    expect(getAnalyzeImageUriState(undefined)).toEqual({
      imageUri: null,
      error: ANALYZE_IMAGE_URI_MISSING_ERROR,
    });
    expect(getAnalyzeImageUriState('')).toEqual({
      imageUri: null,
      error: ANALYZE_IMAGE_URI_MISSING_ERROR,
    });
  });

  it('rejects repeated image URI query params', () => {
    expect(getAnalyzeImageUriState(['file:///a.jpg', 'file:///b.jpg'])).toEqual({
      imageUri: null,
      error: ANALYZE_IMAGE_URI_MISSING_ERROR,
    });
  });
});
