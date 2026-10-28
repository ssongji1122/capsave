import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { PlaceReviews } from '@/components/PlaceReviews';
import { supabase } from '@/services/supabase';
import {
  getCurrentMobileGuideDraft,
  moveMobileGuidePlace,
  removeMobileGuidePlace,
  saveMobileGuide,
  setCurrentMobileGuideDraft,
} from '@/services/guides';

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function getServerUrl(): string {
  return (
    (Constants.expoConfig?.extra?.serverUrl as string | undefined) ||
    process.env.EXPO_PUBLIC_API_URL ||
    'https://scrave.vercel.app'
  );
}

export default function MobileGuideDraftScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const initialDraft = getCurrentMobileGuideDraft();
  const [guide, setGuide] = useState(initialDraft?.guide ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedShareUrl, setSavedShareUrl] = useState<string | null>(null);

  if (!guide) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          만들어 둔 가이드 초안이 없습니다
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.primaryBtnText, { color: colors.background }]}>
            장소 목록으로 돌아가기
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleMove = (placeId: string, direction: -1 | 1) => {
    const next = moveMobileGuidePlace(guide, placeId, direction);
    setGuide(next);
    if (initialDraft) {
      setCurrentMobileGuideDraft({ ...initialDraft, guide: next });
    }
  };

  const handleRemove = (placeId: string) => {
    const next = removeMobileGuidePlace(guide, placeId);
    setGuide(next);
    if (initialDraft) {
      setCurrentMobileGuideDraft({ ...initialDraft, guide: next });
    }
  };

  const handleSaveAndShare = async (unlisted: boolean) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = await saveMobileGuide(
        guide,
        unlisted ? 'unlisted' : 'private',
        {
          serverUrl: getServerUrl(),
          getToken,
        },
      );
      if (unlisted) {
        setSavedShareUrl(saved.shareUrl);
        await Share.share({
          title: guide.title,
          message: `${guide.title}\n${saved.shareUrl}`,
          url: saved.shareUrl,
        });
      } else {
        Alert.alert('저장 완료', '가이드 보관함에 비공개로 저장했습니다.');
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : '가이드를 저장하지 못했습니다.';
      Alert.alert('안내', msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.badgeText, { color: colors.primaryLight }]}>
            AI 초안 · 방문 전 확인 필요
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {guide.title}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {guide.description}
        </Text>

        {guide.places.map((place, index) => (
          <View
            key={place.id}
            style={[
              styles.placeCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.placeHeader}>
              <View style={[styles.seqBadge, { backgroundColor: colors.placeAccent }]}>
                <Text style={[styles.seqText, { color: colors.background }]}>
                  {place.sequence}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.placeName, { color: colors.text }]}>
                  {place.name}
                </Text>
                {place.scene ? (
                  <Text style={[styles.sceneText, { color: colors.textTertiary }]}>
                    {place.scene}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                disabled={index === 0}
                onPress={() => handleMove(place.id, -1)}
                style={[styles.iconBtn, index === 0 && styles.disabledBtn]}
                accessibilityLabel={`${place.name} 위로`}
              >
                <Ionicons name="arrow-up" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                disabled={index === guide.places.length - 1}
                onPress={() => handleMove(place.id, 1)}
                style={[
                  styles.iconBtn,
                  index === guide.places.length - 1 && styles.disabledBtn,
                ]}
                accessibilityLabel={`${place.name} 아래로`}
              >
                <Ionicons name="arrow-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                disabled={guide.places.length <= 2}
                onPress={() => handleRemove(place.id)}
                style={[
                  styles.iconBtn,
                  guide.places.length <= 2 && styles.disabledBtn,
                ]}
                accessibilityLabel={`${place.name} 빼기`}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>

            {place.address ? (
              <Text style={[styles.addressText, { color: colors.textTertiary }]}>
                {place.address}
              </Text>
            ) : null}

            <View style={[styles.metaBox, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.metaLabel, { color: colors.placeAccent }]}>
                방문 시간대: {place.visitWindow}
              </Text>
              <Text style={[styles.metaNote, { color: colors.textSecondary }]}>
                {place.practicalNote}
              </Text>
            </View>

            <PlaceReviews placeName={place.name} />
          </View>
        ))}

        {savedShareUrl ? (
          <Text style={[styles.shareUrlNote, { color: colors.placeAccent }]}>
            공유 링크: {savedShareUrl}
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footerBar,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          disabled={isSaving}
          onPress={() => handleSaveAndShare(false)}
          style={[
            styles.secondaryBtn,
            { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
          ]}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
            비공개 저장
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={isSaving}
          onPress={() => handleSaveAndShare(true)}
          style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Text style={[styles.primaryBtnText, { color: colors.background }]}>
              링크 공유 · 웹에서 보기
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 110, gap: 12 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  placeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seqBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqText: { fontSize: 12, fontWeight: '800' },
  placeName: { fontSize: 16, fontWeight: '700' },
  sceneText: { fontSize: 12, marginTop: 2 },
  iconBtn: { padding: 6 },
  disabledBtn: { opacity: 0.3 },
  addressText: { fontSize: 12 },
  metaBox: { borderRadius: 12, padding: 10, gap: 4 },
  metaLabel: { fontSize: 12, fontWeight: '700' },
  metaNote: { fontSize: 12, lineHeight: 18 },
  shareUrlNote: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    gap: 10,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
});
