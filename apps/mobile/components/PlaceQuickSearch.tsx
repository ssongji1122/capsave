import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActionSheetIOS,
  Platform,
  Linking,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { openMap, getMapLinks } from '@/services/map-linker';
import { isUrlSafe } from '@/services/url-validator';

interface PlaceQuickSearchProps {
  placeName: string;
  address?: string | null;
}

const SEARCH_ICONS = [
  {
    key: 'navermap',
    emoji: '🗺️',
    label: '네이버맵',
    appUrl: (q: string) => `nmap://search?query=${encodeURIComponent(q)}&appname=com.scrave.app`,
    webUrl: (q: string) => `https://map.naver.com/v5/search/${encodeURIComponent(q)}`,
    bgColor: 'rgba(3,199,90,0.12)',
  },
  {
    key: 'instagram',
    emoji: '📷',
    label: '인스타그램',
    appUrl: (q: string) => `instagram://search?q=${encodeURIComponent(q)}`,
    webUrl: (q: string) =>
      `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(q)}`,
    bgColor: 'rgba(225,48,108,0.12)',
  },
  {
    key: 'naverblog',
    emoji: '✍️',
    label: '네이버블로그',
    appUrl: null,
    webUrl: (q: string) =>
      `https://search.naver.com/search.naver?query=${encodeURIComponent(q + ' 후기')}`,
    bgColor: 'rgba(3,199,90,0.08)',
  },
  {
    key: 'youtube',
    emoji: '▶️',
    label: '유튜브',
    appUrl: (q: string) =>
      `vnd.youtube://results?search_query=${encodeURIComponent(q)}`,
    webUrl: (q: string) =>
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    bgColor: 'rgba(255,0,0,0.10)',
  },
] as const;

async function openSearchUrl(
  appUrl: string | null,
  webUrl: string
): Promise<void> {
  if (appUrl) {
    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen && isUrlSafe(appUrl)) {
        await Linking.openURL(appUrl);
        return;
      }
    } catch {
      // fall through to web
    }
  }
  if (isUrlSafe(webUrl)) {
    await Linking.openURL(webUrl);
  }
}

export function PlaceQuickSearch({ placeName, address }: PlaceQuickSearchProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const query = address ? `${placeName} ${address}` : placeName;

  const handleIconPress = useCallback(
    async (icon: (typeof SEARCH_ICONS)[number]) => {
      const appUrl = icon.appUrl ? icon.appUrl(query) : null;
      const webUrl = icon.webUrl(query);
      await openSearchUrl(appUrl, webUrl);
    },
    [query]
  );

  const handleMapOpen = useCallback(() => {
    const links = getMapLinks(placeName, address);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: placeName,
          message: address ?? undefined,
          options: [...links.map((l) => `${l.emoji} ${l.label}`), '취소'],
          cancelButtonIndex: links.length,
        },
        (idx) => {
          if (idx < links.length) {
            openMap(links[idx].provider, placeName, address ?? null);
          }
        }
      );
    } else {
      Alert.alert(
        placeName,
        address ?? undefined,
        [
          ...links.map((l) => ({
            text: `${l.emoji} ${l.label}`,
            onPress: () => openMap(l.provider, placeName, address ?? null),
          })),
          { text: '취소', style: 'cancel' as const },
        ]
      );
    }
  }, [placeName, address]);

  return (
    <View style={styles.row}>
      {SEARCH_ICONS.map((icon) => (
        <TouchableOpacity
          key={icon.key}
          style={[styles.iconBtn, { backgroundColor: icon.bgColor }]}
          onPress={() => handleIconPress(icon)}
          activeOpacity={0.7}
          accessibilityLabel={`${icon.label}에서 검색`}
        >
          <Text style={styles.iconEmoji}>{icon.emoji}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.mapOpenBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
        onPress={handleMapOpen}
        activeOpacity={0.7}
      >
        <Text style={[styles.mapOpenText, { color: colors.textTertiary }]}>지도앱 열기 ›</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 2,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 17,
  },
  mapOpenBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mapOpenText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
