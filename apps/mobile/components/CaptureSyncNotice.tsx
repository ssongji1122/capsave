import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Text } from '@/components/ScraveText';

interface CaptureSyncNoticeProps {
  message: string | null;
  onRetry: () => void;
  retrying: boolean;
}

export function CaptureSyncNotice({
  message,
  onRetry,
  retrying,
}: CaptureSyncNoticeProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (!message) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.container, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
    >
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="보관함 다시 불러오기"
        accessibilityState={{ disabled: retrying }}
        disabled={retrying}
        onPress={onRetry}
        style={[styles.retryButton, { borderColor: colors.primary }]}
      >
        <Text style={[styles.retryText, { color: colors.primary }]}>
          {retrying ? '불러오는 중' : '다시 시도'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 16,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  message: {
    flex: 1,
    fontFamily: 'SUIT-Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: 12,
  },
  retryText: {
    fontFamily: 'SUIT-SemiBold',
    fontSize: 13,
  },
});
