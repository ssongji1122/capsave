import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

export default function LoginScreen() {
  const { signInWithGoogle, devSkipLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Scrave</Text>
        <Text style={styles.subtitle}>AI 캡처 오거나이저</Text>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogle}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#191919" />
          ) : (
            <Text style={styles.googleButtonText}>Google로 시작하기</Text>
          )}
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity
            style={styles.devSkipButton}
            onPress={devSkipLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.devSkipText}>[DEV] 로그인 건너뛰기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
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
    color: '#F4845F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 48,
  },
  googleButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191919',
  },
  devSkipButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  devSkipText: {
    fontSize: 13,
    color: '#6B7280',
  },
});
