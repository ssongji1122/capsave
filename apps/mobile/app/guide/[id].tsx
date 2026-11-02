import React,{useEffect,useState} from 'react';
import {ScrollView,View,TouchableOpacity,ActivityIndicator,StyleSheet} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import type {SavedGuideRecord} from '@scrave/shared';
import {Text} from '@/components/ScraveText';
import {Colors} from '@/constants/Colors';
import {loadMobileGuide} from '@/services/guides';
import {guideApiOptions} from '@/services/guide-api-options';
import {openMap} from '@/services/map-linker';
const colors=Colors.light;
export default function SavedGuide(){
 const {id}=useLocalSearchParams<{id:string}>();
 const [guide,setGuide]=useState<SavedGuideRecord|null>(null);
 const [error,setError]=useState('');
 const [retry,setRetry]=useState(0);
 useEffect(()=>{let current=true;setGuide(null);setError('');loadMobileGuide(id,guideApiOptions).then(value=>{if(current)setGuide(value);}).catch(reason=>{if(current)setError(reason instanceof Error?reason.message:'가이드를 불러오지 못했습니다.');});return()=>{current=false;};},[id,retry]);
 if(error)return <View style={styles.body}><Text accessibilityRole="alert">{error}</Text><TouchableOpacity accessibilityRole="button" style={styles.button} onPress={()=>setRetry(value=>value+1)}><Text>다시 불러오기</Text></TouchableOpacity></View>;
 if(!guide)return <ActivityIndicator color={colors.primary}/>;
 return <ScrollView contentContainerStyle={styles.body}><Text style={styles.title}>{guide.title}</Text><Text style={styles.description}>{guide.description}</Text>{guide.body.places.map(place=><View key={place.id} style={styles.card}><Text style={styles.name}>{place.sequence}. {place.name}</Text><Text style={styles.description}>{place.address}</Text><Text style={styles.description}>{place.summary}</Text><Text style={styles.description}>{place.practicalNote}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={`${place.name} 지도에서 열기`} style={styles.button} onPress={()=>openMap('naver',place.name,place.address)}><Text>지도에서 열기</Text></TouchableOpacity></View>)}</ScrollView>;
}
const styles=StyleSheet.create({body:{flexGrow:1,backgroundColor:colors.background,padding:24,gap:16},title:{fontSize:28,fontFamily:'SUIT-SemiBold',color:colors.text},name:{fontSize:17,fontFamily:'SUIT-SemiBold',color:colors.text},description:{fontSize:15,lineHeight:23,color:colors.textSecondary},card:{padding:16,gap:8,backgroundColor:colors.surfaceElevated,borderRadius:16},button:{minHeight:44,padding:12,borderWidth:1,borderColor:colors.border,borderRadius:12}});
