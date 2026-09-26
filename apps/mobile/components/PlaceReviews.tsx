import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import type { PlaceReviewResult } from '@scrave/shared';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { openUrl } from '@/services/map-linker';
import { describeReviewSource, fetchPlaceReviews, formatSceneLine } from '@/services/place-reviews';
import { supabase } from '@/services/supabase';

interface PlaceReviewsProps {
  placeName: string;
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; result: PlaceReviewResult }
  | { status: 'error'; message: string };

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function PlaceReviews({ placeName }: PlaceReviewsProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [showDropped, setShowDropped] = useState(false);

  const load = async () => {
    const serverUrl = Constants.expoConfig?.extra?.serverUrl;
    if (!serverUrl) {
      setState({ status: 'error', message: '서버 주소가 설정되지 않았습니다.' });
      return;
    }
    setState({ status: 'loading' });
    try {
      const result = await fetchPlaceReviews(placeName, { serverUrl, getToken });
      setState({ status: 'loaded', result });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '후기와 영상을 불러오지 못했습니다.',
      });
    }
  };

  if (state.status !== 'loaded') {
    return (
      <View style={styles.idle}>
        <TouchableOpacity
          style={[styles.loadButton, { backgroundColor: colors.placeSurface, borderColor: colors.placeBorder }]}
          onPress={load}
          disabled={state.status === 'loading'}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          {state.status === 'loading' ? (
            <ActivityIndicator size="small" color={colors.placeAccent} />
          ) : (
            <Ionicons name={state.status === 'error' ? 'refresh' : 'sparkles'} size={13} color={colors.placeAccent} />
          )}
          <Text style={[styles.loadButtonText, { color: colors.placeAccent }]}>
            {state.status === 'loading'
              ? '후기·영상 고르는 중'
              : state.status === 'error'
                ? '다시 불러오기'
                : '골라 둔 후기·영상'}
          </Text>
        </TouchableOpacity>
        {state.status === 'error' && (
          <Text style={[styles.note, { color: colors.textTertiary }]}>{state.message}</Text>
        )}
      </View>
    );
  }

  const { naver, youtube } = state.result;
  const naverNote = describeReviewSource('naver', naver.status, naver.posts.length === 0);
  const youtubeNote = describeReviewSource('youtube', youtube.status, youtube.videos.length === 0);

  return (
    <View style={[styles.panel, { borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.placeAccent }]}>네이버 후기 · 협찬 글 제외</Text>
      {naver.posts.map((post) => (
        <TouchableOpacity
          key={post.url}
          style={[styles.item, { borderBottomColor: colors.border }]}
          onPress={() => openUrl(post.url)}
          activeOpacity={0.7}
        >
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
            {post.title}
          </Text>
          <Text style={[styles.meta, { color: colors.textTertiary }]}>
            {[post.blogger, post.date].filter(Boolean).join(' · ')}
          </Text>
          {post.excerpt ? (
            <Text style={[styles.excerpt, { color: colors.textSecondary }]} numberOfLines={2}>
              {post.excerpt}
            </Text>
          ) : null}
          <View style={styles.chips}>
            {post.reasons.map((reason) => (
              <Text
                key={reason}
                style={[styles.chip, { color: colors.placeAccent, backgroundColor: colors.placeSurface, borderColor: colors.placeBorder }]}
              >
                {reason}
              </Text>
            ))}
          </View>
        </TouchableOpacity>
      ))}
      {naverNote && <Text style={[styles.note, { color: colors.textTertiary }]}>{naverNote}</Text>}
      <TouchableOpacity onPress={() => openUrl(naver.searchUrl)} activeOpacity={0.7}>
        <Text style={[styles.searchLink, { color: colors.textAccent }]}>네이버에서 직접 보기</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, styles.sectionGap, { color: colors.placeAccent }]}>
        유튜브 · AI 음성 채널과 얼굴 위주 영상 제외
      </Text>
      {youtube.videos.map((video) => (
        <TouchableOpacity
          key={video.id}
          style={[styles.item, styles.videoRow, { borderBottomColor: colors.border }]}
          onPress={() => openUrl(video.url)}
          activeOpacity={0.7}
        >
          <Image source={{ uri: video.thumbnailUrl }} style={[styles.thumbnail, { borderColor: colors.border }]} contentFit="cover" />
          <View style={styles.videoText}>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
              {video.title}
            </Text>
            <Text style={[styles.meta, { color: colors.textTertiary }]} numberOfLines={1}>
              {video.channelTitle} · {video.length} · {video.published}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{formatSceneLine(video)}</Text>
          </View>
        </TouchableOpacity>
      ))}
      {youtube.dropped.length > 0 && (
        <TouchableOpacity onPress={() => setShowDropped((value) => !value)} activeOpacity={0.7}>
          <Text style={[styles.note, { color: colors.textTertiary }]}>
            {showDropped ? '▾' : '▸'} 뺀 영상 {youtube.dropped.length}개
          </Text>
        </TouchableOpacity>
      )}
      {showDropped &&
        youtube.dropped.map((video) => (
          <Text key={video.id} style={[styles.dropped, { color: colors.textTertiary }]}>
            {video.title} · {video.reasons.join(', ')}
          </Text>
        ))}
      {youtubeNote && <Text style={[styles.note, { color: colors.textTertiary }]}>{youtubeNote}</Text>}
      <TouchableOpacity onPress={() => openUrl(youtube.searchUrl)} activeOpacity={0.7}>
        <Text style={[styles.searchLink, { color: colors.textAccent }]}>유튜브에서 직접 보기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  idle: {
    paddingHorizontal: 4,
    paddingTop: 8,
    gap: 6,
  },
  loadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  loadButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  panel: {
    marginTop: 10,
    paddingTop: 10,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionGap: {
    marginTop: 16,
  },
  item: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  meta: {
    fontSize: 11,
    marginTop: 2,
  },
  excerpt: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  chip: {
    fontSize: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  videoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  thumbnail: {
    width: 96,
    height: 54,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  videoText: {
    flex: 1,
  },
  note: {
    fontSize: 11,
    marginTop: 6,
  },
  dropped: {
    fontSize: 11,
    marginTop: 4,
    paddingLeft: 12,
  },
  searchLink: {
    fontSize: 12,
    marginTop: 8,
  },
});
