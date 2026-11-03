import React from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  addAnalysisPlace,
  removeAnalysisPlace,
  updateAnalysisCategory,
  updateAnalysisPlace,
  type AnalysisDraftError,
} from '@scrave/shared';
import { Text } from './ScraveText';
import { useColorScheme } from './useColorScheme';
import { Colors } from '@/constants/Colors';
import type { AnalysisResult } from '@/services/ai-analyzer';

interface AnalysisResultEditorProps {
  value: AnalysisResult;
  onChange: (value: AnalysisResult) => void;
  error: string | AnalysisDraftError | null;
}

export function AnalysisResultEditor({ value, onChange, error }: AnalysisResultEditorProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const errorMessage = typeof error === 'string' ? error : error?.message ?? null;

  return (
    <View style={styles.editor} accessibilityLabel="분석 내용 수정">
      <Text style={[styles.label, { color: colors.text }]}>분류</Text>
      <View style={styles.radioGroup} accessibilityRole="radiogroup">
        {([
          ['place', '장소'],
          ['text', '텍스트'],
        ] as const).map(([category, label]) => {
          const selected = value.category === category;
          return (
            <TouchableOpacity
              key={category}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              onPress={() => onChange(updateAnalysisCategory(value, category))}
              style={[
                styles.radio,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.surfaceElevated : colors.surface,
                },
              ]}
            >
              <Text style={[styles.radioText, { color: selected ? colors.primary : colors.textSecondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Field label="제목" colors={colors}>
        <TextInput
          accessibilityLabel="제목"
          value={value.title}
          onChangeText={(title) => onChange({ ...value, title })}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholderTextColor={colors.textTertiary}
        />
      </Field>

      <Field label="요약" colors={colors}>
        <TextInput
          accessibilityLabel="요약"
          value={value.summary}
          onChangeText={(summary) => onChange({ ...value, summary })}
          multiline
          style={[styles.input, styles.multiline, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholderTextColor={colors.textTertiary}
        />
      </Field>

      <Field label="추출한 글" colors={colors}>
        <TextInput
          accessibilityLabel="추출한 글"
          value={value.extractedText}
          onChangeText={(extractedText) => onChange({ ...value, extractedText })}
          multiline
          style={[styles.input, styles.extractedText, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholderTextColor={colors.textTertiary}
        />
      </Field>

      {value.category === 'place' ? (
        <View style={styles.places}>
          <Text style={[styles.label, { color: colors.text }]}>장소</Text>
          {value.places.map((place, index) => (
            <View
              key={index}
              style={[styles.placeCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <View style={styles.placeHeader}>
                <Text style={[styles.placeTitle, { color: colors.text }]}>장소 {index + 1}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`장소 ${index + 1} 삭제`}
                  onPress={() => onChange(removeAnalysisPlace(value, index))}
                  style={styles.deleteButton}
                >
                  <Text style={[styles.deleteText, { color: colors.error }]}>삭제</Text>
                </TouchableOpacity>
              </View>
              {(['name', 'address', 'date'] as const).map((field) => {
                const label = field === 'name' ? '장소 이름' : field === 'address' ? '주소' : '날짜';
                return (
                  <Field key={field} label={label} colors={colors} compact>
                    <TextInput
                      accessibilityLabel={`장소 ${index + 1} ${label}`}
                      value={place[field] ?? ''}
                      onChangeText={(text) => onChange(updateAnalysisPlace(value, index, field, text))}
                      style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                      placeholderTextColor={colors.textTertiary}
                    />
                  </Field>
                );
              })}
            </View>
          ))}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="장소 추가"
            onPress={() => onChange(addAnalysisPlace(value))}
            style={[styles.addButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.addText, { color: colors.primary }]}>장소 추가</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {errorMessage ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: colors.error, borderColor: colors.error }]}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

function Field({
  label,
  colors,
  compact = false,
  children,
}: {
  label: string;
  colors: typeof Colors.light;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={compact ? styles.compactField : styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: 16 },
  label: { fontSize: 15, lineHeight: 22, fontFamily: 'SUIT-SemiBold' },
  radioGroup: { flexDirection: 'row', gap: 8 },
  radio: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  radioText: { fontSize: 14, lineHeight: 21, fontFamily: 'SUIT-SemiBold' },
  field: { gap: 7 },
  compactField: { gap: 5 },
  fieldLabel: { fontSize: 13, lineHeight: 19, fontFamily: 'SUIT-Medium' },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'SUIT-Regular',
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  extractedText: { minHeight: 132, textAlignVertical: 'top', fontFamily: 'SpaceMono' },
  places: { gap: 12 },
  placeCard: { gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  placeHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  placeTitle: { fontSize: 14, lineHeight: 21, fontFamily: 'SUIT-SemiBold' },
  deleteButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: 13, lineHeight: 19, fontFamily: 'SUIT-SemiBold' },
  addButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  addText: { fontSize: 14, lineHeight: 21, fontFamily: 'SUIT-SemiBold' },
  error: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, lineHeight: 21 },
});
