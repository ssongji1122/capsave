import React, { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, Clipboard, Linking } from 'react-native';
import { Text } from './ScraveText';
import { Colors } from '@/constants/Colors';
import { openUrl } from '@/services/map-linker';
import { extractCaptureActions, type ActionableCaptureInput, type CaptureActionItem } from '../../../packages/shared/src/utils/capture-actions';
import {
  CAPTURE_REASONS, CAPTURE_REVISIT_OPTIONS, NOTE_MAX_LENGTH, getRevisitDate,
  toggleCompletedAction, type CaptureUserMeta, type CaptureReasonId, type CaptureRevisitContext,
} from '../../../packages/shared/src/utils/capture-intent';

type Change = (current: CaptureUserMeta) => CaptureUserMeta;
interface Props {
  capture: ActionableCaptureInput;
  meta: CaptureUserMeta;
  ready: boolean;
  onUpdate: (change: Change) => Promise<void>;
}
const colors = Colors.light;

export function CaptureWorkflow({ capture, meta, ready, onUpdate }: Props) {
  const [note, setNote] = useState(meta.note);
  const [reasons, setReasons] = useState<readonly CaptureReasonId[]>(meta.reasons);
  const [revisit, setRevisit] = useState<CaptureRevisitContext>(meta.revisit);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const savedReasons = meta.reasons.join(',');
  useEffect(() => setNote(meta.note), [meta.note]);
  useEffect(() => setRevisit(meta.revisit), [meta.revisit]);
  useEffect(() => setReasons(savedReasons ? savedReasons.split(',') as CaptureReasonId[] : []), [savedReasons]);
  const commit = async (change: Change, message: string) => {
    setBusy(true);
    setStatus('');
    try { await onUpdate(change); setStatus(message); }
    catch { Alert.alert('저장 실패', '변경 내용을 저장하지 못했습니다. 다시 시도해 주십시오.'); }
    finally {setBusy(false);}
  };
  const execute = async (action: CaptureActionItem) => {
    try {
      if (action.kind === 'phone' && action.href) await Linking.openURL(action.href);
      else if (action.href) await openUrl(action.href);
      else {Clipboard.setString(action.value);setStatus('내용을 복사했습니다.');}
    } catch { Alert.alert('실행 실패', '연결할 앱을 열지 못했습니다.'); }
  };
  const disabled = !ready || busy;
  const actions = extractCaptureActions(capture);
  return <View style={styles.section}>
    {actions.length > 0 && <>
      <Text style={styles.heading}>캡처에서 할 일</Text>
      {actions.map(action => {
        const done = meta.completedActions.includes(action.id);
        return <View key={action.id} style={styles.action}>
          <Text style={styles.label}>{action.label}</Text>
          <Text selectable style={styles.secondary}>{action.value}</Text>
          <View style={styles.row}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${action.kind === 'link' ? '원문 링크' : action.label} ${action.href ? '열기' : '복사'}`} onPress={() => execute(action)} style={styles.button}>
              <Text style={styles.buttonText}>{action.href ? '열기' : '복사'}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${action.label} ${done ? '처리 전으로 되돌리기' : '처리 완료 표시'}`} accessibilityState={{selected:done,disabled}} disabled={disabled}
              onPress={() => commit(current => toggleCompletedAction(current,action.id), done ? '처리 전으로 바꿨습니다.' : '처리 완료로 표시했습니다.')} style={[styles.button,done && styles.selected]}>
              <Text style={styles.buttonText}>{done ? '완료됨 · 되돌리기' : '처리 완료 표시'}</Text>
            </TouchableOpacity>
          </View>
        </View>;
      })}
      <Text style={styles.secondary}>열기와 복사는 완료 표시를 바꾸지 않습니다.</Text>
    </>}
    <Text style={styles.heading}>저장 이유와 메모</Text>
    <Text style={styles.secondary}>필요할 때만 남깁니다. 이 기기의 현재 계정에 보관합니다.</Text>
    <View style={styles.row}>
      {CAPTURE_REASONS.map(reason => <TouchableOpacity key={reason.id} accessibilityRole="button" accessibilityLabel={reason.label} accessibilityState={{selected:reasons.includes(reason.id),disabled}} disabled={disabled}
        style={[styles.button,reasons.includes(reason.id) && styles.selected]}
        onPress={() => setReasons(current=>current.includes(reason.id) ? current.filter(id=>id!==reason.id) : [...current,reason.id])}>
        <Text style={styles.buttonText}>{reason.label}</Text>
      </TouchableOpacity>)}
    </View>
    <TextInput accessibilityLabel="캡처 메모" placeholder="다시 볼 때 기억할 내용을 적습니다" placeholderTextColor={colors.textTertiary} value={note} onChangeText={setNote} multiline maxLength={NOTE_MAX_LENGTH} editable={!disabled} style={styles.input} />
    <Text style={styles.label}>다시 볼 때</Text>
    <View style={styles.row}>
      {CAPTURE_REVISIT_OPTIONS.map(option=><TouchableOpacity key={option.id} accessibilityRole="button" accessibilityLabel={option.label} accessibilityState={{selected:revisit===option.id,disabled}} disabled={disabled} onPress={()=>setRevisit(option.id)} style={[styles.button,revisit===option.id && styles.selected]}><Text style={styles.buttonText}>{option.label}</Text></TouchableOpacity>)}
    </View>
    <Text style={styles.secondary}>다시 보기 목록에서 찾을 수 있으며 알림을 보내지는 않습니다.</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="저장 이유와 메모 저장" disabled={disabled} accessibilityState={{disabled}} style={[styles.button,styles.selected]} onPress={()=>commit(current=>({...current,note,reasons,revisit,revisitOn:getRevisitDate(revisit,new Date()),updatedAt:new Date().toISOString()}),'저장 이유와 메모를 보관했습니다.')}><Text style={styles.buttonText}>{busy ? '저장하고 있습니다' : '메모 저장'}</Text></TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="여행·예약 묶음 고정" disabled={disabled} accessibilityState={{selected:meta.pinnedToTravelPack,disabled}} style={styles.button}
      onPress={()=>commit(current=>({...current,pinnedToTravelPack:!current.pinnedToTravelPack}),'여행·예약 묶음을 바꿨습니다.')}><Text style={styles.buttonText}>{meta.pinnedToTravelPack ? '여행·예약 고정 해제' : '여행·예약 묶음에 고정'}</Text></TouchableOpacity>
    {status ? <Text accessibilityLiveRegion="polite" style={styles.secondary}>{status}</Text> : null}
  </View>;
}
const styles=StyleSheet.create({
  section:{gap:12,paddingVertical:24,borderTopWidth:1,borderColor:colors.border,marginTop:24},
  heading:{fontSize:17,fontFamily:'SUIT-SemiBold',color:colors.text,marginTop:8},
  label:{fontSize:15,fontFamily:'SUIT-Medium',color:colors.text},
  secondary:{fontSize:13,lineHeight:20,color:colors.textSecondary},
  action:{padding:14,gap:8,backgroundColor:colors.surfaceElevated,borderRadius:14},
  row:{flexDirection:'row',flexWrap:'wrap',gap:8},
  button:{minHeight:44,justifyContent:'center',paddingVertical:10,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:colors.border},
  buttonText:{fontSize:13,color:colors.text,fontFamily:'SUIT-Medium'},
  selected:{backgroundColor:colors.surfaceElevated,borderColor:colors.primary},
  input:{fontFamily:'SUIT-Regular',fontSize:15,lineHeight:22,minHeight:100,textAlignVertical:'top',padding:14,borderRadius:12,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,color:colors.text},
});
