import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Alert,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { analyzeImage, AnalysisResult, PlaceInfo } from '@/services/ai-analyzer';
import { getMapLinks, openMap, openUrl } from '@/services/map-linker';
import { useCaptures } from '@/contexts/CapturesContext';
import { deleteImageFromStorage, supabase, uploadImageToStorage } from '@/services/supabase';
import {
  ANALYZE_IMAGE_URI_MISSING_ERROR,
  getAnalyzeImageUriState,
} from '@/services/analyze-input';
import {
  CaptureSaveLimitError,
  saveAnalyzedCapture,
} from '@/services/analyze-save-flow';
import { MAX_FREE_CAPTURES, countUserCaptures, type MapProvider } from '@scrave/shared';

type AnalyzeStatus = 'analyzing' | 'done' | 'error';
type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

function getProviderColor(provider: MapProvider, colors: typeof Colors.dark): string {
  switch (provider) {
    case 'tmap':
      return colors.error;
    case 'naver':
      return colors.placeAccent;
    case 'google':
      return colors.textAccent;
    case 'kakao':
      return colors.warning;
  }
}

export default function AnalyzeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { imageUri: imageUriParam } = useLocalSearchParams<{ imageUri?: string | string[] }>();
  const imageUriState = getAnalyzeImageUriState(imageUriParam);
  const imageUri = imageUriState.imageUri;
  const { captures, refresh, saveCapture } = useCaptures();

  const [status, setStatus] = useState<AnalyzeStatus>('analyzing');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  const isAnalyzing = useRef(false);
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for loading
  useEffect(() => {
    if (status === 'analyzing') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [status]);

  // Fade in result
  useEffect(() => {
    if (status === 'done') {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [status]);

  // Auto-analyze on mount
  useEffect(() => {
    runAnalysis();
  }, [imageUri]);

  const runUpload = async (): Promise<string | null> => {
    if (!imageUri) {
      setUploadStatus('error');
      setUploadError(ANALYZE_IMAGE_URI_MISSING_ERROR);
      return null;
    }
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      setUploadStatus('error');
      setUploadError('로그인이 필요합니다.');
      return null;
    }
    setUploadStatus('uploading');
    setUploadError('');
    try {
      const path = await uploadImageToStorage(imageUri, userId);
      setStoragePath(path);
      setUploadStatus('done');
      return path;
    } catch (e) {
      setUploadStatus('error');
      setUploadError(e instanceof Error ? e.message : '이미지 업로드 실패');
      return null;
    }
  };

  const runAnalysis = async () => {
    if (isAnalyzing.current) return;
    if (!imageUri) {
      setErrorMessage(imageUriState.error ?? ANALYZE_IMAGE_URI_MISSING_ERROR);
      setStatus('error');
      return;
    }

    isAnalyzing.current = true;
    setStatus('analyzing');
    try {
      const getToken = async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? null;
      };
      const analysisResult = await analyzeImage(imageUri!, getToken);
      setResult(analysisResult);
      setStatus('done');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.');
      setStatus('error');
    } finally {
      isAnalyzing.current = false;
    }
  };

  const handleSave = async () => {
    if (!result) return;

    setIsSaving(true);
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        Alert.alert('로그인 필요', '캡처를 저장하려면 로그인해주세요.');
        return;
      }

      const saved = await saveAnalyzedCapture({
        result,
        imageUri,
        userId,
        localCaptureCount: captures.length,
        maxCaptures: MAX_FREE_CAPTURES,
        existingStoragePath: storagePath,
        uploadStatus,
        countServerCaptures: (accountId) => countUserCaptures(supabase, accountId),
        uploadImage: runUpload,
        saveCapture,
        deleteUploadedImage: deleteImageFromStorage,
      });
      if (!saved.saved) return;

      await refresh();
      router.back();
    } catch (error) {
      if (error instanceof CaptureSaveLimitError) {
        Alert.alert('저장 한도 도달', `무료 플랜은 최대 ${MAX_FREE_CAPTURES}개까지 저장할 수 있습니다.`);
        return;
      }
      Alert.alert('저장 실패', '캡처를 저장하는 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const isPlace = result?.category === 'place';
  const accentColor = isPlace ? colors.placeAccent : colors.textAccent;
  const surfaceColor = isPlace ? colors.placeSurface : colors.textSurface;
  const borderColor = isPlace ? colors.placeBorder : colors.textBorder;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>
          {status === 'analyzing' ? 'AI 분석 중...' : status === 'done' ? '분석 완료' : '분석 오류'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.imageMissing, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="image-outline" size={36} color={colors.textTertiary} />
            </View>
          )}
          {status === 'analyzing' && imageUri && (
            <Animated.View style={[styles.imageOverlay, { opacity: pulseAnim }]}>
              <View style={[styles.scanLine, { backgroundColor: colors.primary }]} />
            </Animated.View>
          )}
        </View>

        {/* Analyzing State */}
        {status === 'analyzing' && (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingTitle, { color: colors.text }]}>
              AI가 이미지를 분석하고 있습니다
            </Text>
            <Text style={[styles.loadingSubtitle, { color: colors.textSecondary }]}>
              텍스트 추출, 카테고리 분류, 링크 생성 중...
            </Text>
          </View>
        )}

        {/* Error State */}
        {status === 'error' && (
          <View style={styles.errorSection}>
            <View style={[styles.errorIcon, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
              <Ionicons name="warning" size={32} color={colors.error} />
            </View>
            <Text style={[styles.errorTitle, { color: colors.text }]}>분석 실패</Text>
            <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
              {errorMessage}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={runAnalysis}
            >
              <Ionicons name="refresh" size={18} color="#FFF" />
              <Text style={styles.retryText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Result */}
        {status === 'done' && result && (
          <Animated.View style={[styles.resultSection, { opacity: fadeAnim }]}>
            {/* Category Badge */}
            <View style={[styles.categoryRow, { backgroundColor: surfaceColor, borderColor }]}>
              <Ionicons
                name={isPlace ? 'location' : 'document-text'}
                size={20}
                color={accentColor}
              />
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryLabel, { color: accentColor }]}>
                  {isPlace ? `장소 ${result.places.length}개` : '텍스트 정보'}
                </Text>
                {result.source !== 'other' && (
                  <Text style={[styles.sourceLabel, { color: colors.textTertiary }]}>
                    출처: {result.source}
                  </Text>
                )}
              </View>
            </View>

            {/* Title & Summary */}
            <Text style={[styles.resultTitle, { color: colors.text }]}>{result.title}</Text>
            {result.summary && (
              <Text style={[styles.resultSummary, { color: colors.textSecondary }]}>
                {result.summary}
              </Text>
            )}

            {/* Places */}
            {isPlace && result.places.length > 0 && result.places.map((place: PlaceInfo, idx: number) => (
              <View key={idx} style={[styles.placeCard, { backgroundColor: surfaceColor, borderColor }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <View style={[styles.placeIndex, { backgroundColor: accentColor }]}>
                    <Text style={styles.placeIndexText}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.placeValue, { color: colors.text, flex: 1 }]}>{place.name}</Text>
                </View>
                {place.address && (
                  <Text style={[styles.placeLabel, { color: colors.textSecondary, marginLeft: 32 }]}>
                    {place.address}
                  </Text>
                )}
                {place.date && (
                  <Text style={[styles.placeLabel, { color: colors.textTertiary, marginLeft: 32, marginTop: 2 }]}>
                    {place.date}
                  </Text>
                )}
                {/* Map Buttons */}
                <View style={[styles.mapButtons, { marginLeft: 32 }]}>
                  {getMapLinks(place.name, place.address).map((link) => (
                    <TouchableOpacity
                      key={link.provider}
                      style={[styles.mapBtn, { borderColor }]}
                      onPress={() => openMap(link.provider, place.name, place.address)}
                    >
                      <View
                        style={[
                          styles.providerDot,
                          { backgroundColor: getProviderColor(link.provider, colors) },
                        ]}
                      />
                      <Text style={[styles.mapLabel, { color: colors.text }]}>{link.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {/* Extracted Text */}
            {result.extractedText && (
              <View style={[styles.textCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  추출된 텍스트
                </Text>
                <Text style={[styles.extractedText, { color: colors.text }]}>
                  {result.extractedText}
                </Text>
              </View>
            )}

            {/* Links */}
            {result.links.length > 0 && (
              <View style={styles.linksSection}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  관련 링크
                </Text>
                {result.links.map((link, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.linkBtn, { backgroundColor: surfaceColor, borderColor }]}
                    onPress={() => openUrl(link)}
                  >
                    <Ionicons name="link" size={16} color={accentColor} />
                    <Text style={[styles.linkText, { color: accentColor }]} numberOfLines={1}>
                      {link}
                    </Text>
                    <Ionicons name="open-outline" size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Tags */}
            {result.tags.length > 0 && (
              <View style={styles.tagsSection}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>태그</Text>
                <View style={styles.tagsRow}>
                  {result.tags.map((tag, index) => (
                    <View key={index} style={[styles.tag, { backgroundColor: colors.surfaceElevated }]}>
                      <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Upload status / Save Button */}
            {uploadStatus === 'uploading' && (
              <View style={[styles.uploadIndicator, { borderColor }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.uploadText, { color: colors.textSecondary }]}>이미지 업로드 중...</Text>
              </View>
            )}

            {uploadStatus === 'error' && (
              <View style={[styles.uploadIndicator, { borderColor: colors.error }]}>
                <Text style={[styles.uploadText, { color: colors.error }]}>{uploadError}</Text>
                <TouchableOpacity onPress={runUpload} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
                  <Ionicons name="refresh" size={16} color="#FFF" />
                  <Text style={styles.retryText}>다시 업로드</Text>
                </TouchableOpacity>
              </View>
            )}

            {(uploadStatus === 'idle' || uploadStatus === 'done') && (
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                    <Text style={styles.saveText}>저장하기</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
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
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 280,
  },
  imageMissing: {
    width: '100%',
    height: 280,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
  },
  scanLine: {
    width: '80%',
    height: 3,
    borderRadius: 2,
    opacity: 0.8,
  },
  loadingSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
  },
  loadingSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  errorMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 6,
  },
  retryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  resultSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  sourceLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 30,
  },
  resultSummary: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  placeCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  placeIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  placeIndexText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#050508',
  },
  placeLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  placeValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  mapButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    flex: 1,
  },
  providerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mapLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  textCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  extractedText: {
    fontSize: 14,
    lineHeight: 22,
  },
  linksSection: {
    marginTop: 16,
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
  tagsSection: {
    marginTop: 16,
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 24,
    gap: 8,
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  uploadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 16,
  },
  uploadText: {
    fontSize: 14,
    flex: 1,
  },
});
