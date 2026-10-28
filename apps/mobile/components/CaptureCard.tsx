import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ARCHIVE_APPEARANCE, ARCHIVE_SECTIONS, classifyArchiveCapture } from '@scrave/shared';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CaptureItem } from '@/services/database';
import { getMapLinks, openMap, openUrl, sortByPreferredProvider } from '@/services/map-linker';
import { useSignedImage } from '@/hooks/useSignedImage';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';

interface CaptureCardProps {
  item: CaptureItem;
  onDelete?: (id: number) => void;
  compact?: boolean;
}

export function CaptureCard({ item, onDelete, compact = false }: CaptureCardProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const isPlace = item.category === 'place';

  const accentColor = isPlace ? colors.placeAccent : colors.textAccent;
  const resolvedImageUri = useSignedImage(item.imageUri);
  const surfaceColor = isPlace ? colors.placeSurface : colors.textSurface;
  const borderColor = isPlace ? colors.placeBorder : colors.textBorder;
  const { preferredNavApp } = useUserPreferences();

  const handleMapPicker = useCallback((place: typeof item.places[0]) => {
    const links = sortByPreferredProvider(getMapLinks(place.name, place.address), preferredNavApp);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: place.name,
          message: place.address,
          options: [...links.map((l) => l.label), '취소'],
          cancelButtonIndex: links.length,
        },
        (idx) => {
          if (idx < links.length) {
            openMap(links[idx].provider, place.name, place.address);
          }
        }
      );
    } else {
      Alert.alert(
        place.name,
        place.address,
        [
          ...links.map((l) => ({
            text: l.label,
            onPress: () => openMap(l.provider, place.name, place.address),
          })),
          { text: '취소', style: 'cancel' as const },
        ]
      );
    }
  }, [item.places, preferredNavApp]);

  const handleDelete = () => {
    Alert.alert(
      '삭제',
      '이 캡처를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => onDelete?.(item.id),
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${mins}`;
  };

  if (compact) {
    const section = classifyArchiveCapture(item);
    const appearance = ARCHIVE_APPEARANCE[section];
    const icons = { blob: 'flower', cross: 'add', x: 'close', star: 'star' } as const;
    return <TouchableOpacity style={styles.photoCard} accessibilityRole="button" accessibilityLabel={`${item.title} 정리 내용과 출처 보기`} onPress={() => router.push(`/capture/${item.id}`)} onLongPress={handleDelete}>
      {resolvedImageUri && <Image source={{ uri: resolvedImageUri }} style={[styles.photoImage, { backgroundColor: colors.surfaceElevated }]} contentFit="contain" cachePolicy="memory-disk" />}
      <Text style={[styles.photoTitle, {color: colors.text}]} numberOfLines={2}>{item.title}</Text>
      <View style={styles.photoMeta}><Ionicons name={icons[appearance.shape]} size={12} color={appearance.color}/><Text style={{color: colors.textSecondary, fontSize: 11}}>{ARCHIVE_SECTIONS.find(s=>s.id===section)?.label}</Text></View>
    </TouchableOpacity>;
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.background, borderColor: colors.borderLight }]}
      onPress={() => router.push(`/capture/${item.id}`)}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: surfaceColor }]}>
          <Ionicons
            name={isPlace ? 'location' : 'document-text'}
            size={14}
            color={accentColor}
          />
          <Text style={[styles.categoryText, { color: accentColor }]}>
            {ARCHIVE_SECTIONS.find(section=>section.id===classifyArchiveCapture(item))?.label}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.dateText, { color: colors.textTertiary }]}>
            {formatDate(item.createdAt)}
          </Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Preview */}
      {resolvedImageUri && (
        <Image
          source={{ uri: resolvedImageUri }}
          style={styles.cardImage}
          contentFit="contain"
          transition={200}
          cachePolicy="memory-disk"
        />
      )}

      {/* Title & Summary */}
      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      {item.summary ? (
        <Text style={[styles.cardSummary, { color: colors.textSecondary }]} numberOfLines={3}>
          {item.summary}
        </Text>
      ) : null}

      {/* Places */}
      {isPlace && item.places.length > 0 && (
        <View style={styles.placeSection}>
          {item.places.map((place, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.placeRow, { backgroundColor: surfaceColor }, idx < item.places.length - 1 && styles.placeRowGap]}
              onPress={() => handleMapPicker(place)}
              activeOpacity={0.7}
            >
              <Ionicons name="pin" size={14} color={accentColor} style={styles.placePin} />
              <View style={styles.placeTextGroup}>
                <Text style={[styles.placeName, { color: colors.text }]} numberOfLines={1}>
                  {place.name}
                </Text>
                {place.address && (
                  <Text style={[styles.placeAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                    {place.address}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Links */}
      {item.links.length > 0 && (
        <View style={styles.linksSection}>
          {item.links.slice(0, 3).map((link, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.linkBtn, { backgroundColor: surfaceColor, borderColor }]}
              onPress={() => openUrl(link)}
            >
              <Ionicons name="link" size={14} color={accentColor} />
              <Text style={[styles.linkText, { color: accentColor }]} numberOfLines={1}>
                {link.length > 40 ? link.substring(0, 40) + '...' : link}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tags */}
      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.map((tag, index) => (
            <View key={index} style={[styles.tag, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  photoCard: { flex: 1, maxWidth: '48%', minWidth: 0, marginBottom: 20 },
  photoImage: { width: '100%', height: 220, borderRadius: 14 },
  photoTitle: { fontSize: 14, fontWeight: '600', marginTop: 10, lineHeight: 20 },
  photoMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  card: {
    borderRadius: 0,
    borderTopWidth: 1,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 12,
  },
  deleteBtn: {
    padding: 4,
  },
  cardImage: {
    width: '100%',
    height: 260,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 36,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cardSummary: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  placeSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  placeRowGap: {
    marginBottom: 6,
  },
  placePin: {
    marginRight: 8,
  },
  placeTextGroup: {
    flex: 1,
    gap: 2,
  },
  placeName: {
    fontSize: 14,
    fontWeight: '600',
  },
  placeAddress: {
    fontSize: 12,
  },
  linksSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 6,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  linkText: {
    fontSize: 13,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
