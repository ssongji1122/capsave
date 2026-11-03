import { StickerDecoration } from '@/components/StickerDecoration';
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, TextInput, Animated, StatusBar, RefreshControl, useWindowDimensions, Alert, Linking } from 'react-native';
import { Text } from '@/components/ScraveText';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CaptureItem } from '@/services/database';
import { ARCHIVE_SECTIONS, classifyArchiveCapture, type ArchiveSection, CAPTURE_SORT_OPTIONS, sortCaptures, relatedCaptures, type CaptureSort } from '@scrave/shared';
import { ArchiveIllustration } from '@/components/ArchiveIllustration';
import { CategoryShape } from '@/components/CategoryShape';
import { CaptureCard } from '@/components/CaptureCard';
import { useCaptureMeta } from '@/contexts/CaptureMetaContext';
import { selectArchiveCaptures, ARCHIVE_LENSES } from '@/services/archive-view';
import type { ArchiveLens } from '../../../../packages/shared/src/utils/capture-intent';
import { useCaptures } from '@/contexts/CapturesContext';
import { selectCaptureImage } from '@/services/image-picker-flow';
import { CaptureSyncNotice } from '@/components/CaptureSyncNotice';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { captures: allCaptures, isLoading, syncError, refresh, deleteCapture } = useCaptures();

  const { metaMap, error: metaError } = useCaptureMeta();
  const [lens, setLens] = useState<ArchiveLens>('all');
  const [archiveSection, setArchiveSection] = useState<ArchiveSection | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [sort, setSort] = useState<CaptureSort>('recent');
  const [anchorId, setAnchorId] = useState<number | null>(null);
  const [deck, setDeck] = useState(false);
  const { width } = useWindowDimensions();

  const fabScale = useRef(new Animated.Value(1)).current;

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayCaptures = useMemo(() => selectArchiveCaptures(allCaptures, metaMap, {query:debouncedQuery,lens,section:'all'}), [allCaptures,metaMap,debouncedQuery,lens]);

  const filtered = displayCaptures.filter(item=>archiveSection==='all'||classifyArchiveCapture(item)===archiveSection);
  const anchor = filtered.find(c=>c.id===anchorId) ?? sortCaptures(filtered,'recent')[0];
  const deckCategory = archiveSection === 'all' && anchor ? classifyArchiveCapture(anchor) : archiveSection;
  const ordered = sortCaptures(deck ? filtered.filter(c=>classifyArchiveCapture(c)===deckCategory) : filtered,sort,anchor);
  const related = anchor ? relatedCaptures(anchor,filtered) : [];

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
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

    try {
      const result = await selectCaptureImage({
        requestPermission: ImagePicker.requestMediaLibraryPermissionsAsync,
        openPicker: ImagePicker.launchImageLibraryAsync,
        onPermissionDenied: (requiresSettings) => {
          if (requiresSettings) {
            Alert.alert(
              '사진 접근 권한 필요',
              '설정에서 사진 접근을 허용한 뒤 다시 시도해 주세요.',
              [
                { text: '취소', style: 'cancel' },
                { text: '설정 열기', onPress: () => { void Linking.openSettings(); } },
              ],
            );
            return;
          }
          Alert.alert('사진 접근 권한 필요', '사진 접근 요청을 허용한 뒤 다시 시도해 주세요.');
        },
      });

      if (result.status !== 'selected') {
        if (result.status === 'error') {
          Alert.alert('사진 선택 실패', '선택한 사진을 불러오지 못했습니다. 다시 시도해 주세요.');
        }
        return;
      }

      router.push({
        pathname: '/capture/analyze',
        params: { imageUri: result.imageUri },
      });
    } catch {
      Alert.alert('사진 선택 실패', '사진 보관함을 열지 못했습니다. 다시 시도해 주세요.');
    }
  };


  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated }]}>
        <ArchiveIllustration kind="add" size={96} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {allCaptures.length ? '조건에 맞는 캡처가 없습니다' : '첫 캡처를 추가합니다'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {allCaptures.length ? '검색어나 분류를 바꾸면 다른 캡처를 확인할 수 있습니다.' : '스크린샷을 선택하면 내용을 분석해 정리합니다.'}
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
      <View style={[styles.header,{position:"relative",minHeight:170}]}>
        <StickerDecoration target="archive" label="보관함"/>
        <View>
          <Text style={[styles.brand, { color: colors.primary }]}>scrave</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>my craves</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            캡처로 모아 둔 일상과 취향
          </Text>
        </View>
        <View style={{alignItems:'center'}}>
          <ArchiveIllustration kind="archive" size={64} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Instagram 링크 저장" onPress={()=>router.push('/capture/link' as never)} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.primary,fontSize:13}}>링크 저장</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="내 가이드" onPress={()=>router.push('/guide' as never)} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.primary,fontSize:13}}>내 가이드</Text></TouchableOpacity>
        </View>
      </View>

      <CaptureSyncNotice
        message={syncError}
        onRetry={() => { void handleRefresh(); }}
        retrying={refreshing}
      />

      <View style={styles.archiveFilters} accessibilityLabel="다시 꺼내 보기">
        {ARCHIVE_LENSES.map(option=><TouchableOpacity key={option.id} accessibilityRole="button" accessibilityLabel={option.label} accessibilityState={{selected:lens===option.id}} onPress={()=>setLens(option.id)} style={[styles.archiveFilter,{borderBottomColor:lens===option.id?colors.primary:'transparent'}]}><Text style={{fontSize:13,color:lens===option.id?colors.text:colors.textSecondary}}>{option.label}</Text></TouchableOpacity>)}
      </View>
      {metaError ? <Text style={{color:colors.error,paddingHorizontal:16}}>{metaError}</Text> : null}
      <View style={styles.archiveFilters} accessibilityLabel="캡처 종류">
        {[{id:'all' as const,label:'전체'},...ARCHIVE_SECTIONS].map(section => <TouchableOpacity key={section.id} accessibilityRole="button" accessibilityState={{selected:archiveSection===section.id}} onPress={() => setArchiveSection(section.id)} style={[styles.archiveFilter, {borderBottomColor:archiveSection===section.id?colors.primary:'transparent'}]}>{section.id !== 'all' && <CategoryShape section={section.id}/>}<Text style={{fontSize: 12,color:archiveSection===section.id?colors.text:colors.textSecondary}}>{section.label} {displayCaptures.filter(item=>section.id==='all'||classifyArchiveCapture(item)===section.id).length}</Text></TouchableOpacity>)}
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

      <View style={{paddingHorizontal:16, gap:8, paddingBottom:12}}>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}} accessibilityLabel="카드 정렬">
          {CAPTURE_SORT_OPTIONS.map(option=><TouchableOpacity key={option.id} accessibilityRole="button" accessibilityState={{selected:sort===option.id}} onPress={()=>setSort(option.id)} style={{minHeight:44,justifyContent:'center',paddingHorizontal:10,borderRadius:12,borderWidth:1,borderColor:sort===option.id?colors.primary:colors.border}}><Text style={{color:colors.text,fontSize:12}}>{option.label}</Text></TouchableOpacity>)}
          <TouchableOpacity accessibilityRole="button" onPress={()=>setDeck(!deck)} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.primary}}>{deck?'모아보기':'한 장씩'}</Text></TouchableOpacity>
        </View>
        {deck && <Text style={{color:colors.textSecondary,fontSize:12}}>같은 카테고리의 카드만 좌우로 넘깁니다. 다른 종류는 위에서 선택하세요.</Text>}
        {sort==='upcoming' && <Text style={{color:colors.textSecondary,fontSize:12}}>캡처에서 읽은 오늘 이후 날짜를 먼저 보여줍니다. 변경 여부는 원본에서 확인하세요.</Text>}
        {sort==='related' && anchor && <Text style={{color:colors.textSecondary,fontSize:12}}>연관 기준: {anchor.title} · 같은 카테고리의 태그·장소·출처 계정을 비교합니다.</Text>}
      </View>
      {/* List */}
      <FlatList
        key={`${deck ? 'deck' : 'grid'}:${sort}:${archiveSection}:${anchor?.id ?? ''}`}
        numColumns={deck ? 1 : 2}
        horizontal={deck}
        pagingEnabled={deck}
        columnWrapperStyle={deck ? undefined : { gap: 14, paddingHorizontal: 16 }}
        data={ordered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={deck ? {width,paddingHorizontal:16} : {flex:1,maxWidth:'50%'}}>
            <CaptureCard compact fillWidth item={item} onDelete={handleDelete} />
            {sort==='related' && <View style={{padding:8}}><Text style={{color:colors.textSecondary,fontSize:12}}>{item.id===anchor?.id ? '연관 기준 카드' : related.find(r=>r.capture.id===item.id)?.reasons.join(' / ') ?? '연결 근거 없음'}</Text><TouchableOpacity accessibilityRole="button" onPress={()=>setAnchorId(item.id)} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.primary}}>이 카드 기준으로 보기</Text></TouchableOpacity></View>}
          </View>
        )}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
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
          accessibilityRole="button"
          accessibilityLabel="캡처 추가"
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
  archiveFilters:{flexDirection:"row",flexWrap:"wrap",gap:16,marginHorizontal:24,marginBottom:24},
  archiveFilter:{flexDirection:"row",alignItems:"center",gap:4,minHeight:44,borderBottomWidth:1,justifyContent:"center"},
  container: {
    flex: 1,
  },
  brand: { fontFamily: 'SUIT-SemiBold', fontSize: 24, letterSpacing: -1, marginBottom: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'SUIT-SemiBold',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 6,
    fontFamily: 'SUIT-Medium',
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
    fontFamily: 'SUIT-SemiBold',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'SUIT-Medium',
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
    fontFamily: 'SUIT-Regular',
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
    fontFamily: 'SUIT-SemiBold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'SUIT-Regular',
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
    fontFamily: 'SUIT-SemiBold',
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
    shadowColor: '#526985',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
});
