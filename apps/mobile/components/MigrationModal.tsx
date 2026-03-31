import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { supabase } from '@/services/supabase';
import { getAllCaptures, clearAllCaptures, CaptureItem } from '@/services/database';
import { saveCapture as supaSave } from '@scrave/shared';

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

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const captures = await getAllCaptures();
      let done = 0;

      for (const capture of captures) {
        try {
          await supaSave(supabase, {
            category: capture.category,
            title: capture.title,
            summary: capture.summary,
            places: capture.places,
            extractedText: capture.extractedText,
            links: capture.links,
            tags: capture.tags,
            source: capture.source as 'instagram' | 'threads' | 'naver' | 'google' | 'youtube' | 'other',
            confidence: capture.confidence ?? 1.0,
            sourceAccountId: capture.sourceAccountId,
          }, capture.imageUri, userId);
          done++;
          setProgress({ done, total: captures.length });
        } catch {
          // Skip individual failures, continue with rest
        }
      }

      await clearAllCaptures();
      onComplete();
    } catch {
      onComplete(); // Close even on failure
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>기존 캡처 발견</Text>
          <Text style={styles.description}>
            로컬에 저장된 {localCount}개 캡처를 계정에 옮길까요?
          </Text>

          {migrating ? (
            <View style={styles.progressRow}>
              <ActivityIndicator color="#F4845F" />
              <Text style={styles.progressText}>
                {progress.done}/{progress.total} 이전 중...
              </Text>
            </View>
          ) : (
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                <Text style={styles.skipText}>나중에</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.migrateButton} onPress={handleMigrate}>
                <Text style={styles.migrateText}>옮기기</Text>
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
    backgroundColor: '#0D0D12',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#1F1F28',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#9CA3AF',
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
    color: '#9CA3AF',
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
    borderColor: '#1F1F28',
  },
  skipText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  migrateButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F4845F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  migrateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
});
