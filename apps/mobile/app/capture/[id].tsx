import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
  Clipboard,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useCaptures } from '@/contexts/CapturesContext';
import { getMapLinks, openMap, openUrl } from '@/services/map-linker';
import { PlaceQuickSearch } from '@/components/PlaceQuickSearch';

export default function CaptureDetailScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { captures, deleteCapture } = useCaptures();
  const item = captures.find((c) => c.id === Number(id));

  const [showFullText, setShowFullText] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPlace = item?.category === 'place';
  const accentColor = isPlace ? colors.placeAccent : colors.textAccent;
  const surfaceColor = isPlace ? colors.placeSurface : colors.textSurface;
  const borderColor = isPlace ? colors.placeBorder : colors.textBorder;

  const handleMapPicker = useCallback((place: NonNullable<typeof item>['places'][0]) => {
    if (!item) return;
    const links = getMapLinks(place.name, place.address);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: place.name,
          message: place.address ?? undefined,
          options: [...links.map((l) => `${l.emoji} ${l.label}`), '취소'],
          cancelButtonIndex: links.length,
        },
        (idx) => {
          if (idx < links.length) {
            openMap(links[idx].provider, place.name, place.address ?? null);
          }
        }
      );
    } else {
      Alert.alert(
        place.name,
        place.address ?? undefined,
        [
          ...links.map((l) => ({
            text: `${l.emoji} ${l.label}`,
            onPress: () => openMap(l.provider, place.name, place.address ?? null),
          })),
          { text: '취소', style: 'cancel' as const },
        ]
      );
    }
  }, [item]);

  const handleCopyText = useCallback(() => {
    if (!item?.extractedText) return;
    Clipboard.setString(item.extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [item]);

  const handleDelete = () => {
    Alert.alert('삭제', '이 캡처를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          if (!item) return;
          await deleteCapture(item.id);
          router.back();
        },
      },
    ]);
  };

  const handleSearch = (query: string, engine: 'naver' | 'google' | 'youtube') => {
    const urls = {
      naver: `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`,
      google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    };
    openUrl(urls[engine]);
  };

  if (!item) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
            캡처를 찾을 수 없습니다
          </Text>
        </View>
      </View>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]} numberOfLines={1}>
          {isPlace ? '장소 상세' : '텍스트 상세'}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Image */}
        {item.imageUri ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.imageUri }}
              style={styles.image}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          </View>
        ) : null}

        <View style={styles.body}>
          {/* Category badge + date */}
          <View style={styles.metaRow}>
            <View style={[styles.categoryBadge, { backgroundColor: surfaceColor }]}>
              <Ionicons
                name={isPlace ? 'location' : 'document-text'}
                size={14}
                color={accentColor}
              />
              <Text style={[styles.categoryText, { color: accentColor }]}>
                {isPlace ? `장소 ${item.places.length}개` : '텍스트'}
              </Text>
            </View>
            {item.confidence != null && (
              <Text style={[styles.confidence, { color: colors.textTertiary }]}>
                AI {Math.round(item.confidence * 100)}%
              </Text>
            )}
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>

          {/* Summary */}
          {item.summary ? (
            <Text style={[styles.summary, { color: colors.textSecondary }]}>{item.summary}</Text>
          ) : null}

          {/* Places */}
          {isPlace && item.places.length > 0 && (
            <View style={[styles.section, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>장소</Text>
              {item.places.map((place, idx) => (
                <View key={idx} style={idx < item.places.length - 1 ? styles.placeBlockGap : undefined}>
                  {/* 장소 행 — 탭하면 ActionSheet (네이버맵/구글맵) */}
                  <TouchableOpacity
                    style={[styles.placeRow, { backgroundColor: surfaceColor }]}
                    onPress={() => handleMapPicker(place)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.placeIndex, { backgroundColor: accentColor }]}>
                      <Text style={styles.placeIndexText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.placeTextGroup}>
                      <Text style={[styles.placeName, { color: colors.text }]}>{place.name}</Text>
                      {place.address ? (
                        <Text style={[styles.placeAddress, { color: colors.textSecondary }]}>
                          {place.address}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>

                  {/* 장소별 설명 */}
                  {place.description ? (
                    <Text style={[styles.placeDescription, { color: colors.textTertiary }]}>
                      {place.description}
                    </Text>
                  ) : null}

                  {/* 퀵서치 아이콘 바 */}
                  <PlaceQuickSearch
                    placeName={place.name}
                    address={place.address}
                  />

                  {/* 장소별 연관링크 */}
                  {place.links && place.links.length > 0 && (
                    <View style={styles.placeLinks}>
                      {place.links.map((link, li) => (
                        <TouchableOpacity
                          key={li}
                          style={[styles.placeLinkBtn, { backgroundColor: surfaceColor, borderColor }]}
                          onPress={() => openUrl(link)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="link" size={12} color={accentColor} />
                          <Text style={[styles.placeLinkText, { color: accentColor }]} numberOfLines={1}>
                            {link}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Extracted Text */}
          {item.extractedText ? (
            <View style={[styles.section, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>추출된 텍스트</Text>
              <TouchableOpacity
                style={[styles.fullTextToggle, { backgroundColor: surfaceColor, borderColor }]}
                onPress={() => setShowFullText((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={[styles.fullTextToggleText, { color: accentColor }]}>
                  {showFullText ? '전문 접기' : '전문보기'}
                </Text>
                <Ionicons
                  name={showFullText ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={accentColor}
                />
              </TouchableOpacity>
              {showFullText && (
                <View style={[styles.fullTextBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.fullText, { color: colors.text }]}>
                    {item.extractedText}
                  </Text>
                  <TouchableOpacity
                    style={[styles.copyBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                    onPress={handleCopyText}
                  >
                    <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.copyBtnText, { color: colors.textSecondary }]}>
                      {copied ? '복사됨!' : '복사'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}

          {/* Related Search */}
          {!isPlace && item.title && (
            <View style={[styles.section, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>관련 내용보기</Text>
              <View style={styles.searchRow}>
                {(
                  [
                    { engine: 'naver' as const, emoji: '🟢', label: '네이버' },
                    { engine: 'google' as const, emoji: '🔵', label: 'Google' },
                    { engine: 'youtube' as const, emoji: '🔴', label: 'YouTube' },
                  ] as const
                ).map(({ engine, emoji, label }) => (
                  <TouchableOpacity
                    key={engine}
                    style={[styles.searchBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => handleSearch(item.title, engine)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.searchEmoji}>{emoji}</Text>
                    <Text style={[styles.searchLabel, { color: colors.textSecondary }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Links */}
          {item.links.length > 0 && (
            <View style={[styles.section, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>관련 링크</Text>
              {item.links.map((link, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.linkBtn, { backgroundColor: surfaceColor, borderColor }]}
                  onPress={() => openUrl(link)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="link" size={14} color={accentColor} />
                  <Text style={[styles.linkText, { color: accentColor }]} numberOfLines={1}>
                    {link}
                  </Text>
                  <Ionicons name="open-outline" size={14} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <View style={[styles.section, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>태그</Text>
              <View style={styles.tagsRow}>
                {item.tags.map((tag, idx) => (
                  <View key={idx} style={[styles.tag, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 56,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 8,
    width: 40,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  deleteBtn: {
    padding: 8,
    width: 40,
    alignItems: 'flex-end',
  },
  scroll: {
    flex: 1,
  },
  imageContainer: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 260,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confidence: {
    fontSize: 11,
    fontFamily: 'monospace' as never,
  },
  dateText: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 30,
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  section: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  placeRowGap: {
    marginBottom: 8,
  },
  placeIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  placeIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#050508',
  },
  placeTextGroup: {
    flex: 1,
    gap: 2,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '600',
  },
  placeAddress: {
    fontSize: 13,
  },
  placeBlockGap: {
    marginBottom: 14,
  },
  placeDescription: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  placeLinks: {
    paddingTop: 6,
    gap: 4,
  },
  placeLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  placeLinkText: {
    fontSize: 11,
    flex: 1,
  },
  fullTextToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  fullTextToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fullTextBox: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  fullText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'monospace' as never,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  searchEmoji: {
    fontSize: 14,
  },
  searchLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  linkText: {
    fontSize: 13,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 16,
  },
});
