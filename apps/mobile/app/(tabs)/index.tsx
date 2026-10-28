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
import { ARCHIVE_SECTIONS, classifyArchiveCapture, type ArchiveSection } from '@scrave/shared';
import { CategoryShape } from '@/components/CategoryShape';
import { CaptureCard } from '@/components/CaptureCard';
import { useCaptures } from '@/contexts/CapturesContext';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { captures: allCaptures, isLoading, refresh, deleteCapture, searchCaptures } = useCaptures();

  const [displayCaptures, setDisplayCaptures] = useState<CaptureItem[]>([]);
  const [archiveSection, setArchiveSection] = useState<ArchiveSection | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fabScale = useRef(new Animated.Value(1)).current;

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync display captures with context and debounced search
  useEffect(() => {
    const updateCaptures = async () => {
      if (debouncedQuery) {
        const results = await searchCaptures(debouncedQuery);
        setDisplayCaptures(results);
      } else {
        setDisplayCaptures(allCaptures);
      }
    };
    updateCaptures();
  }, [allCaptures, debouncedQuery, searchCaptures]);

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
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>my craves</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            scrap, save your crave
          </Text>
        </View>
      </View>

      <View style={styles.archiveFilters} accessibilityLabel="캡처 종류">
        {[{id:'all' as const,label:'전체'},...ARCHIVE_SECTIONS].map(section => <TouchableOpacity key={section.id} accessibilityRole="button" accessibilityState={{selected:archiveSection===section.id}} onPress={() => setArchiveSection(section.id)} style={[styles.archiveFilter, {borderBottomColor:archiveSection===section.id?colors.primary:'transparent'}]}>{section.id !== 'all' && <CategoryShape section={section.id}/>}<Text style={{fontSize:12,color:archiveSection===section.id?colors.text:colors.textSecondary}}>{section.label} {displayCaptures.filter(item=>section.id==='all'||classifyArchiveCapture(item)===section.id).length}</Text></TouchableOpacity>)}
      </View>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="캡처 검색..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        numColumns={2}
        columnWrapperStyle={{ gap: 14, paddingHorizontal: 16 }}
        data={displayCaptures.filter(item=>archiveSection==='all'||classifyArchiveCapture(item)===archiveSection)}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <CaptureCard compact item={item} onDelete={handleDelete} />
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
          style={[styles.fab, { backgroundColor: colors.text }]}
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
  archiveFilters:{flexDirection:"row",flexWrap:"wrap",gap:16,marginHorizontal:24,marginBottom:24},
  archiveFilter:{flexDirection:"row",alignItems:"center",gap:4,minHeight:44,borderBottomWidth:1,justifyContent:"center"},
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '700',
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
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
