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
import { CaptureCategory } from '@/services/ai-analyzer';

interface CategoryScreenProps {
  category: CaptureCategory;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  emptyIcon: keyof typeof Ionicons.glyphMap;
  emptyTitle: string;
  emptySubtitle: string;
}

export function CategoryScreen({
  category,
  title,
  icon,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
}: CategoryScreenProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const isPlace = category === 'place';
  const accentColor = isPlace ? colors.placeAccent : colors.textAccent;
  const surfaceColor = isPlace ? colors.placeSurface : colors.textSurface;

  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCaptures = useCallback(async () => {
    try {
      const items = await getCapturesByCategory(category);
      setCaptures(items);
    } catch (error) {
      console.error(`Failed to load ${category}:`, error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [category]);

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
      <View style={[styles.emptyIcon, { backgroundColor: surfaceColor }]}>
        <Ionicons name={emptyIcon} size={48} color={accentColor} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {emptyTitle}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {emptySubtitle}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Ionicons name={icon} size={24} color={accentColor} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        <View style={[styles.countBadge, { backgroundColor: surfaceColor }]}>
          <Text style={[styles.countText, { color: accentColor }]}>
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
            tintColor={accentColor}
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
