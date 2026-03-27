import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Animated,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CaptureItem } from '@/services/database';
import { CaptureCard } from '@/components/CaptureCard';
import { useCaptures } from '@/contexts/CapturesContext';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { captures: allCaptures, isLoading, refresh, deleteCapture, searchCaptures } = useCaptures();

  const [displayCaptures, setDisplayCaptures] = useState<CaptureItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fabScale = useRef(new Animated.Value(1)).current;

  // Sync display captures with context
  useEffect(() => {
    if (!searchQuery) {
      setDisplayCaptures(allCaptures);
    }
  }, [allCaptures, searchQuery]);

  const handleSearch = useCallback(async () => {
    if (searchQuery) {
      const results = await searchCaptures(searchQuery);
      setDisplayCaptures(results);
    } else {
      setDisplayCaptures(allCaptures);
    }
  }, [searchQuery, allCaptures, searchCaptures]);

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

  const handleAddCapture = async () => {
    // Animate FAB press
    Animated.sequence([
      Animated.spring(fabScale, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('사진 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      router.push({
        pathname: '/capture/analyze',
        params: { imageUri: result.assets[0].uri },
      });
    }
  };

  const totalCount = displayCaptures.length;
  const placeCount = displayCaptures.filter((c) => c.category === 'place').length;
  const textCount = displayCaptures.filter((c) => c.category === 'text').length;

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name="camera-outline" size={48} color={colors.textTertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        캡처를 시작해보세요
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        스크린샷을 선택하면{'\n'}AI가 자동으로 분석해 정리해드립니다
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
        onPress={handleAddCapture}
      >
        <Ionicons name="add" size={20} color="#FFF" />
        <Text style={styles.emptyButtonText}>첫 캡처 추가하기</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>CapSave</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            AI 캡처 오거나이저
          </Text>
        </View>
      </View>

      {/* Stats Bar */}
      {totalCount > 0 && (
        <View style={[styles.statsBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{totalCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>전체</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.placeAccent }]}>{placeCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>장소</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.textAccent }]}>{textCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>텍스트</Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="캡처 검색..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setDisplayCaptures(allCaptures); }}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={displayCaptures}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <CaptureCard item={item} onDelete={handleDelete} />
        )}
        contentContainerStyle={displayCaptures.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={isLoading ? null : renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={handleAddCapture}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 4,
    fontWeight: '500',
  },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: 24,
    padding: 0,
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
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
