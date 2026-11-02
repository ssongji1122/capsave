import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Alert,BackHandler,Image,Modal,Platform,ScrollView,StyleSheet,TextInput,TouchableOpacity,View} from 'react-native';
import {Button} from '@toss/tds-react-native';
import Svg,{Path} from '@granite-js/native/react-native-svg';
import {Text} from '../../../apps/mobile/components/ScraveText';
import {CaptureWorkflowView} from '../../../apps/mobile/components/CaptureWorkflowView';
import {Colors} from '../../../apps/mobile/constants/Colors';
import {ARCHIVE_LENSES,selectArchiveCaptures} from '../../../apps/mobile/services/archive-view';
import {ARCHIVE_SECTIONS,buildArchiveLinks,classifyArchiveCapture,type ArchiveSection} from '../../../packages/shared/src/utils/capture-archive';
import {ARCHIVE_APPEARANCE,ARCHIVE_SHAPE_PATHS} from '../../../packages/shared/src/utils/archive-appearance';
import {EMPTY_CAPTURE_META,type ArchiveLens} from '../../../packages/shared/src/utils/capture-intent';
import {archiveStore,pickPhoto,executeAction,openSource} from './services/platform';
import {selectedPhotoUri,type ArchiveSnapshot,type createArchiveStore,type SelectedPhoto,type TossCapture} from './services/archive-store';

