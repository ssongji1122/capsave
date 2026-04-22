import { Linking, Alert, Platform } from 'react-native';
import {
  isUrlSafe,
  MOBILE_DEEP_LINK_SCHEMES,
  getMobileMapLinks,
  type MapProvider,
} from '@scrave/shared';

export { type MapProvider };

export function getMapLinks(placeName: string, address?: string | null) {
  return getMobileMapLinks(placeName, address);
}

export async function openMap(
  provider: MapProvider,
  placeName: string,
  address?: string | null
): Promise<void> {
  const link = getMobileMapLinks(placeName, address).find((l) => l.provider === provider);
  if (!link) return;

  const appUrl = Platform.OS === 'ios' && link.iosAppUrl ? link.iosAppUrl : link.appUrl;

  try {
    if (
      await Linking.canOpenURL(appUrl) &&
      isUrlSafe(appUrl, MOBILE_DEEP_LINK_SCHEMES)
    ) {
      await Linking.openURL(appUrl);
      return;
    }
    if (isUrlSafe(link.webUrl)) {
      await Linking.openURL(link.webUrl);
      return;
    }
    Alert.alert('오류', `${link.label}을(를) 열 수 없습니다.`);
  } catch {
    if (isUrlSafe(link.webUrl)) {
      await Linking.openURL(link.webUrl).catch(() => {
        Alert.alert('오류', `${link.label}을(를) 열 수 없습니다.`);
      });
    } else {
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
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    } else {
      Alert.alert('오류', '해당 링크를 열 수 없습니다.');
    }
  } catch {
    Alert.alert('오류', '링크를 여는 중 오류가 발생했습니다.');
  }
}
