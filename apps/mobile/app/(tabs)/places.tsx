import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CaptureCard } from '@/components/CaptureCard';
import { PlacesMapView } from '@/components/PlacesMapView';
import { useCaptures } from '@/contexts/CapturesContext';
import { PlaceInfo } from '@/services/analyzers/types';
import { supabase } from '@/services/supabase';
import {
  MIN_GUIDE_CAPTURES,
  createMobileGuideDraft,
  setCurrentMobileGuideDraft,
  toggleGuideCaptureSelection,
} from '@/services/guides';

type ViewMode = 'map' | 'list';

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function getServerUrl(): string {
  return (
    (Constants.expoConfig?.extra?.serverUrl as string | undefined) ||
    process.env.EXPO_PUBLIC_API_URL ||
    'https://scrave.vercel.app'
  );
}

export default function PlacesScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [selectingForGuide, setSelectingForGuide] = useState(false);
  const [selectedCaptureIds, setSelectedCaptureIds] = useState<number[]>([]);
  const [isCreatingGuide, setIsCreatingGuide] = useState(false);

  const { getCapturesByCategory, isLoading, refresh, deleteCapture } = useCaptures();
  const captures = getCapturesByCategory('place');
  const [refreshing, setRefreshing] = useState(false);

  // Flatten all PlaceInfo entries across captures, deduped by name+address
  const allPlaces = useMemo<PlaceInfo[]>(() => {
    const seen = new Set<string>();
    const result: PlaceInfo[] = [];
    for (const c of captures) {
      for (const p of c.places) {
        const key = p.name + (p.address ?? '');
        if (!seen.has(key)) {
          seen.add(key);
          result.push(p);
        }
      }
    }
    return result;
  }, [captures]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleDelete = async (id: number) => {
    await deleteCapture(id);
  };

  const handleToggleSelectCapture = (captureId: number) => {
    const next = toggleGuideCaptureSelection(selectedCaptureIds, captureId);
    if (next.limitReached) {
      Alert.alert('안내', '가이드에는 캡처를 최대 10장까지 고를 수 있습니다.');
      return;
    }
    setSelectedCaptureIds(next.selectedIds);
  };

  const handleCreateGuideDraft = async () => {
    if (selectedCaptureIds.length < MIN_GUIDE_CAPTURES || isCreatingGuide) return;
    setIsCreatingGuide(true);
    try {
      const draft = await createMobileGuideDraft(selectedCaptureIds, 0, {
        serverUrl: getServerUrl(),
        getToken,
      });
      setCurrentMobileGuideDraft(draft);
      setSelectingForGuide(false);
      setSelectedCaptureIds([]);
      router.push('/guide/draft' as never);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : '가이드 초안을 만들지 못했습니다.';
      Alert.alert('안내', msg);
    } finally {
      setIsCreatingGuide(false);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.placeSurface }]}>
        <Ionicons name="location-outline" size={48} color={colors.placeAccent} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        저장된 장소가 없습니다
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {'맛집, 카페, 여행지 스크린샷을 캡처하면\n자동으로 여기에 정리됩니다'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="location" size={24} color={colors.placeAccent} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>장소</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.placeSurface }]}>
          <Text style={[styles.countText, { color: colors.placeAccent }]}>
            {captures.length}
          </Text>
        </View>

        {captures.length >= MIN_GUIDE_CAPTURES && (
          <TouchableOpacity
            style={[
              styles.guideModeBtn,
              {
                backgroundColor: selectingForGuide ? colors.surfaceElevated : colors.primary,
              },
            ]}
            onPress={() => {
              if (selectingForGuide) {
                setSelectingForGuide(false);
                setSelectedCaptureIds([]);
              } else {
                setViewMode('list');
                setSelectingForGuide(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.guideModeBtnText,
                { color: selectingForGuide ? colors.textSecondary : colors.background },
              ]}
            >
              {selectingForGuide ? '선택 취소' : '가이드 만들기'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Map / List toggle */}
        <View style={[styles.toggleGroup, { backgroundColor: colors.surfaceElevated }]}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              viewMode === 'map' && { backgroundColor: colors.placeSurface },
            ]}
            onPress={() => setViewMode('map')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="map"
              size={16}
              color={viewMode === 'map' ? colors.placeAccent : colors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              viewMode === 'list' && { backgroundColor: colors.placeSurface },
            ]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="list"
              size={16}
              color={viewMode === 'list' ? colors.placeAccent : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {viewMode === 'map' ? (
        <PlacesMapView places={allPlaces} />
      ) : (
        <FlatList
          data={captures}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const isSelected = selectedCaptureIds.includes(item.id);
            return (
              <View>
                {selectingForGuide && (
                  <TouchableOpacity
                    style={[
                      styles.selectBanner,
                      {
                        backgroundColor: isSelected
                          ? colors.placeSurface
                          : colors.surfaceElevated,
                        borderColor: isSelected ? colors.placeAccent : colors.border,
                      },
                    ]}
                    onPress={() => handleToggleSelectCapture(item.id)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={isSelected ? colors.placeAccent : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.selectBannerText,
                        { color: isSelected ? colors.placeAccent : colors.textSecondary },
                      ]}
                    >
                      {isSelected ? '가이드에 선택됨' : '터치하여 동선 가이드에 추가'}
                    </Text>
                  </TouchableOpacity>
                )}
                <CaptureCard item={item} onDelete={handleDelete} />
              </View>
            );
          }}
          contentContainerStyle={
            captures.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={isLoading ? null : renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.placeAccent}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {selectingForGuide && (
        <View
          style={[
            styles.guideBottomBar,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <Text style={[styles.guideBottomText, { color: colors.text }]}>
            {selectedCaptureIds.length}장 선택됨 (2~10장)
          </Text>
          <TouchableOpacity
            disabled={
              selectedCaptureIds.length < MIN_GUIDE_CAPTURES || isCreatingGuide
            }
            onPress={handleCreateGuideDraft}
            style={[
              styles.createGuideBtn,
              {
                backgroundColor: colors.primary,
                opacity:
                  selectedCaptureIds.length < MIN_GUIDE_CAPTURES || isCreatingGuide
                    ? 0.45
                    : 1,
              },
            ]}
          >
            {isCreatingGuide ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={[styles.createGuideBtnText, { color: colors.background }]}>
                초안 만들기
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
  },
  guideModeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  guideModeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleGroup: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectBannerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  guideBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  guideBottomText: {
    fontSize: 13,
    fontWeight: '600',
  },
  createGuideBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createGuideBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 120,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
