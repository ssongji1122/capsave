import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Alert,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { analyzeImage, AnalysisResult } from '@/services/ai-analyzer';
import { saveCapture } from '@/services/database';
import { getMapLinks, openMap, openUrl } from '@/services/map-linker';

type AnalyzeStatus = 'analyzing' | 'done' | 'error';

export default function AnalyzeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { imageUri } = useLocalSearchParams<{ imageUri: string }>();

  const [status, setStatus] = useState<AnalyzeStatus>('analyzing');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
    if (imageUri) {
      runAnalysis();
    }
  }, [imageUri]);

  const runAnalysis = async () => {
    setStatus('analyzing');
    try {
      const analysisResult = await analyzeImage(imageUri!);
      setResult(analysisResult);
      setStatus('done');
    } catch (error: any) {
      setErrorMessage(error.message || '분석 중 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  const handleSave = async () => {
    if (!result || !imageUri) return;

    setIsSaving(true);
    try {
      await saveCapture(result, imageUri);
      router.back();
    } catch (error) {
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
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          {status === 'analyzing' && (
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
                  {isPlace ? '📍 장소 정보' : '📝 텍스트 정보'}
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

            {/* Place Info */}
            {isPlace && result.placeName && (
              <View style={[styles.placeCard, { backgroundColor: surfaceColor, borderColor }]}>
                <Text style={[styles.placeLabel, { color: colors.textSecondary }]}>장소명</Text>
                <Text style={[styles.placeValue, { color: colors.text }]}>{result.placeName}</Text>
                {result.address && (
                  <>
                    <Text style={[styles.placeLabel, { color: colors.textSecondary, marginTop: 10 }]}>
                      주소
                    </Text>
                    <Text style={[styles.placeValue, { color: colors.text }]}>{result.address}</Text>
                  </>
                )}
                {/* Map Buttons */}
                <View style={styles.mapButtons}>
                  {getMapLinks(result.placeName, result.address).map((link) => (
                    <TouchableOpacity
                      key={link.provider}
                      style={[styles.mapBtn, { borderColor }]}
                      onPress={() => openMap(link.provider, result.placeName!, result.address)}
                    >
                      <Text style={styles.mapEmoji}>{link.emoji}</Text>
                      <Text style={[styles.mapLabel, { color: colors.text }]}>{link.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

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

            {/* Save Button */}
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
  placeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
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
  mapEmoji: {
    fontSize: 16,
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
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
