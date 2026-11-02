import React, {useCallback,useState} from 'react';
import {View,ScrollView,TouchableOpacity,ActivityIndicator,StyleSheet} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import type {SavedGuideSummary} from '@scrave/shared';
import {Text} from '@/components/ScraveText';
import {ArchiveIllustration} from '@/components/ArchiveIllustration';
import {Colors} from '@/constants/Colors';
import {listMobileGuides} from '@/services/guides';
import {guideApiOptions} from '@/services/guide-api-options';
const colors=Colors.light;
export default function GuideLibrary(){
 const router=useRouter();
 const [guides,setGuides]=useState<SavedGuideSummary[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [retry,setRetry]=useState(0);
 useFocusEffect(useCallback(()=>{
  let active=true;
  setLoading(true);setError('');
  listMobileGuides(guideApiOptions).then(value=>{if(active)setGuides(value);}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'목록을 불러오지 못했습니다.');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[retry]));
 return <ScrollView contentContainerStyle={styles.body}>
  <ArchiveIllustration kind="travel" size={72}/>
  <Text style={styles.title}>내 가이드</Text>
  <Text style={styles.description}>저장해 둔 장소와 동선을 다시 확인합니다.</Text>
  {loading?<ActivityIndicator color={colors.primary}/>:error?<View><Text accessibilityRole="alert" style={styles.description}>{error}</Text><TouchableOpacity accessibilityRole="button" style={styles.button} onPress={()=>setRetry(value=>value+1)}><Text>다시 불러오기</Text></TouchableOpacity></View>:guides.length===0?<Text style={styles.description}>저장한 가이드가 없습니다. 장소 탭에서 캡처를 골라 만들 수 있습니다.</Text>:guides.map(guide=><TouchableOpacity key={guide.id} accessibilityRole="button" accessibilityLabel={`${guide.title} 가이드 열기`} style={styles.card} onPress={()=>router.push({pathname:'/guide/[id]',params:{id:guide.id}} as never)}><Text style={styles.name}>{guide.title}</Text><Text style={styles.description}>{guide.description}</Text><Text style={styles.description}>{guide.placeCount}곳 · {guide.visibility==='private'?'나만 보기':'링크로 보기'}</Text></TouchableOpacity>)}
  <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={()=>router.push('/(tabs)/places')}><Text>장소에서 가이드 만들기</Text></TouchableOpacity>
 </ScrollView>;
}
const styles=StyleSheet.create({body:{flexGrow:1,backgroundColor:colors.background,padding:24,gap:16},title:{fontSize:28,fontFamily:'SUIT-SemiBold',color:colors.text},name:{fontSize:17,fontFamily:'SUIT-SemiBold',color:colors.text},description:{fontSize:15,lineHeight:23,color:colors.textSecondary},button:{minHeight:44,padding:12,borderRadius:12,borderWidth:1,borderColor:colors.border},card:{padding:16,gap:8,borderRadius:16,backgroundColor:colors.surfaceElevated}});
