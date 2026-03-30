import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Constants from 'expo-constants';
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

function buildMapHtml(places: PlaceInfo[]): string {
  const placesJson = JSON.stringify(
    places.map((p) => ({ name: p.name, address: p.address ?? '' }))
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; }
    #map { width: 100%; height: 100%; }
    #loading {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: #0F0F0F; color: #A0A0A0;
      font-family: -apple-system, sans-serif;
      font-size: 14px; gap: 12px; z-index: 10;
    }
    #loading.hidden { display: none; }
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid #262626;
      border-top-color: #4ADE80;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .callout {
      background: #0F0F0F;
      color: #fff;
      padding: 8px 12px;
      border-radius: 10px;
      font-family: -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      border: 1px solid rgba(74,222,128,0.3);
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="loading">
    <div class="spinner"></div>
    <span>지도 불러오는 중...</span>
  </div>
  <div id="map"></div>
  <script>
    var KAKAO_KEY = '${KAKAO_JS_KEY}';
    var placesData = ${placesJson};

    function postPlace(name, address) {
      var msg = JSON.stringify({ type: 'place_tap', name: name, address: address });
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(msg);
      }
    }

    function makeCallout(name, address) {
      var div = document.createElement('div');
      div.className = 'callout';
      div.textContent = name;
      div.addEventListener('click', function(e) {
        e.stopPropagation();
        postPlace(name, address);
      });
      return div.outerHTML;
    }

    if (!KAKAO_KEY) {
      var loadingEl = document.getElementById('loading');
      loadingEl.textContent = '';
      var msg = document.createElement('span');
      msg.style.cssText = 'color:#F87171;text-align:center;padding:20px;';
      msg.textContent = '카카오 지도 키가 설정되지 않았습니다.';
      loadingEl.appendChild(msg);
    } else {
      var script = document.createElement('script');
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + KAKAO_KEY + '&libraries=services&autoload=false';
      script.onerror = function() {
        var loadingEl = document.getElementById('loading');
        loadingEl.textContent = '';
        var msg = document.createElement('span');
        msg.style.cssText = 'color:#F87171;text-align:center;padding:20px;';
        msg.textContent = '지도를 불러올 수 없습니다. 인터넷 연결을 확인해주세요.';
        loadingEl.appendChild(msg);
      };
      script.onload = function() { kakao.maps.load(initMap); };
      document.head.appendChild(script);
    }

    function initMap() {
      var container = document.getElementById('map');
      var map = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(37.5665, 126.9780),
        level: 12
      });
      document.getElementById('loading').classList.add('hidden');

      if (placesData.length === 0) return;

      var ps = new kakao.maps.services.Places();
      var bounds = new kakao.maps.LatLngBounds();
      var resolved = 0;
      var activeOverlay = null;

      function tryFitBounds() {
        resolved++;
        if (resolved === placesData.length) {
          try { map.setBounds(bounds); } catch(e) {}
        }
      }

      placesData.forEach(function(place) {
        var query = place.address ? place.name + ' ' + place.address : place.name;
        ps.keywordSearch(query, function(data, status) {
          if (status === kakao.maps.services.Status.OK && data.length > 0) {
            var pos = new kakao.maps.LatLng(data[0].y, data[0].x);
            bounds.extend(pos);

            var marker = new kakao.maps.Marker({ position: pos, map: map });
            var overlay = new kakao.maps.CustomOverlay({
              position: pos,
              content: makeCallout(place.name, place.address),
              yAnchor: 2.2
            });

            kakao.maps.event.addListener(marker, 'click', function() {
              if (activeOverlay && activeOverlay !== overlay) {
                activeOverlay.setMap(null);
              }
              if (activeOverlay === overlay) {
                postPlace(place.name, place.address);
                return;
              }
              overlay.setMap(map);
              activeOverlay = overlay;
            });

            kakao.maps.event.addListener(map, 'click', function() {
              if (activeOverlay) { activeOverlay.setMap(null); activeOverlay = null; }
            });
          }
          tryFitBounds();
        }, { size: 1 });
      });
    }
  </script>
</body>
</html>`;
}

export function PlacesMapView({ places }: PlacesMapViewProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const htmlContent = useMemo(() => buildMapHtml(places), [places]);

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
            options: [...links.map((l) => `${l.emoji} ${l.label}`), '취소'],
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
              text: `${l.emoji} ${l.label}`,
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
