import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { deleteImageFromStorage, supabase, uploadImageToStorage } from '@/services/supabase';
import { getAllCaptures, replaceAllCaptures } from '@/services/database';
import { saveCapture as supaSave } from '@scrave/shared';
import { migrateLocalCapturesToAccount } from '@/services/local-migration';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';

interface Props {
  visible: boolean;
  userId: string;
  localCount: number;
  onComplete: () => void;
  onSkip: () => void;
}

export function MigrationModal({ visible, userId, localCount, onComplete, onSkip }: Props) {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: localCount });
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      await migrateLocalCapturesToAccount({
        userId,
        getLocalCaptures: getAllCaptures,
        uploadLocalImage: uploadImageToStorage,
        saveRemoteCapture: (analysis, imageUri, accountId) => supaSave(supabase, analysis, imageUri, accountId),
        deleteUploadedImage: deleteImageFromStorage,
        replaceLocalCaptures: replaceAllCaptures,
        onProgress: ({ done, total }) => setProgress({ done, total }),
      });
      onComplete();
    } catch {
      onComplete();
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>기존 캡처 발견</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            로컬에 저장된 {localCount}개 캡처를 계정에 옮길까요?
          </Text>

          {migrating ? (
            <View style={styles.progressRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {progress.done}/{progress.total} 이전 중...
              </Text>
            </View>
          ) : (
            <View style={styles.buttons}>
              <TouchableOpacity style={[styles.skipButton, { borderColor: colors.border }]} onPress={onSkip}>
                <Text style={[styles.skipText, { color: colors.textSecondary }]}>나중에</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.migrateButton, { backgroundColor: colors.primary }]} onPress={handleMigrate}>
                <Text style={[styles.migrateText, { color: colors.background }]}>옮기기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  progressText: {
    fontSize: 14,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  skipText: {
    fontSize: 15,
  },
  migrateButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  migrateText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
