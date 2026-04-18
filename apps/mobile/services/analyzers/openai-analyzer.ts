import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import Constants from 'expo-constants';
import { AnalysisResult, ImageAnalyzer } from './types';

const SYSTEM_PROMPT = `You are an AI assistant that analyzes screenshots from mobile apps.
Your job is to extract structured information from the screenshot.
IMPORTANT: All text fields MUST be written in Korean (한국어).

Analyze the image and respond with a JSON object containing:

{
  "category": "place" or "text",
  "title": "핵심 내용을 요약한 간결한 한국어 제목",
  "summary": "주요 정보를 1-2문장으로 한국어 요약",
  "places": [
    {
      "name": "장소 이름",
      "address": "주소 (없으면 생략)",
      "date": "일정/날짜 (없으면 생략)",
      "description": "이 장소의 특징을 1-2문장으로 한국어로 설명. 메뉴, 분위기, 특이사항, 가격대 등 캡처에서 언급된 내용 중심. 언급 없으면 빈 문자열.",
      "links": ["해당 장소에 대한 검색/참고 URL"]
    }
  ],
  "extractedText": "이미지에서 추출한 모든 중요 텍스트 (한국어 원문 유지)",
  "links": ["장소와 관련 없는 일반 링크만"],
  "tags": ["3-5개 한국어 태그"],
  "source": "instagram" | "threads" | "naver" | "google" | "youtube" | "other",
  "confidence": 0.0 to 1.0,
  "sourceAccountId": "@account_id or null"
}

Rules:
- If the screenshot contains a restaurant, cafe, hotel, tourist spot, or any physical location → category = "place"
- If it contains AI tips, code, articles, recipes, product info, or general text → category = "text"
- For "place" category: Extract ALL places into the "places" array.
- For "text" category: Set "places" to an empty array [].
- For "confidence": Float 0.0–1.0 indicating classification confidence.
- For "sourceAccountId": Extract visible social media account ID. null if not visible.
- Respond ONLY with valid JSON. No markdown, no code fences, no extra text.
- ALL text output MUST be in Korean.`;

export class OpenAIAnalyzer implements ImageAnalyzer {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? Constants.expoConfig?.extra?.openaiApiKey;
    if (!key) {
      throw new Error('OpenAI API Key가 설정되지 않았습니다. app.json의 extra.openaiApiKey를 확인해주세요.');
    }
    this.apiKey = key;
  }

  async analyze(imageUri: string): Promise<AnalysisResult> {
    const manipulated = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1024 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    const base64Image = await FileSystem.readAsStringAsync(manipulated.uri, {
      encoding: 'base64',
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this screenshot and extract structured information.' },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' },
              },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API 오류: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('AI 분석 결과가 비어있습니다.');
    }

    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let result: Record<string, unknown>;
    try {
      result = JSON.parse(cleaned);
    } catch {
      throw new Error(`분석 결과 파싱 실패: ${cleaned.slice(0, 100)}`);
    }

    if (!result.category || !result.title) {
      throw new Error('필수 필드가 누락되었습니다.');
    }

    return {
      category: result.category === 'place' ? 'place' : 'text',
      title: result.title || '제목 없음',
      summary: result.summary || '',
      places: Array.isArray(result.places) ? result.places.filter((p: { name?: string }) => p.name) : [],
      extractedText: result.extractedText || '',
      links: Array.isArray(result.links) ? result.links : [],
      tags: Array.isArray(result.tags) ? result.tags : [],
      source: result.source || 'other',
      confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 1.0,
      sourceAccountId: typeof result.sourceAccountId === 'string' ? result.sourceAccountId : null,
    };
  }
}
