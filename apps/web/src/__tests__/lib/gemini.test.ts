import { describe, it, expect } from 'vitest';
import { extractGeminiText } from '@/lib/gemini';

describe('extractGeminiText', () => {
  it('extracts text from valid candidates', () => {
    const candidates = [
      { content: { parts: [{ text: '{"category":"place"}' }] } },
    ];
    expect(extractGeminiText(candidates)).toBe('{"category":"place"}');
  });

  it('returns null for empty candidates', () => {
    expect(extractGeminiText([])).toBeNull();
  });

  it('returns null for undefined candidates', () => {
    expect(extractGeminiText(undefined)).toBeNull();
  });

  it('returns null when parts is missing', () => {
    const candidates = [{ content: {} }];
    expect(extractGeminiText(candidates)).toBeNull();
  });

  it('skips thinking parts (thought: true)', () => {
    const candidates = [
      {
        content: {
          parts: [
            { text: 'thinking...', thought: true },
            { text: '{"category":"text"}' },
          ],
        },
      },
    ];
    expect(extractGeminiText(candidates)).toBe('{"category":"text"}');
  });

  it('returns null when all parts are thinking', () => {
    const candidates = [
      { content: { parts: [{ text: 'thinking', thought: true }] } },
    ];
    expect(extractGeminiText(candidates)).toBeNull();
  });

  it('returns null when parts have no text', () => {
    const candidates = [
      { content: { parts: [{ inlineData: { data: 'abc' } }] } },
    ];
    expect(extractGeminiText(candidates)).toBeNull();
  });
});
