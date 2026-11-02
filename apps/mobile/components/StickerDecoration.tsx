import React, { useEffect, useRef, useState } from 'react';
import { View, Modal, Pressable, ScrollView, TextInput, Image, PanResponder, StyleSheet, useWindowDimensions, Alert } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { STICKER_CATALOG, MAX_STICKERS, normalizeSticker, parseDecorations, stickerStorageKey, type StickerPlacement } from '@scrave/shared';
import { useAuth } from '@/contexts/AuthContext';
import { Text } from './ScraveText';
import { stickerImages } from '@/assets/stickers';
function Movable({ item, width, selected, onSelect, onMove, onStart, onEnd }: {
    item: StickerPlacement;
    width: number;
    selected: boolean;
    onSelect: () => void;
    onMove: (x: number, y: number) => void;
    onStart: () => void;
    onEnd: () => void;
}) {
    const current = useRef({ item, width, onSelect, onMove, onStart, onEnd });
    current.current = { item, width, onSelect, onMove, onStart, onEnd };
    const origin = useRef(item);
    const responder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => { origin.current = current.current.item; current.current.onSelect(); current.current.onStart(); },
        onPanResponderMove: (_, g) => current.current.onMove(origin.current.x + g.dx / current.current.width, origin.current.y + g.dy / current.current.width),
        onPanResponderRelease: () => current.current.onEnd(),
        onPanResponderTerminate: () => current.current.onEnd(),
    })).current;
    const size = item.size * width;
    return <View {...responder.panHandlers} accessible accessibilityRole="button" accessibilityLabel={STICKER_CATALOG.find(s => s.id === item.stickerId)?.label} accessibilityState={{ selected }} onAccessibilityTap={onSelect} style={{ position: 'absolute', left: item.x * width - size / 2, top: item.y * width - size / 2, width: size, height: size, borderWidth: selected ? 1 : 0, borderColor: '#526985', transform: [{ rotate: item.rotation + 'deg' }] }}><Image source={stickerImages[item.stickerId]} style={{ width: '100%', height: '100%' }} resizeMode="contain"/></View>;
}
export function StickerDecoration({ target, label, preview }: {
    target: string;
    label: string;
    preview?: string;
}) {
    const { user } = useAuth();
    const key = stickerStorageKey(user?.id ?? 'guest', target);
    const [saved, setSaved] = useState<StickerPlacement[]>([]);
    const [draft, setDraft] = useState<StickerPlacement[] | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [history, setHistory] = useState<StickerPlacement[][]>([]);
    const [query, setQuery] = useState('');
    const { width, height } = useWindowDimensions();
    const canvasWidth = Math.min(width - 40, 300);
    const [frame, setFrame] = useState({ width: 0, height: 0 });
    const side = Math.min(frame.width, frame.height);
    const draggingBefore = useRef<StickerPlacement[] | null>(null);
    useEffect(() => { setDraft(null); try {
        setSaved(parseDecorations(Storage.getItemSync(key)));
    }
    catch {
        setSaved([]);
        Alert.alert('꾸미기를 불러오지 못했습니다', '기기의 저장 공간을 확인한 뒤 다시 시도하십시오.');
    } }, [key]);
    function change(next: StickerPlacement[]) { setHistory(h => [...h.slice(-29), draft!]); setDraft(next); }
    function edit(patch: Partial<StickerPlacement>) { change(draft!.map(p => p.id === selected ? normalizeSticker({ ...p, ...patch }) : p)); }
    const active = draft?.find(p => p.id === selected);
    const button = (text: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={action} style={[styles.button, disabled && { opacity: .4 }]}><Text style={styles.buttonText}>{text}</Text></Pressable>;
    return <>
  <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 2 }]} onLayout={e => setFrame(e.nativeEvent.layout)}>
   {saved.map(p => <Image key={p.id} source={stickerImages[p.stickerId]} resizeMode="contain" style={{ position: 'absolute', left: (frame.width - side) / 2 + p.x * side - p.size * side / 2, top: (frame.height - side) / 2 + p.y * side - p.size * side / 2, width: p.size * side, height: p.size * side, transform: [{ rotate: p.rotation + 'deg' }] }}/>)}
  </View>
  <Pressable accessibilityRole="button" accessibilityLabel={label + ' 스티커 꾸미기'} onPress={e => { e.stopPropagation(); setDraft([...saved]); setHistory([]); setSelected(null); setQuery(''); }} style={styles.trigger}><Text style={styles.buttonText}>꾸미기</Text></Pressable>
  <Modal visible={draft !== null} animationType="fade" onRequestClose={() => setDraft(null)}>
   <ScrollView style={styles.modal} contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 50 }}>
    <View style={styles.row}><Text style={styles.title}>{label} 꾸미기</Text>{button('취소', () => setDraft(null))}{button('저장', () => { try {
        Storage.setItemSync(key, JSON.stringify(draft));
        setSaved(draft!);
        setDraft(null);
    }
    catch {
        Alert.alert('저장하지 못했습니다', '기기의 저장 공간을 확인한 뒤 다시 시도하십시오.');
    } })}</View>
    <Text style={styles.hint}>스티커를 골라 끌어서 옮깁니다. 이 기기에만 저장합니다.</Text>
    <View style={[styles.canvas, { width: canvasWidth, height: canvasWidth }]}>
     {preview ? <Image source={{ uri: preview }} resizeMode="contain" style={StyleSheet.absoluteFill}/> : <View style={{ padding: 30, paddingTop: 70 }}><Text style={styles.buttonText}>scrave</Text><Text style={styles.title}>my craves</Text></View>}
     {draft?.map(p => <Movable key={p.id} item={p} width={canvasWidth} selected={p.id === selected} onSelect={() => setSelected(p.id)} onStart={() => { draggingBefore.current = draft; }} onEnd={() => { const previous = draggingBefore.current; draggingBefore.current = null; if (previous)
        setHistory(h => [...h.slice(-29), previous]); }} onMove={(x, y) => setDraft(items => items!.map(v => v.id === p.id ? normalizeSticker({ ...v, x, y }) : v))}/>)}
    </View>
    <View style={styles.row}>{button('되돌리기', () => { setDraft(history[history.length - 1]); setHistory(h => h.slice(0, -1)); setSelected(null); }, !history.length)}{button('선택 삭제', () => { change(draft!.filter(p => p.id !== selected)); setSelected(null); }, !active)}<Text>{draft?.length ?? 0}/{MAX_STICKERS}</Text></View>
    <View style={styles.row}>{button('작게', () => edit({ size: active!.size - .03 }), !active)}{button('크게', () => edit({ size: active!.size + .03 }), !active)}{button('왼쪽 회전', () => edit({ rotation: active!.rotation - 5 }), !active)}{button('오른쪽 회전', () => edit({ rotation: active!.rotation + 5 }), !active)}</View>
    <View style={styles.row}>{button('왼쪽', () => edit({ x: active!.x - .04 }), !active)}{button('오른쪽', () => edit({ x: active!.x + .04 }), !active)}{button('위로', () => edit({ y: active!.y - .04 }), !active)}{button('아래로', () => edit({ y: active!.y + .04 }), !active)}</View>
    <Text accessibilityLiveRegion="polite" style={{ color: '#53667D', minHeight: 20 }}>{active ? STICKER_CATALOG.find(s => s.id === active.stickerId)?.label : ''}</Text>
    <TextInput accessibilityLabel="스티커 검색" placeholder="커피, 단풍, 공부…" value={query} onChangeText={setQuery} style={styles.search}/>
    <ScrollView nestedScrollEnabled style={{ maxHeight: Math.max(160, height * .25) }}><View style={styles.grid}>
     {STICKER_CATALOG.filter(s => (s.label + ' ' + s.subject).toLowerCase().includes(query.toLowerCase())).map(s => <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={s.label + ' 붙이기'} disabled={(draft?.length ?? 0) >= MAX_STICKERS} style={styles.choice} onPress={() => { const id = Date.now().toString(36) + Math.random().toString(36).slice(2); change([...draft!, { id, stickerId: s.id, x: .5, y: .5, size: .25, rotation: 0 }]); setSelected(id); }}><Image source={stickerImages[s.id]} style={{ width: 64, height: 64 }} resizeMode="contain"/></Pressable>)}
    </View></ScrollView>
   </ScrollView>
  </Modal>
 </>;
}
const styles = StyleSheet.create({
    trigger: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderColor: '#DFE6EE', borderWidth: 1, borderRadius: 22, minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, zIndex: 3 },
    modal: { flex: 1, backgroundColor: '#fff' }, row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
    title: { fontSize: 20, color: '#24354A', fontFamily: 'SUIT-SemiBold', flexShrink: 1 }, hint: { fontSize: 13, color: '#53667D', marginVertical: 10 },
    button: { minHeight: 44, padding: 10, borderWidth: 1, borderColor: '#DFE6EE', borderRadius: 12, justifyContent: 'center' }, buttonText: { color: '#526985', fontSize: 13 },
    canvas: { alignSelf: 'center', position: 'relative', backgroundColor: '#F3F6FA', overflow: 'hidden', borderRadius: 16 },
    search: { minHeight: 44, borderWidth: 1, borderColor: '#BCCAD9', borderRadius: 12, padding: 10, marginVertical: 10, fontFamily: 'SUIT-Regular' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' }, choice: { width: '25%', alignItems: 'center', paddingVertical: 8 },
});
