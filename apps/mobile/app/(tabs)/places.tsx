import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CaptureCard } from '@/components/CaptureCard';
import { PlacesMapView } from '@/components/PlacesMapView';
import { useCaptures } from '@/contexts/CapturesContext';
import { PlaceInfo } from '@/services/analyzers/types';

type ViewMode = 'map' | 'list';

export default function PlacesScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const [viewMode, setViewMode] = useState<ViewMode>('map');

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
          renderItem={({ item }) => (
            <CaptureCard item={item} onDelete={handleDelete} />
          )}
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
  listContent: {
    paddingTop: 4,
    paddingBottom: 100,
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
