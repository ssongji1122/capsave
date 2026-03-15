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
import { Colors, ThemeColors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CaptureItem, CaptureCategory, getCapturesByCategory, deleteCapture } from '@/services/database';
import { CaptureCard } from '@/components/CaptureCard';

interface CategoryListScreenProps {
  category: CaptureCategory;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accentColor: (colors: ThemeColors) => string;
  surfaceColor: (colors: ThemeColors) => string;
  emptyIcon: React.ComponentProps<typeof Ionicons>['name'];
  emptyTitle: string;
  emptySubtitle: string;
}

export function CategoryListScreen({
  category,
  title,
  icon,
  accentColor,
  surfaceColor,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
}: CategoryListScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const accent = accentColor(colors);
  const surface = surfaceColor(colors);

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
    try {
      await deleteCapture(id);
      loadCaptures();
    } catch (error) {
      console.error('Failed to delete capture:', error);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: surface }]}>
        <Ionicons name={emptyIcon} size={48} color={accent} />
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
        <Ionicons name={icon} size={24} color={accent} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        <View style={[styles.countBadge, { backgroundColor: surface }]}>
          <Text style={[styles.countText, { color: accent }]}>
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
            tintColor={accent}
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
