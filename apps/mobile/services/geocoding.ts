import Constants from 'expo-constants';

const REST_API_KEY: string =
  (Constants.expoConfig?.extra?.kakaoRestApiKey as string | undefined) ??
  process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ??
  '';

export interface Coords {
  lat: number;
  lng: number;
}

export async function geocodePlace(
  name: string,
  address?: string
): Promise<Coords | null> {
  if (!REST_API_KEY) return null;

  const query = address ? `${name} ${address}` : name;
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${REST_API_KEY}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const doc = data.documents?.[0];
    if (doc) {
      return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
    }
  } catch {
    // Best-effort; silently fail
  }
  return null;
}
