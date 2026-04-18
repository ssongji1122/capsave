export type CaptureCategory = 'place' | 'text';
export type SourceApp = 'instagram' | 'threads' | 'naver' | 'google' | 'youtube' | 'other';

export interface PlaceInfo {
  name: string;
  address?: string;
  date?: string;
  description?: string;
  links?: string[];
  lat?: number;
  lng?: number;
}

export interface AnalysisResult {
  category: CaptureCategory;
  title: string;
  summary: string;
  places: PlaceInfo[];
  extractedText: string;
  links: string[];
  tags: string[];
  source: SourceApp;
  confidence: number;
  sourceAccountId: string | null;
}

export interface ImageAnalyzer {
  analyze(imageUri: string): Promise<AnalysisResult>;
}
