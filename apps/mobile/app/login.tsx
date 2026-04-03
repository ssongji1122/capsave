import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function LoginScreen() {
  const { signInWithGoogle, devSkipLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.primary }]}>Scrave</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>AI 캡처 오거나이저</Text>

        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: colors.text }]}
          onPress={handleGoogle}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.googleButtonText, { color: colors.background }]}>Google로 시작하기</Text>
          )}
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity
            style={[styles.devSkipButton, { borderColor: colors.border }]}
            onPress={devSkipLogin}
            activeOpacity={0.8}
          >
            <Text style={[styles.devSkipText, { color: colors.textTertiary }]}>[DEV] 로그인 건너뛰기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 48,
  },
  googleButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  devSkipButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  devSkipText: {
    fontSize: 13,
  },
});