type Store=ReturnType<typeof createArchiveStore>;
interface Props { store?:Store; selectPhoto?:()=>Promise<SelectedPhoto|null> }
const colors=Colors.light;
const EMPTY_ARCHIVE:ArchiveSnapshot={captures:[],meta:{}};
export function ArchiveScreen({store=archiveStore,selectPhoto=pickPhoto}:Props) {
  const [archive,setArchive]=useState<ArchiveSnapshot>(EMPTY_ARCHIVE);
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const busyRef=useRef(false);
  const [error,setError]=useState('');
  const [status,setStatus]=useState('');
  const [photo,setPhoto]=useState<SelectedPhoto|null>(null);
  const [title,setTitle]=useState('');
  const [text,setText]=useState('');
  const [sourceUrl,setSourceUrl]=useState('');
  const [selected,setSelected]=useState<TossCapture|null>(null);
  const [original,setOriginal]=useState(false);
  const [query,setQuery]=useState('');
  const [lens,setLens]=useState<ArchiveLens>('all');
  const [section,setSection]=useState<ArchiveSection|'all'>('all');
  const load=useCallback(async()=>{
    setError('');
    try {setArchive(await store.load());setReady(true);}
    catch {setReady(false);setError('보관함을 읽지 못했습니다. 기존 내용은 유지합니다. 다시 시도해 주십시오.');}
  },[store]);
  useEffect(()=>{void load();},[load]);
  const back=useCallback(()=>{
    if(busyRef.current) return true;
    if(original){setOriginal(false);return true;}
    if(photo){setPhoto(null);return true;}
    if(selected){setSelected(null);return true;}
    return false;
  },[original,photo,selected]);
  useEffect(()=>{
    if(Platform.OS!=='android') return;
    const subscription=BackHandler.addEventListener('hardwareBackPress',back);
    return ()=>subscription.remove();
  },[back]);
  const add=async()=>{
    if(busyRef.current || !ready)return;
    busyRef.current=true;setBusy(true);setError('');setStatus('');
    try {
      const chosen=await selectPhoto();
      if(chosen){setTitle('');setText('');setSourceUrl('');setPhoto({...chosen,dataUri:selectedPhotoUri(chosen)});setSelected(null);}
      else setStatus('사진 선택을 취소했습니다.');
    } catch {setError('사진을 열지 못했습니다. 앨범 권한을 확인하고 다시 시도해 주십시오.');}
    finally {busyRef.current=false;setBusy(false);}
  };
  const save=async()=>{
    if(!photo || busyRef.current)return;
    busyRef.current=true;setBusy(true);setError('');
    try {const capture=await store.add(photo,{title,text,sourceUrl});setArchive(await store.load());setPhoto(null);setSelected(capture);}
    catch(e){setError(e instanceof Error ? e.message : '저장하지 못했습니다. 다시 시도해 주십시오.');}
    finally {busyRef.current=false;setBusy(false);}
  };
  const link=async(url:string)=>{try{await openSource(url);}catch{Alert.alert('링크 열기 실패','연결할 앱을 열지 못했습니다.');}};
  const captures=selectArchiveCaptures(archive.captures,archive.meta,{query,lens,section});
  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.brand}>Scrave</Text>
      {(photo || selected) && <Button type="light" size="medium" disabled={busy} onPress={back}>보관함으로</Button>}
      <Text accessibilityRole="header" style={styles.heading}>{photo?'캡처 추가':selected?selected.title:'my craves'}</Text>
      {!photo && !selected && <Text style={styles.subtitle}>scrap, save your crave</Text>}
      <Text style={styles.secondary}>이 기기에 보관합니다. 기존 계정 보관함과 연결하기 전입니다.</Text>
      {error ? <View accessibilityLiveRegion="assertive" style={styles.message}><Text>{error}</Text>{!ready && <Button onPress={load}>다시 불러오기</Button>}</View>:null}
      {status ? <Text accessibilityLiveRegion="polite">{status}</Text>:null}
      {photo ? <>
        <Image accessibilityLabel="선택한 캡처" source={{uri:photo.dataUri}} resizeMode="contain" style={styles.photo}/>
        <Text style={styles.secondary}>사진 속 필요한 글을 적으면 기존 Scrave와 같은 저장 이유·실행 항목으로 정리합니다. 자동 분석은 아직 연결하지 않았습니다.</Text>
        <TextInput accessibilityLabel="캡처 제목" placeholder="캡처 제목" placeholderTextColor={colors.textTertiary} value={title} onChangeText={setTitle} style={styles.input} editable={!busy}/>
        <TextInput accessibilityLabel="사진 속 필요한 글" placeholder="예약번호·전화번호·주소 등 필요한 글" placeholderTextColor={colors.textTertiary} value={text} onChangeText={setText} multiline style={[styles.input,styles.multiline]} editable={!busy}/>
        <TextInput accessibilityLabel="출처 주소" placeholder="출처 주소 (선택)" placeholderTextColor={colors.textTertiary} value={sourceUrl} onChangeText={setSourceUrl} autoCapitalize="none" keyboardType="url" style={styles.input} editable={!busy}/>
        <Button loading={busy} disabled={!title.trim()} containerStyle={styles.primary} onPress={save}>보관함에 저장</Button>
      </>:selected ? <>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="원본 크게 보기" onPress={()=>setOriginal(true)}><Image accessibilityLabel="저장한 캡처" source={{uri:selected.imageUri}} resizeMode="contain" style={styles.photo}/><Text style={styles.secondary}>원본 크게 보기</Text></TouchableOpacity>
        {selected.extractedText ? <Text selectable style={styles.body}>{selected.extractedText}</Text>:null}
        <CaptureWorkflowView key={selected.id} capture={selected} meta={archive.meta[selected.id]??EMPTY_CAPTURE_META} ready={ready} onExecute={executeAction}
          storageDescription="필요할 때만 남깁니다. 이 기기의 토스 보관함에 저장합니다."
          onUpdate={async change=>{setArchive(await store.updateMeta(selected.id,change));}}/>
        <Text accessibilityRole="header" style={styles.subheading}>출처와 장소</Text>
        {buildArchiveLinks(selected).map(item=><TouchableOpacity key={item.url} accessibilityRole="link" onPress={()=>void link(item.url)} style={styles.link}><Text>{item.label}</Text></TouchableOpacity>)}
      </>:<>
        <Button loading={busy} disabled={!ready} containerStyle={styles.primary} onPress={add}>캡처 추가</Button>
        <TextInput accessibilityLabel="보관함 검색" placeholder="제목·글·메모로 찾습니다" placeholderTextColor={colors.textTertiary} value={query} onChangeText={setQuery} style={styles.input}/>
        <View style={styles.row}>{ARCHIVE_LENSES.map(option=><TouchableOpacity key={option.id} accessibilityRole="button" accessibilityLabel={option.label} accessibilityState={{selected:lens===option.id}} onPress={()=>setLens(option.id)} style={[styles.filter,lens===option.id&&styles.active]}><Text>{option.label}</Text></TouchableOpacity>)}</View>
        <View style={styles.row}>{[{id:'all' as const,label:'전체 분류'},...ARCHIVE_SECTIONS].map(option=><TouchableOpacity key={option.id} accessibilityRole="button" accessibilityState={{selected:section===option.id}} onPress={()=>setSection(option.id)} style={[styles.filter,section===option.id&&styles.active]}><Text>{option.label}</Text></TouchableOpacity>)}</View>
        {!captures.length && ready && <View style={styles.empty}><Image source={require('../../../apps/mobile/assets/illustrations/archive.webp')} resizeMode="contain" style={styles.illustration}/><Text>{archive.captures.length ? '검색 조건에 맞는 캡처가 없습니다.' : '간직할 캡처를 추가합니다.'}</Text></View>}
        <View style={styles.grid}>{captures.map(capture=>{
          const category=classifyArchiveCapture(capture);
          const label=ARCHIVE_SECTIONS.find(item=>item.id===category)?.label;
          return <TouchableOpacity key={capture.id} accessibilityRole="button" accessibilityLabel={`${capture.title} 열기`} onPress={()=>{setError('');setSelected(capture);}} style={styles.card}>
            <Image source={{uri:capture.imageUri}} resizeMode="contain" style={styles.thumbnail}/>
            <View style={styles.categoryRow}><Svg width={12} height={12} viewBox="0 0 16 16" accessible={false}><Path d={ARCHIVE_SHAPE_PATHS[ARCHIVE_APPEARANCE[category].shape]} fill={ARCHIVE_APPEARANCE[category].color}/></Svg><Text style={styles.category}>{label}</Text></View>
            <Text numberOfLines={2} style={styles.cardTitle}>{capture.title}</Text>
          </TouchableOpacity>;
        })}</View>
      </>}
    </ScrollView>
    <Modal visible={original} animationType="none" onRequestClose={()=>setOriginal(false)}>
      <View style={styles.original}><Button type="light" onPress={()=>setOriginal(false)}>원본 닫기</Button>{selected && <Image accessibilityLabel="캡처 전체 이미지" source={{uri:selected.imageUri}} resizeMode="contain" style={styles.originalPhoto}/>}</View>
    </Modal>
  </View>;
}
const styles=StyleSheet.create({
  page:{flex:1,backgroundColor:colors.background},content:{padding:24,paddingBottom:48,gap:16},brand:{fontSize:24,fontFamily:'SUIT-SemiBold',color:colors.text},heading:{fontSize:28,fontFamily:'SUIT-SemiBold',color:colors.text},subtitle:{fontSize:13,color:colors.textSecondary},secondary:{fontSize:13,lineHeight:20,color:colors.textSecondary},body:{fontSize:15,lineHeight:24,color:colors.text},subheading:{fontSize:17,fontFamily:'SUIT-SemiBold'},
  photo:{width:'100%',height:360,backgroundColor:colors.surfaceElevated,borderRadius:14},input:{fontFamily:'SUIT-Regular',color:colors.text,fontSize:15,lineHeight:23,padding:14,minHeight:48,backgroundColor:colors.surfaceElevated,borderRadius:12,borderWidth:1,borderColor:colors.border},multiline:{minHeight:110,textAlignVertical:'top'},
  primary:{backgroundColor:colors.primary,minHeight:48},message:{padding:16,backgroundColor:colors.surfaceElevated,borderRadius:12,gap:12},row:{flexDirection:'row',flexWrap:'wrap',gap:8},filter:{minHeight:44,paddingHorizontal:10,justifyContent:'center',borderBottomWidth:2,borderBottomColor:'transparent'},active:{borderBottomColor:colors.primary},grid:{flexDirection:'row',flexWrap:'wrap',gap:16},card:{width:'47%',gap:8},thumbnail:{width:'100%',height:200,backgroundColor:colors.surfaceElevated,borderRadius:14},cardTitle:{fontSize:14,lineHeight:21,minHeight:42,color:colors.text},category:{fontSize:12,color:colors.textSecondary},categoryRow:{flexDirection:'row',gap:6,alignItems:'center'},marker:{width:8,height:8,borderRadius:4},empty:{alignItems:'center',gap:16,paddingVertical:24},illustration:{width:160,height:128},link:{minHeight:44,paddingVertical:12,borderBottomWidth:1,borderColor:colors.border},original:{flex:1,padding:24,paddingTop:56,backgroundColor:colors.background,gap:16},originalPhoto:{flex:1,width:'100%'},
});
