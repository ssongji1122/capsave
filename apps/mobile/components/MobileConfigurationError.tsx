import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { Text } from './ScraveText';
import { Colors } from '@/constants/Colors';
import type { SupabaseConfigurationKey } from '@/services/supabase-config';
import type { GoogleAuthConfigurationKey } from '@/services/google-auth-config';

interface MobileConfigurationErrorProps {
  missingKeys: Array<SupabaseConfigurationKey | GoogleAuthConfigurationKey>;
}

export function MobileConfigurationError({ missingKeys }: MobileConfigurationErrorProps) {
  return (
    <View style={styles.screen} accessibilityRole="alert">
      <StatusBar barStyle="dark-content" backgroundColor={Colors.light.background} />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>SCRAVE SETUP</Text>
        <Text style={styles.title}>앱 설정이 필요합니다</Text>
        <Text style={styles.description}>
          저장소와 계정을 안전하게 연결하려면 아래 환경 설정이 필요합니다.
        </Text>
        <View style={styles.keyPanel}>
          {missingKeys.map((key) => (
            <Text key={key} selectable style={styles.keyName}>{key}</Text>
          ))}
        </View>
        <Text style={styles.help}>설정을 추가한 뒤 앱을 다시 실행해 주세요.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  eyebrow: {
    color: Colors.light.primary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  title: {
    color: Colors.light.text,
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 36,
  },
  description: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 12,
  },
  keyPanel: {
    backgroundColor: Colors.light.surfaceElevated,
    borderColor: Colors.light.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginTop: 24,
    padding: 16,
  },
  keyName: {
    color: Colors.light.text,
    fontFamily: 'SpaceMono',
    fontSize: 12,
    lineHeight: 20,
  },
  help: {
    color: Colors.light.textTertiary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 16,
  },
});
