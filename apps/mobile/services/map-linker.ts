import { Linking, Alert, Platform } from 'react-native';
import { isUrlSafe } from './url-validator';

export type MapProvider = 'naver' | 'google';

interface MapLink {
  provider: MapProvider;
  label: string;
  emoji: string;
  appUrl: string;
  webUrl: string;
}

function encodeQuery(query: string): string {
  return encodeURIComponent(query);
}

export function getMapLinks(placeName: string, address?: string | null): MapLink[] {
  const query = address ? `${placeName} ${address}` : placeName;
  const encoded = encodeQuery(query);
  const placeEncoded = encodeQuery(placeName);

  return [
    {
      provider: 'naver',
      label: '네이버맵',
      emoji: '🟢',
      appUrl: `nmap://search?query=${placeEncoded}&appname=com.scrave.app`,
      webUrl: `https://map.naver.com/v5/search/${encoded}`,
    },
    {
      provider: 'google',
      label: 'Google Maps',
      emoji: '🔵',
      appUrl: Platform.select({
        ios: `comgooglemaps://?q=${encoded}`,
        default: `geo:0,0?q=${encoded}`,
      }) || `geo:0,0?q=${encoded}`,
      webUrl: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    },
  ];
}

export async function openMap(
  provider: MapProvider,
  placeName: string,
  address?: string | null
): Promise<void> {
  const links = getMapLinks(placeName, address);
  const link = links.find((l) => l.provider === provider);

  if (!link) return;

  try {
    const canOpen = await Linking.canOpenURL(link.appUrl);
    if (canOpen && isUrlSafe(link.appUrl)) {
      await Linking.openURL(link.appUrl);
    } else if (isUrlSafe(link.webUrl)) {
      await Linking.openURL(link.webUrl);
    } else {
      Alert.alert('오류', `${link.label}을(를) 열 수 없습니다.`);
    }
  } catch (error) {
    try {
      if (isUrlSafe(link.webUrl)) {
        await Linking.openURL(link.webUrl);
      } else {
        Alert.alert('오류', `${link.label}을(를) 열 수 없습니다.`);
      }
    } catch {
      Alert.alert('오류', `${link.label}을(를) 열 수 없습니다.`);
    }
  }
}

export async function openUrl(url: string): Promise<void> {
  if (!isUrlSafe(url)) {
    Alert.alert('안전하지 않은 링크', '이 링크는 열 수 없습니다.');
    return;
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('오류', '해당 링크를 열 수 없습니다.');
    }
  } catch {
    Alert.alert('오류', '링크를 여는 중 오류가 발생했습니다.');
  }
}
