import * as ImageManipulator from 'expo-image-manipulator';
import Constants from 'expo-constants';
import { AnalysisResult, ImageAnalyzer, PlaceInfo } from './types';

export class ServerAnalyzer implements ImageAnalyzer {
  private serverUrl: string;
  private getToken: () => Promise<string | null>;

  constructor(getToken: () => Promise<string | null>) {
    const url = Constants.expoConfig?.extra?.serverUrl;
    if (!url) {
      throw new Error('서버 URL이 설정되지 않았습니다. app.json의 extra.serverUrl을 확인해주세요.');
    }
    this.serverUrl = url;
    this.getToken = getToken;
  }

  async analyze(imageUri: string): Promise<AnalysisResult> {
    // Resize image to stay under 1MB server limit (target <900KB)
    const manipulated = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1024 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    const token = await this.getToken();

    // React Native FormData accepts {uri, name, type} objects
    const formData = new FormData();
    formData.append('file', {
      uri: manipulated.uri,
      name: 'image.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.serverUrl}/api/analyze`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
    }

    if (response.status === 413) {
      throw new Error('이미지 크기가 1MB를 초과합니다.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `서버 오류: ${response.status}` }));
      throw new Error(error.error || `서버 오류: ${response.status}`);
    }

    const result = await response.json();

    return {
      category: result.category === 'place' ? 'place' : 'text',
      title: result.title || '제목 없음',
      summary: result.summary || '',
      places: Array.isArray(result.places) ? result.places.filter((p: PlaceInfo) => p.name) : [],
      extractedText: result.extractedText || '',
      links: Array.isArray(result.links) ? result.links : [],
      tags: Array.isArray(result.tags) ? result.tags : [],
      source: result.source || 'other',
      confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 1.0,
      sourceAccountId: typeof result.sourceAccountId === 'string' ? result.sourceAccountId : null,
    };
  }
}
