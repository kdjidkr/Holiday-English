import { useScreenHeight } from './useScreenHeight';
import { palette as C } from './design';
import { useGameStore } from '../store/gameStore';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { TaxiScene } from './TaxiScene';
import { GameMenu } from './GameMenu';
import { CafeScene, PlayerPortrait } from './CafeScene';
import { arrivalLines, ArrivalBeat, ArrivalDraft, nextArrivalBeat, validateArrivalName, normalizeArrivalName } from '../arrival/story';
import { useArrivalMusic } from '../arrival/useArrivalMusic';
import type { UserProfile } from '../store/gameStore';
import type { CustomerPersona } from '../scenarios/types';

const maggie: CustomerPersona = { id:'npc_maggie', name:'Maggie', age:46, gender:'FEMALE', occupation:'Sunny Side Cafe 사장', avatarSeed:'maggie_owner', preferredOrder:{menuName:'',description:'',prepDurationSeconds:0},personality:'다정하고 든든한 사장',aussieSlangTendency:[],reviewComment:'',topics:[] };
function Reply({ children, onPress, primary = false }: { children: React.ReactNode; onPress: () => void; primary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed}) => [styles.reply,primary && styles.primary,pressed && {opacity:.8,transform:[{translateY:2}]}]}><Text style={[styles.replyText,primary && {color:C.paper}]}>{children}</Text></Pressable>;
}
export function ArrivalConversation({ profile, onComplete, onCancel }: {profile: UserProfile; onComplete: (draft: ArrivalDraft) => void; onCancel?: () => void}) {
  const height=useScreenHeight(); const compact=true;
  const [beat,setBeat]=useState<ArrivalBeat>('BOARDING');
  const [draft,setDraft]=useState<ArrivalDraft>({englishNameAlphabet:profile.englishNameAlphabet,englishNameKorean:profile.englishNameKorean,koreanName:profile.koreanName,gender:profile.gender,situation:profile.situation});
  const [input,setInput]=useState('');
  const [typing,setTyping]=useState(false);
  const [lastReply,setLastReply]=useState('');
  const [error,setError]=useState('');
  const voiceOn = useGameStore(state => state.soundEnabled);
  const setVoiceOn = useGameStore(state => state.setSoundEnabled);
  const [appearanceChosen,setAppearanceChosen]=useState(false);
  const [shown,setShown]=useState('');
  const reveal = useRef(false);
  const music=useArrivalMusic(beat!=='BOARDING',voiceOn);
  const scene=arrivalLines[beat];
  const inCafe=scene.speaker==='manager';
  const needsInput=beat==='NAME';
  const inputLabel='손님에게 알려줄 영어 이름';
  useEffect(() => {
    setError('');
    setInput(beat==='NAME'?draft.englishNameAlphabet:'');
    reveal.current=false; setShown(''); let count=0;
    const timer=setInterval(()=>{if(reveal.current){clearInterval(timer);return;}count+=2;setShown(scene.line.slice(0,count));if(count>=scene.line.length)clearInterval(timer);},25);
    return ()=>clearInterval(timer);
  },[beat]);
  const advance=(reply: string, updates: Partial<ArrivalDraft>={})=>{
    setDraft(d=>({...d,...updates}));setLastReply(reply);setError('');setBeat(nextArrivalBeat(beat));
  };
  const answerName=(value: string)=>{
    const problem=validateArrivalName(value);if(problem){setError(problem);return;}
    const name=normalizeArrivalName(value);
    advance(`“${name}이라고 불러주세요.”`,{englishNameAlphabet:name});
  };
  const answerInput=()=>{
    const value=input.trim();
    if(beat==='NAME'){answerName(value);return;}
    if(!value){setError('손님에게 알려줄 영어 이름을 적어주세요.');return;}
    advance(`“${value}이라고 불러주세요.”`,{englishNameAlphabet:value});
  };
  return <SafeAreaView style={styles.safe}><StatusBar barStyle="dark-content" /><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.frame,{height:height-(compact?0:48)},compact && {borderRadius:0}]}>
    <View style={styles.header}><View><Text style={styles.chapter}>BRISBANE · DAY 1</Text><Text style={styles.headerTitle}>{inCafe?'카페 첫 근무':'공항에서 카페로'}</Text></View><GameMenu soundEnabled={voiceOn} onSoundChange={setVoiceOn} onLeave={onCancel} /></View>
    <View style={[styles.stage, compact && {flex:undefined,flexGrow:0,flexShrink:0,flexBasis:(typing ? 110 : Math.max(140,Math.min(height*.29,250)))}]}>
      {inCafe?<CafeScene customer={maggie} talking={shown.length < scene.line.length} phase="CHATTING" />:<TaxiScene gender={draft.gender} talking={shown.length < scene.line.length} moving={beat!=='BOARDING' && beat!=='ARRIVED'} mirror={beat==='REFLECTION'} />}
      <View pointerEvents="none" style={styles.location}><Text style={styles.locationText}>{scene.location}</Text></View>
      {beat==='BOARDING' && <View pointerEvents="none" style={[styles.boardingTitle,compact && {top:'28%',left:20}]}><Text style={styles.boardingSmall}>BRISBANE AIRPORT</Text><Text style={[styles.boardingHeading,compact && {fontSize:25,lineHeight:34}]}>카페로{ '\n' }이동합니다.</Text></View>}
      {!!lastReply && beat!=='FIRST_SHIFT' && <View pointerEvents="none" style={styles.myReply}><Text style={styles.myReplyName}>{draft.englishNameAlphabet || '나'}</Text><Text style={styles.myReplyText}>{lastReply}</Text></View>}
    </View>
    <ScrollView style={compact ? {flex:1,backgroundColor:C.paper,borderTopLeftRadius:24,borderTopRightRadius:24,marginTop:-18} : {flexGrow:0,flexShrink:1,maxHeight:height*.53}} keyboardShouldPersistTaps="handled" contentContainerStyle={[{flexGrow:1},styles.panel,compact && {paddingHorizontal:20,paddingTop:22,paddingBottom:24,borderTopWidth:0}]}>
      <View style={styles.speakerRow}><Text style={styles.speaker}>{scene.speaker==='driver'?'택시 기사':'카페 사장님'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="대사 펼치기" onPress={()=>{reveal.current=true;setShown(scene.line);}}><Text style={[styles.line,{fontSize:19,lineHeight:30}]}>{shown || '…'}</Text></Pressable>
    </ScrollView>
    <ScrollView style={{flexGrow:0,flexShrink:1,maxHeight:height*.48,backgroundColor:C.paper}} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal:20,paddingBottom:20,paddingTop:8}}>
      {needsInput && <View style={{gap:16,marginBottom:12}}><View style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}><TextInput onFocus={()=>setTyping(true)} onBlur={()=>setTyping(false)} accessibilityLabel={inputLabel} style={[styles.input,{minWidth:90,flex:1,minHeight:56,borderRadius:16,fontSize:20,fontWeight:'700'}]} value={input} onChangeText={setInput} onSubmitEditing={answerInput} maxLength={30} autoCapitalize="words" placeholder="영어 이름" placeholderTextColor="#97977F" /><Text style={{fontSize:17,color:C.ink}}>이라고 불러주세요</Text></View><Reply primary onPress={answerInput}>확인</Reply></View>}
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={[styles.answers,compact && {flexDirection:'column',alignItems:'stretch',paddingTop:8}]}>
        {beat==='BOARDING' && <Reply primary onPress={()=>advance('“안녕하세요. 써니 사이드 카페로 가주세요.”')}>택시 문을 열고 타기 →</Reply>}
        {beat==='WELCOME' && <><Reply onPress={()=>advance('“네, 브리즈번은 처음이에요.”')}>네, 처음이에요.</Reply><Reply onPress={()=>advance('“네, 비행은 괜찮았어요.”')}>네, 비행은 괜찮았어요.</Reply></>}
        {beat==='STORY' && <><Reply onPress={()=>advance('“일을 해보면서 진로를 찾고 싶어서요.”',{situation:'JOB_SEEKER_GRADUATE'})}>일을 해보면서 진로를 찾고 싶어서요.</Reply><Reply onPress={()=>advance('“잠시 쉬면서 다음 일을 생각해보려고요.”',{situation:'BURNOUT_CAREER'})}>잠시 쉬면서 다음 일을 생각해보려고요.</Reply></>}
        {beat==='REFLECTION' && <><View style={styles.appearances}>{(['FEMALE','MALE'] as const).map(gender=><Pressable accessibilityRole="button" accessibilityLabel={gender==='FEMALE'?'여성 모습으로 시작':'남성 모습으로 시작'} key={gender} onPress={()=>{setDraft(d=>({...d,gender}));setAppearanceChosen(true);setLastReply('“이 모습으로 시작할게요.”');}} style={[styles.appearance,appearanceChosen && draft.gender===gender && styles.chosen]}><PlayerPortrait gender={gender} size={compact?68:84} /><Text style={styles.appearanceLabel}>{gender==='FEMALE'?'여성 모습':'남성 모습'}</Text></Pressable>)}</View>{appearanceChosen && <Reply primary onPress={()=>advance('“이 모습으로 카페에 들어갈게요.”')}>이 모습으로 카페에 들어가기 →</Reply>}</>}
        {beat==='ARRIVED' && <Reply primary onPress={()=>advance('“안내해주셔서 고마워요.”')}>카페 안으로 들어가기 →</Reply>}
        {beat==='FIRST_SHIFT' && <Reply primary onPress={()=>onComplete(draft)}>첫 손님 맞이하기 →</Reply>}
      </View>
      {music.error && <><Text style={styles.error}>{music.error}</Text><Reply onPress={music.resume}>♪ 배경음 시작하기</Reply></>}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.cream,alignItems:'center',justifyContent:'center'},frame:{width:'100%',maxWidth:480,backgroundColor:C.paper,borderRadius:20,overflow:'hidden'},header:{height:64,backgroundColor:C.paper,paddingHorizontal:22,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},chapter:{fontSize:9,letterSpacing:2,color:C.coral,fontWeight:'700'},headerTitle:{fontSize:16,fontWeight:'700',color:C.ink,marginTop:4},headerActions:{flexDirection:'row',gap:15,alignItems:'center'},headerLink:{fontSize:10,color:'#DCDDC1'},sound:{borderWidth:1,borderColor:'#87947B',borderRadius:9,padding:10},soundText:{fontSize:11,color:'#F3E6C5'},stage:{flex:1,minHeight:100,position:'relative'},location:{position:'absolute',top:18,left:20,backgroundColor:'#FFF5DCEB',paddingHorizontal:12,paddingVertical:8,borderRadius:5},locationText:{fontSize:9,fontWeight:'700',letterSpacing:1.3,color:C.ink},boardingTitle:{position:'absolute',top:'27%',left:'9%'},boardingSmall:{fontSize:14,color:'#34574A'},boardingHeading:{fontSize:34,fontWeight:'800',lineHeight:47,color:C.ink,marginTop:8},myReply:{position:'absolute',left:20,bottom:19,maxWidth:'70%',backgroundColor:'#FFF8E8ED',borderRadius:14,paddingHorizontal:16,paddingVertical:12,borderBottomWidth:3,borderBottomColor:'#D7C7A4'},myReplyName:{fontSize:9,fontWeight:'800',color:'#C07456',marginBottom:4},myReplyText:{fontSize:12,lineHeight:19,color:C.ink},panel:{paddingHorizontal:32,paddingVertical:23,backgroundColor:C.paper,borderTopWidth:3,borderTopColor:'#D5B584'},speakerRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},speaker:{fontSize:12,fontWeight:'700',color:C.paper,backgroundColor:C.coral,paddingHorizontal:14,paddingVertical:7,borderRadius:7},replay:{fontSize:10,color:'#7D846B'},line:{fontSize:21,lineHeight:31,color:C.ink,marginTop:15,marginBottom:15,fontWeight:'500'},answers:{flexDirection:'row',gap:10,flexWrap:'wrap',alignItems:'center'},reply:{paddingHorizontal:16,paddingVertical:18,minHeight:58,alignItems:'center',backgroundColor:C.cream,borderRadius:18,borderBottomWidth:0,borderBottomColor:C.line},primary:{backgroundColor:C.ink,borderBottomColor:C.ink},replyText:{fontSize:16,fontWeight:'600',color:C.ink,lineHeight:18},inputRow:{flexDirection:'row',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:12},input:{minWidth:140,flex:1,backgroundColor:C.cream,borderRadius:10,padding:14,fontSize:16,color:C.ink,borderWidth:1,borderColor:C.line},error:{fontSize:11,lineHeight:18,color:'#A24E39',marginVertical:8},choiceHint:{fontSize:10,color:'#8A8D72',width:'100%',marginBottom:1},help:{fontSize:10,color:'#8A8D72',lineHeight:17,marginTop:12},appearances:{flexDirection:'row',gap:12},appearance:{alignItems:'center',padding:9,borderWidth:2,borderColor:'#DFD7BE',borderRadius:12,backgroundColor:'#EEE8D6'},chosen:{borderColor:C.coral,backgroundColor:C.peach},appearanceLabel:{fontSize:12,color:C.ink,fontWeight:'600',marginTop:5},badge:{position:'absolute',left:'27%',right:'27%',top:'9%',backgroundColor:'#FFF7E3',borderWidth:4,borderColor:'#D5B57A',borderRadius:15,padding:18,transform:[{rotate:'-3deg'}]},badgeCafe:{fontSize:10,fontWeight:'800',color:'#C07456',letterSpacing:2},badgeBody:{flexDirection:'row',gap:14,alignItems:'center',marginTop:8},badgeName:{fontSize:22,fontWeight:'800',color:C.ink},badgeRole:{fontSize:8,letterSpacing:1,color:'#8A8D72',marginTop:6},route:{height:32,backgroundColor:'#EFE5CB',flexDirection:'row',alignItems:'center',justifyContent:'center',paddingHorizontal:20,gap:12},routeText:{fontSize:9,fontWeight:'700',color:'#8A8D72'},routeLine:{height:1,width:35,backgroundColor:'#C9C4A7'},
});
