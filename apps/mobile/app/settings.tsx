import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMapLinks, type MapProvider } from '@scrave/shared';
import { Text } from '@/components/ScraveText';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';

const NAV_OPTIONS = getMapLinks('preview');

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const {
    preferredNavApp,
    isLoading,
    savingProvider,
    error,
    setPreferredNavApp,
    reload,
  } = useUserPreferences();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSelect = async (provider: MapProvider, label: string) => {
    if (provider === preferredNavApp || savingProvider) return;
    setSuccessMessage(null);
    const saved = await setPreferredNavApp(provider);
    if (saved) setSuccessMessage(`기본 지도 앱을 ${label}로 저장했습니다.`);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.heading}>
        <Text style={[styles.title, { color: colors.text }]}>기본 내비게이션 앱</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          장소에서 지도 앱을 열 때 선택한 앱을 목록 맨 위에 표시합니다.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            저장된 설정을 불러오는 중입니다.
          </Text>
        </View>
      ) : (
        <View style={styles.options} accessibilityRole="radiogroup">
          {NAV_OPTIONS.map((option) => {
            const selected = preferredNavApp === option.provider;
            const saving = savingProvider === option.provider;
            const disabled = savingProvider !== null;

            return (
              <TouchableOpacity
                key={option.provider}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ selected, disabled }}
                activeOpacity={0.75}
                disabled={disabled}
                onPress={() => handleSelect(option.provider, option.label)}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.surfaceElevated : colors.surface,
                    opacity: disabled && !saving ? 0.55 : 1,
                  },
                ]}
              >
                <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
                <View style={styles.optionState}>
                  {saving ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                  {selected && !saving ? (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      <Text style={[styles.selectedText, { color: colors.primary }]}>선택됨</Text>
                    </>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {error ? (
        <View
          accessibilityRole="alert"
          style={[styles.messageBox, { borderColor: colors.error }]}
        >
          <Text style={[styles.statusText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="설정 다시 불러오기"
            onPress={() => { void reload(); }}
            style={styles.retryButton}
          >
            <Text style={[styles.retryText, { color: colors.primary }]}>다시 불러오기</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {successMessage ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.successMessage, { color: colors.placeAccent }]}
        >
          {successMessage}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 48 },
  heading: { gap: 8, marginBottom: 24 },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  description: { fontSize: 15, lineHeight: 23 },
  loading: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12 },
  options: { gap: 10 },
  option: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionLabel: { flexShrink: 1, fontSize: 16, lineHeight: 24, fontWeight: '600' },
  optionState: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectedText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  messageBox: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  statusText: { flexShrink: 1, fontSize: 14, lineHeight: 21 },
  retryButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  retryText: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  successMessage: { marginTop: 18, fontSize: 14, lineHeight: 21 },
});
