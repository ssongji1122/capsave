import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, ActionSheetIOS, Platform } from 'react-native';
import { Text } from '@/components/ScraveText';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Constants from 'expo-constants';
import { buildMapHtml } from '@/services/map-html';
import { PlaceInfo } from '@/services/analyzers/types';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getMapLinks, openMap } from '@/services/map-linker';

interface PlacesMapViewProps {
  places: PlaceInfo[];
}

const KAKAO_JS_KEY: string =
  (Constants.expoConfig?.extra?.kakaoJsKey as string | undefined) ??
  process.env.EXPO_PUBLIC_KAKAO_JS_KEY ??
  '';

export function PlacesMapView({ places }: PlacesMapViewProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const htmlContent = useMemo(() => buildMapHtml(places, KAKAO_JS_KEY), [places]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type !== 'place_tap') return;

      const { name, address } = data as { type: string; name: string; address: string };
      const links = getMapLinks(name, address || null);

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: name,
            message: address || undefined,
            options: [...links.map((l) => l.label), '취소'],
            cancelButtonIndex: links.length,
          },
          (idx) => {
            if (idx < links.length) {
              openMap(links[idx].provider, name, address || null);
            }
          }
        );
      } else {
        Alert.alert(
          name,
          address || undefined,
          [
            ...links.map((l) => ({
              text: l.label,
              onPress: () => openMap(l.provider, name, address || null),
            })),
            { text: '취소', style: 'cancel' as const },
          ]
        );
      }
    } catch {
      // ignore malformed messages
    }
  }, []);

  if (places.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          저장된 장소가 없습니다
        </Text>
      </View>
    );
  }

  return (
    <WebView
      source={{ html: htmlContent, baseUrl: 'https://capsave.app' }}
      style={[styles.map, { backgroundColor: colors.background }]}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      onMessage={handleMessage}
      renderLoading={() => (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.placeAccent} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
