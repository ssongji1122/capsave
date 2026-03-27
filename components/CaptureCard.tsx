import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CaptureItem } from '@/services/database';
import { getMapLinks, openMap, openUrl } from '@/services/map-linker';

interface CaptureCardProps {
  item: CaptureItem;
  onDelete?: (id: number) => void;
}

export function CaptureCard({ item, onDelete }: CaptureCardProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const isPlace = item.category === 'place';

  const accentColor = isPlace ? colors.placeAccent : colors.textAccent;
  const surfaceColor = isPlace ? colors.placeSurface : colors.textSurface;
  const borderColor = isPlace ? colors.placeBorder : colors.textBorder;

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

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: surfaceColor }]}>
          <Ionicons
            name={isPlace ? 'location' : 'document-text'}
            size={14}
            color={accentColor}
          />
          <Text style={[styles.categoryText, { color: accentColor }]}>
            {isPlace ? '장소' : '텍스트'}
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
      {item.imageUri && (
        <Image
          source={{ uri: item.imageUri }}
          style={styles.cardImage}
          contentFit="cover"
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

      {/* Place Actions */}
      {isPlace && item.placeName && (
        <View style={styles.placeSection}>
          <View style={[styles.placeInfo, { backgroundColor: surfaceColor }]}>
            <Ionicons name="pin" size={14} color={accentColor} />
            <Text style={[styles.placeName, { color: colors.text }]} numberOfLines={1}>
              {item.placeName}
            </Text>
          </View>
          {item.address && (
            <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.address}
            </Text>
          )}
          <View style={styles.mapButtons}>
            {getMapLinks(item.placeName, item.address).map((link) => (
              <TouchableOpacity
                key={link.provider}
                style={[styles.mapButton, { borderColor }]}
                onPress={() => openMap(link.provider, item.placeName!, item.address)}
              >
                <Text style={styles.mapEmoji}>{link.emoji}</Text>
                <Text style={[styles.mapLabel, { color: colors.text }]}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 32, // High border radius as requested
    borderWidth: 1,
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
    height: 180,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
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
  placeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  placeName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  addressText: {
    fontSize: 12,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  mapButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  mapEmoji: {
    fontSize: 14,
  },
  mapLabel: {
    fontSize: 12,
    fontWeight: '600',
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
