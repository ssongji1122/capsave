export type CaptureCategory = 'place' | 'text';
export type SourceApp = 'instagram' | 'threads' | 'naver' | 'google' | 'youtube' | 'other';

export interface PlaceInfo {
  name: string;
  address?: string;
  date?: string;
  links?: string[];
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
}

export interface CaptureItem {
  id: number;
  category: CaptureCategory;
  title: string;
  summary: string;
  places: PlaceInfo[];
  extractedText: string;
  links: string[];
  tags: string[];
  source: string;
  imageUrl: string;
  createdAt: string;
}

export interface CaptureRow {
  id: number;
  category: string;
  title: string;
  summary: string;
  places: PlaceInfo[];
  extracted_text: string;
  links: string[];
  tags: string[];
  source: string;
  image_url: string;
  created_at: string;
}

export interface ImageAnalyzer {
  analyze(imageBase64: string): Promise<AnalysisResult>;
}
