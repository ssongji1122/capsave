import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { buildArchiveLinks, buildSourceQuery, safeArchiveUrl, type ArchiveCapture } from '@scrave/shared';
import { supabase } from '@/services/supabase';
import { openUrl } from '@/services/map-linker';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
export function ArchiveSources({ capture }: { capture: ArchiveCapture }) {
  const colors = Colors[useColorScheme() ?? 'dark'];
  const query = buildSourceQuery(capture);
  const [status, setStatus] = useState('');
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setSources([]);
    if (!query) { setStatus('검색할 공개 이름이 부족합니다.'); return () => controller.abort(); }
    setStatus('출처 후보를 찾고 있습니다.');
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const serverUrl = Constants.expoConfig?.extra?.serverUrl;
        if (!session?.access_token || !serverUrl) throw new Error();
        const response = await fetch(`${String(serverUrl).replace(/\/$/, '')}/api/capture-sources`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ query }), signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (controller.signal.aborted) return;
        const results = Array.isArray(data.results) ? data.results.filter((x: {title:string;url:string}) => typeof x.title === 'string' && safeArchiveUrl(x.url)) : [];
        setSources(results); setStatus(results.length ? '웹에서 찾은 후보입니다. 원본과의 일치는 확인 전입니다.' : '일치하는 출처 후보를 찾지 못했습니다.');
      } catch { if (!controller.signal.aborted) setStatus('자동 검색을 완료하지 못했습니다. 검색 링크를 이용하십시오.'); }
    })();
    return () => controller.abort();
  }, [query, attempt]);
  return <View style={[styles.section, { borderColor: colors.borderLight }]}>
    <Text style={[styles.heading, { color: colors.text }]}>원본·출처와 다음 행동</Text>
    <Text style={[styles.note, {color:colors.textSecondary}]}>공개 이름으로 Bing을 검색합니다. 연결된 링크와 검색 후보는 원문 일치 확인 전입니다.</Text>
    {buildArchiveLinks(capture).map(link => <TouchableOpacity accessibilityRole="link" key={link.url} onPress={() => openUrl(link.url)} style={styles.link}><Text style={{ color: colors.textAccent }}>{link.label}</Text></TouchableOpacity>)}
    <Text accessibilityLiveRegion="polite" style={[styles.note, {color:colors.textSecondary}]}>{status}</Text>
    {sources.map(source => <TouchableOpacity key={source.url} accessibilityRole="link" onPress={() => openUrl(source.url)} style={styles.link}><Text style={{color:colors.primary}}>출처 후보 · {source.title}</Text></TouchableOpacity>)}
    <TouchableOpacity accessibilityRole="button" onPress={() => setAttempt(x => x + 1)} style={styles.link}><Text style={{color:colors.text}}>출처 다시 찾기</Text></TouchableOpacity>
  </View>;
}
const styles = StyleSheet.create({ section: {borderTopWidth:1,paddingTop:24,marginTop:24}, heading:{fontSize:20,fontWeight:'400'}, note:{fontSize:13,lineHeight:20,marginVertical:8}, link:{minHeight:44,paddingVertical:12} });
