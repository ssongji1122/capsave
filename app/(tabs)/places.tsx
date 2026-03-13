import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CaptureItem, getCapturesByCategory, deleteCapture } from '@/services/database';
import { CaptureCard } from '@/components/CaptureCard';

export default function PlacesScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCaptures = useCallback(async () => {
    try {
      const items = await getCapturesByCategory('place');
      setCaptures(items);
    } catch (error) {
      console.error('Failed to load places:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCaptures();
    }, [loadCaptures])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCaptures();
  };

  const handleDelete = async (id: number) => {
    await deleteCapture(id);
    loadCaptures();
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
        맛집, 카페, 여행지 스크린샷을 캡처하면{'\n'}자동으로 여기에 정리됩니다
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
      </View>

      <FlatList
        data={captures}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <CaptureCard item={item} onDelete={handleDelete} />
        )}
        contentContainerStyle={captures.length === 0 ? styles.emptyContainer : styles.listContent}
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
