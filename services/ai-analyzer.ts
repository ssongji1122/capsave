import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import Constants from 'expo-constants';

export type CaptureCategory = 'place' | 'text';
export type SourceApp = 'instagram' | 'threads' | 'naver' | 'google' | 'youtube' | 'other';

export interface AnalysisResult {
  category: CaptureCategory;
  title: string;
  summary: string;
  placeName?: string;
  address?: string;
  extractedText: string;
  links: string[];
  tags: string[];
  source: SourceApp;
}

const SYSTEM_PROMPT = `You are an AI assistant that analyzes screenshots from mobile apps. 
Your job is to extract structured information from the screenshot.

Analyze the image and respond with a JSON object containing:

{
  "category": "place" or "text",
  "title": "A concise title describing the main content",
  "summary": "A 1-2 sentence summary of the key information",
  "placeName": "Name of the place/restaurant/cafe if it's a location (null if not)",
  "address": "Full address if visible (null if not)",
  "extractedText": "All important text content extracted from the image",
  "links": ["Any URLs visible in the image, or relevant search URLs you can construct"],
  "tags": ["3-5 relevant tags for categorization"],
  "source": "instagram" | "threads" | "naver" | "google" | "youtube" | "other"
}

Rules:
- If the screenshot contains a restaurant, cafe, hotel, tourist spot, or any physical location → category = "place"
- If it contains AI tips, code, articles, recipes, product info, or general text → category = "text"
- For "place" category: Always try to extract the place name and address. If the address is not visible, leave it null but still set category to "place".
- For "links": If no URLs are visible, construct useful search URLs (e.g., Google search for the topic, Naver search for Korean places).
- For "source": Detect which app the screenshot is from based on UI elements (Instagram has specific UI, Threads, Naver Blog has 네이버 branding, etc.)
- Respond ONLY with valid JSON. No markdown, no code fences, no extra text.`;

export async function analyzeImage(imageUri: string): Promise<AnalysisResult> {
  const apiKey = Constants.expoConfig?.extra?.openaiApiKey;
  
  if (!apiKey) {
    throw new Error('OpenAI API Key가 설정되지 않았습니다. app.json의 extra.openaiApiKey를 확인해주세요.');
  }

  // Resize image to reduce memory and bandwidth
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
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this screenshot and extract structured information.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
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

  try {
    // Clean potential markdown code fences
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result: AnalysisResult = JSON.parse(cleaned);
    
    // Validate required fields
    if (!result.category || !result.title) {
      throw new Error('필수 필드가 누락되었습니다.');
    }

    return {
      category: result.category === 'place' ? 'place' : 'text',
      title: result.title || '제목 없음',
      summary: result.summary || '',
      placeName: result.placeName || undefined,
      address: result.address || undefined,
      extractedText: result.extractedText || '',
      links: Array.isArray(result.links) ? result.links : [],
      tags: Array.isArray(result.tags) ? result.tags : [],
      source: result.source || 'other',
    };
  } catch (parseError) {
    throw new Error(`AI 결과 파싱 실패: ${content.substring(0, 200)}`);
  }
}
