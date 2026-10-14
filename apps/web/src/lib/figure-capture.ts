import analysis from './figure-analysis.json';

// 실제 첨부 캡처의 2026-10-08 Codex 분석을 보존합니다.
export const FIGURE_CAPTURE = {
  ...analysis,
  id: 'jasonandersonart-figure-2',
  imageUrl: '/capture-lab/source',
  profileUrl: 'https://www.instagram.com/jasonandersonart/',
  displayTitle: 'FIGURE (2)',
  analyzedOn: '2026-10-08',
  materialLabel: '리넨에 유화',
  palette: [
    { name: '보라색', color: '#716197' },
    { name: '회청색', color: '#68748F' },
    { name: '노란색', color: '#F1D97A' },
    { name: '살구색', color: '#DCA780' },
    { name: '청록색', color: '#168FBA' },
  ],
} as const;

export type InsightCapture = typeof FIGURE_CAPTURE;
