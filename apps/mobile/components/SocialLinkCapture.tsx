import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from './ScraveText';
import { Colors } from '@/constants/Colors';
import type {
  MobileSocialLinkCapture,
  MobileSocialLinkResult,
  MobileSocialLinkSaveError,
} from '@/services/social-link-intake';

interface SocialLinkCaptureProps {
  inspect: (url: string) => Promise<MobileSocialLinkResult>;
  saveAll: (captures: MobileSocialLinkCapture[], completed: number) => Promise<number>;
}

export function SocialLinkCapture({ inspect, saveAll }: SocialLinkCaptureProps) {
  const colors = Colors.light;
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<MobileSocialLinkResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const captures = result?.captures ?? [];
  const complete = captures.length > 0 && saved === captures.length;

  async function inspectLink() {
    if (!url.trim() || checking || saving) return;
    setChecking(true);
    setError('');
    setMessage('원문과 이미지 묶음을 확인하는 중입니다.');
    setResult(null);
    setSaved(0);
    try {
      const inspected = await inspect(url.trim());
      setResult(inspected);
      setMessage(`원본 ${inspected.captures.length}장을 확인했습니다. 저장 전 내용을 살펴보세요.`);
    } catch (caught) {
      setMessage('');
      setError(caught instanceof Error ? caught.message : '링크를 확인하지 못했습니다.');
    } finally {
      setChecking(false);
    }
  }

  async function save() {
    if (!result || saving || complete) return;
    setSaving(true);
    setError('');
    try {
      const nextSaved = await saveAll(result.captures, saved);
      setSaved(nextSaved);
      setMessage(`원본 ${result.captures.length}장을 보관함에 저장했습니다. 아직 확인 전 자료입니다.`);
    } catch (caught) {
      const progress = typeof (caught as MobileSocialLinkSaveError)?.completed === 'number'
        ? (caught as MobileSocialLinkSaveError).completed
        : saved;
      setSaved(progress);
      setMessage('');
      const prefix = progress > 0 ? `${progress}장은 저장했고 ${result.captures.length - progress}장은 중단되었습니다. ` : '';
      setError(`${prefix}${caught instanceof Error ? caught.message : '저장하지 못했습니다.'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Instagram 게시물 저장</Text>
      <Text style={styles.description}>공개 게시물의 원문과 이미지 묶음을 순서대로 확인한 뒤 보관함에 저장합니다. 첫 분류는 확인 전 상태로 남습니다.</Text>
      <Text style={styles.label}>Instagram 게시물 링크</Text>
      <TextInput
        accessibilityLabel="Instagram 게시물 링크"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://www.instagram.com/p/.../"
        placeholderTextColor={colors.textTertiary}
        value={url}
        editable={!checking && !saving}
        onChangeText={setUrl}
        style={styles.input}
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="링크 확인"
        disabled={!url.trim() || checking || saving}
        onPress={() => void inspectLink()}
        style={[styles.primaryButton, (!url.trim() || checking || saving) && styles.disabled]}
      >
        {checking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>링크 확인</Text>}
      </TouchableOpacity>
      <Text style={styles.help}>현재 공개 게시물과 릴스를 지원합니다. 비공개·삭제된 게시물은 불러올 수 없습니다.</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}

      {result && captures.length > 0 ? (
        <View style={styles.result}>
          <View style={styles.chips}>
            <Text style={styles.statusChip}>수집됨 · 확인 전</Text>
            <Text style={styles.routeChip}>첫 분류 · {captures[0].analysis.tags[2] ?? '일반 참고자료'}</Text>
          </View>
          <Text style={styles.author}>{result.post.author ? `@${result.post.author}` : '작성자 확인 불가'}</Text>
          <Text style={styles.meta}>원본 {captures.length}장 · 출처 링크 1개</Text>
          {result.post.caption ? <Text style={styles.caption}>{result.post.caption}</Text> : null}
          <View style={styles.mediaGrid}>
            {captures.map((capture, index) => (
              <View key={`${capture.imageUrl}-${index}`} style={styles.mediaItem}>
                <Image source={{ uri: capture.imageUrl }} resizeMode="contain" style={styles.image} accessibilityLabel={`${index + 1}번째 Instagram 원본`} />
                <Text style={styles.mediaLabel}>{index + 1} / {captures.length}{capture.selected ? ' · 선택한 이미지' : ''}</Text>
                {capture.imageKind === 'video-preview' ? <Text style={styles.meta}>영상 미리보기</Text> : null}
              </View>
            ))}
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={complete ? '저장 완료' : saved > 0 ? `남은 ${captures.length - saved}장 다시 저장` : `원본 ${captures.length}장 계정에 저장`}
            disabled={saving || complete}
            onPress={() => void save()}
            style={[styles.primaryButton, (saving || complete) && styles.disabled]}
          >
            {saving ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text style={styles.primaryButtonText}>{complete ? '저장 완료' : saved > 0 ? `남은 ${captures.length - saved}장 다시 저장` : `원본 ${captures.length}장 계정에 저장`}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48, backgroundColor: '#FFFFFF' },
  title: { fontFamily: 'SUIT-SemiBold', fontSize: 28, color: '#24354A' },
  description: { marginTop: 10, fontFamily: 'SUIT-Regular', fontSize: 15, lineHeight: 24, color: '#53667D' },
  label: { marginTop: 28, marginBottom: 8, fontFamily: 'SUIT-Medium', fontSize: 14, color: '#24354A' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#DFE6EE', borderRadius: 12, backgroundColor: '#F3F6FA', paddingHorizontal: 14, fontFamily: 'SUIT-Regular', fontSize: 15, color: '#24354A' },
  primaryButton: { minHeight: 48, marginTop: 12, borderRadius: 12, backgroundColor: '#526985', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { fontFamily: 'SUIT-SemiBold', fontSize: 15, color: '#FFFFFF' },
  disabled: { opacity: 0.5 },
  help: { marginTop: 10, fontFamily: 'SUIT-Regular', fontSize: 12, lineHeight: 19, color: '#607187' },
  error: { marginTop: 16, fontFamily: 'SUIT-Medium', fontSize: 14, lineHeight: 21, color: '#A8412C' },
  message: { marginTop: 16, fontFamily: 'SUIT-Regular', fontSize: 14, lineHeight: 21, color: '#24354A' },
  result: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#DFE6EE' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { borderWidth: 1, borderColor: '#BCCAD9', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, fontFamily: 'SUIT-Medium', fontSize: 12, color: '#24354A' },
  routeChip: { borderRadius: 999, backgroundColor: '#F3F6FA', paddingHorizontal: 12, paddingVertical: 7, fontFamily: 'SUIT-Regular', fontSize: 12, color: '#53667D' },
  author: { marginTop: 20, fontFamily: 'SUIT-SemiBold', fontSize: 16, color: '#24354A' },
  meta: { marginTop: 5, fontFamily: 'SUIT-Regular', fontSize: 12, color: '#607187' },
  caption: { marginTop: 14, borderRadius: 12, backgroundColor: '#F3F6FA', padding: 14, fontFamily: 'SUIT-Regular', fontSize: 14, lineHeight: 22, color: '#53667D' },
  mediaGrid: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mediaItem: { width: '47%' },
  image: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#F3F6FA' },
  mediaLabel: { marginTop: 8, fontFamily: 'SUIT-Medium', fontSize: 12, color: '#24354A' },
});
