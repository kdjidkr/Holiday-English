import {occurrences} from '../core/vaultDictionary';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Animated,Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {LearnedPattern} from '../scenarios/types';
import {CardSession,NOTE_KINDS,NoteKind,classifyNote,noteDays,rateCard,skipCard,framePractice,selectCards,shuffleCards,startCards} from '../core/flashcards';
import {useGameStore} from '../store/gameStore';
import {SelectableDialogue} from './SelectableDialogue';
import {DayPicker} from './DayPicker';
import {palette as C} from './design';
export function Flashcards({notes,onClose,initialKind='word'}:{notes:LearnedPattern[];onClose:()=>void;initialKind?:NoteKind}) {
  const toggleStar=useGameStore(state=>state.togglePatternStar);
  const turn=useRef(new Animated.Value(0)).current;
  const days=useMemo(()=>noteDays(notes),[notes]);
  const [kind,setKind]=useState<NoteKind>(initialKind);
  const [dayPicker,setDayPicker]=useState(false);
  const [showExample,setShowExample]=useState(false);
  const [selectedDays,setDays]=useState<number[]|null>(null);
  const [session,setSession]=useState<CardSession|null>(null),[flipped,setFlipped]=useState(false);
  const chosenDays=selectedDays ?? days;
  const cards=selectCards(notes,[kind],chosenDays),card=session?.cards[session.index];
  const practice=card?framePractice(card,session?.round || 1):null;
  const [variation,setVariation]=useState(0);
  const variant=card?.learningKind==='frame' && card.frame?.variations.length?card.frame.variations[variation%card.frame.variations.length]:practice;
  const starred=!!notes.find(n=>n.id===card?.id)?.starred;
  useEffect(()=>{turn.stopAnimation();turn.setValue(0);setFlipped(false);setShowExample(false);setVariation(Math.max(0,(session?.round || 1)-1));},[card?.id,session?.round]);
  const flip=()=>{const next=!flipped;setFlipped(next);Animated.timing(turn,{toValue:next?1:0,duration:320,useNativeDriver:true}).start();};
  const rate=(known:boolean)=>{if(!session || !flipped)return;setSession(rateCard(session,known));setFlipped(false);};
  const start=()=>{setSession(startCards(shuffleCards(cards)));setFlipped(false);};
  return <View style={{flex:1,minHeight:0}}>
    {!session?.done && <View style={s.header}><Pressable accessibilityRole="button" onPress={onClose} style={s.back}><Text style={s.backText}>← 표현노트</Text></Pressable>{session && !session.done && <Pressable accessibilityRole="button" onPress={()=>setSession({...session,done:true})} style={s.back}><Text style={s.muted}>학습 끝내기</Text></Pressable>}</View>}
    <ScrollView contentContainerStyle={[s.content,session?.done && s.completedContent]}>
      {!session ? <>
        <Text accessibilityRole="header" style={s.title}>플래시카드</Text>
        <View accessibilityRole="tablist" style={s.categoryTabs}>{NOTE_KINDS.map(k=><Pressable key={k.id} accessibilityRole="tab" accessibilityState={{selected:kind===k.id}} onPress={()=>setKind(k.id)} style={[s.categoryTab,kind===k.id && {backgroundColor:C.paper}]}><Text style={{fontSize:12,fontWeight:'600',color:kind===k.id?C.ink:C.muted}}>{k.label}</Text></Pressable>)}</View>
        <View style={s.progressRow}><Pressable accessibilityRole="button" accessibilityLabel="학습 일차 선택" accessibilityState={{expanded:dayPicker}} onPress={()=>setDayPicker(true)} style={s.back}><Text style={s.backText}>{days.length>0 && days.every(d=>chosenDays.includes(d))?'전체 일차':chosenDays.length===1?`${chosenDays[0]}일차`:chosenDays.length?`${chosenDays.length}개 일차`:'일차 선택'}  ⌄</Text></Pressable><Text style={s.muted}>{cards.length}개</Text></View>
        <Text style={s.subtitle}>{cards.length?'카드를 눌러 뒤집고, 기억했는지 확인하세요.':notes.length?'선택한 분류와 일차에 저장된 항목이 없어요.':'표현노트에 항목을 저장하면 학습할 수 있어요.'}</Text>
      </> : session.done ? <View style={s.completion}>
        <View style={s.completionMark}><Text style={s.completionCheck}>✓</Text></View>
        <Text accessibilityRole="header" style={s.completionTitle}>학습 완료</Text>
        <Text style={s.completionSummary}>{session.seen.length ? `${session.seen.length}개 카드를 확인했어요.` : '이번 학습을 종료했어요.'}</Text>
        {session.again.length>0 && <Text style={s.completionHint}>다시 볼 카드 {session.again.length}개</Text>}
      </View> : card && <>
        <View style={s.progressRow}><Text style={s.muted}>{NOTE_KINDS.find(k=>k.id===kind)?.label}{session.round>1?' · 다시 보기':''}</Text><Text style={s.muted}>{session.index+1} / {session.cards.length}</Text></View>
        <View style={s.progress}><View style={[s.progressFill,{width:`${session.index/session.cards.length*100}%`}]} /></View>
        {card.learningKind==='frame' && <View style={{gap:5}}><Text style={s.tag}>문장 틀 연습</Text><Text style={{fontSize:17,lineHeight:25,fontWeight:'600',color:C.ink}}>{card.englishTemplate}</Text><Text style={s.muted}>{card.frame?.slotHint}</Text></View>}
        <View style={s.cardWrap}>
          <Pressable accessibilityRole="button" accessibilityLabel={flipped?'뜻 다시 보기':'카드 뒤집어 정답 보기'} onPress={flip} style={{flex:1,minHeight:Math.max(300,Math.ceil(Math.max((variant?.korean || card.koreanMeaning).length*1.8,(variant?.english || card.englishTemplate).length)/22)*38+120)}}>
            <Animated.View pointerEvents="none" style={[s.cardFace,{opacity:turn.interpolate({inputRange:[0,.49,.5,1],outputRange:[1,1,0,0]}),transform:[{perspective:1000},{rotateY:turn.interpolate({inputRange:[0,1],outputRange:['0deg','180deg']})}]}]}><Text style={s.cardCaption}>뜻</Text><Text style={s.cleanPrompt}>{variant?.korean || card.koreanMeaning}</Text></Animated.View>
            <Animated.View pointerEvents="none" style={[s.cardFace,{backgroundColor:C.mint,opacity:turn.interpolate({inputRange:[0,.49,.5,1],outputRange:[0,0,1,1]}),transform:[{perspective:1000},{rotateY:turn.interpolate({inputRange:[0,1],outputRange:['180deg','360deg']})}]}]}><Text style={s.cardCaption}>영어</Text><Text style={s.cleanPrompt}>{variant?.english || card.englishTemplate}</Text></Animated.View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`카드 별표 ${starred?'해제':'추가'}`} accessibilityState={{selected:starred}} onPress={()=>toggleStar(card.id)} style={s.star}><Text style={{fontSize:28,color:starred?C.coral:C.muted}}>{starred?'★':'☆'}</Text></Pressable>
        </View>
        {card.learningKind==='frame' && <Pressable accessibilityRole="button" onPress={()=>{setVariation(n=>n+1);setFlipped(false);turn.stopAnimation();turn.setValue(0);}} style={s.back}><Text style={s.backText}>다른 상황으로 연습 ↻</Text></Pressable>}
        <Pressable accessibilityRole="button" accessibilityState={{expanded:showExample}} onPress={()=>setShowExample(!showExample)} style={{minHeight:44,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:13,fontWeight:'600',color:C.muted}}>{showExample?'예문 닫기':'예문 보기'}</Text></Pressable>
        {showExample && <View style={{gap:12}}>{occurrences(card).filter(o=>o.sourceQuote).length?occurrences(card).filter(o=>o.sourceQuote).map((o,index)=><View key={`${index}-${o.day}`} style={{padding:18,borderRadius:18,backgroundColor:C.cream,gap:10}}><Text style={{fontSize:11,fontWeight:'600',color:C.muted}}>[{o.day}일차]{o.speaker?` · ${o.speaker}`:''}</Text><SelectableDialogue key={`${card.id}-${index}`} text={o.sourceQuote!} day={o.day} speaker={o.speaker || '저장한 대화'} textStyle={{fontSize:16,lineHeight:25,fontWeight:'400'}}/>{!!o.sourceKorean && <Text selectable style={{fontSize:14,lineHeight:23,color:C.muted}}>{o.sourceKorean}</Text>}</View>):<Text style={{fontSize:14,lineHeight:23,color:C.muted}}>이 항목에는 저장 당시 대화가 남아 있지 않아요.</Text>}</View>}
      </>}
    </ScrollView>
    {session?.done && <View style={s.completionDock}><Pressable accessibilityRole="button" onPress={onClose} style={s.primary}><Text style={s.primaryText}>표현노트로</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>{setSession(null);setFlipped(false);}} style={s.restart}><Text style={s.restartText}>다시 학습</Text></Pressable></View>}
    {!session && <View style={s.dock}><Pressable accessibilityRole="button" disabled={!cards.length} onPress={start} style={[s.primary,!cards.length&&{opacity:.35}]}><Text style={s.primaryText}>학습 시작</Text></Pressable></View>}
    {session && !session.done && !flipped && <View style={s.dock}><Pressable accessibilityRole="button" onPress={()=>{setSession(skipCard(session));setFlipped(false);}} style={s.primary}><Text style={s.primaryText}>다음으로 →</Text></Pressable></View>}
    {session && !session.done && flipped && <View style={s.dock}><View style={s.actions}><Pressable accessibilityRole="button" onPress={()=>rate(false)} style={[s.secondary,{flex:1}]}><Text style={s.chipText}>다시 볼게요</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>rate(true)} style={[s.primary,{flex:1}]}><Text style={s.primaryText}>알았어요 ✓</Text></Pressable></View></View>}
    <DayPicker visible={dayPicker} days={days} value={null} selectedDays={chosenDays} onDaysChange={setDays} onSelect={()=>{}} onClose={()=>setDayPicker(false)} />
  </View>;
}
const font=Platform.OS==='web'?'-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", sans-serif':'System';
const s=StyleSheet.create({
  completedContent:{flexGrow:1,justifyContent:'center',paddingVertical:40},completion:{alignItems:'center',gap:12},completionMark:{width:64,height:64,borderRadius:32,backgroundColor:C.mint,alignItems:'center',justifyContent:'center',marginBottom:12},completionCheck:{fontSize:30,fontWeight:'500',color:C.ink},completionTitle:{fontFamily:font,fontSize:26,lineHeight:34,fontWeight:'700',letterSpacing:-0.7,color:C.ink},completionSummary:{fontFamily:font,fontSize:15,lineHeight:24,color:C.muted,textAlign:'center'},completionHint:{fontSize:13,lineHeight:20,color:C.muted},completionDock:{paddingTop:16,paddingBottom:8,gap:8},restart:{minHeight:44,alignItems:'center',justifyContent:'center'},restartText:{fontSize:14,fontWeight:'500',color:C.muted},
  categoryTabs:{flexDirection:'row',padding:4,borderRadius:16,backgroundColor:C.cream,marginTop:8},categoryTab:{flex:1,minHeight:44,borderRadius:12,alignItems:'center',justifyContent:'center'},
  cardWrap:{marginTop:16,position:'relative'},
  cardFace:{position:'absolute',top:0,right:0,bottom:0,left:0,borderRadius:22,padding:28,borderWidth:1,borderColor:C.line,backgroundColor:C.cream,backfaceVisibility:'hidden',justifyContent:'center',alignItems:'center'},
  cardCaption:{position:'absolute',top:28,left:0,right:0,fontFamily:font,fontSize:12,color:C.muted,textAlign:'center'},
  cleanPrompt:{width:'100%',textAlign:'center',fontFamily:font,fontSize:25,lineHeight:37,fontWeight:'600',letterSpacing:-0.5,color:C.ink},
  star:{position:'absolute',top:10,right:10,width:48,height:48,alignItems:'center',justifyContent:'center'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{minHeight:44,justifyContent:'center'},backText:{fontSize:13,fontWeight:'600',color:C.ink},
  content:{paddingBottom:24,gap:12},title:{fontFamily:font,fontSize:24,lineHeight:32,fontWeight:'700',letterSpacing:-0.7,color:C.ink},subtitle:{fontSize:14,lineHeight:23,color:C.muted},label:{fontSize:13,fontWeight:'700',color:C.ink,marginTop:16},
  chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{minHeight:44,paddingHorizontal:16,borderRadius:14,justifyContent:'center',borderWidth:1,borderColor:C.line,backgroundColor:C.paper},selected:{backgroundColor:C.mint,borderColor:C.ink},chipText:{fontSize:14,fontWeight:'600',color:C.ink,textAlign:'center'},selectedText:{color:C.ink},
  preview:{backgroundColor:C.cream,padding:20,borderRadius:20,gap:6,marginTop:16},count:{fontSize:22,fontWeight:'700',color:C.ink},muted:{fontSize:12,lineHeight:18,color:C.muted},
  primary:{minHeight:52,borderRadius:16,backgroundColor:C.ink,padding:14,alignItems:'center',justifyContent:'center'},primaryText:{fontSize:15,fontWeight:'700',color:C.paper},secondary:{minHeight:52,padding:14,borderRadius:16,backgroundColor:C.cream,alignItems:'center',justifyContent:'center'},dock:{paddingVertical:12},actions:{flexDirection:'row',gap:10},
  progressRow:{flexDirection:'row',justifyContent:'space-between',marginTop:8},progress:{height:4,borderRadius:2,backgroundColor:C.cream,overflow:'hidden'},progressFill:{height:4,backgroundColor:C.coral},
  card:{borderRadius:26,minHeight:280,padding:24,backgroundColor:C.cream,marginTop:16,gap:18},tag:{fontSize:11,color:C.muted,fontWeight:'600'},prompt:{fontSize:26,lineHeight:36,fontWeight:'700',color:C.ink,marginVertical:22},meaning:{fontSize:15,lineHeight:23,color:C.ink},example:{fontSize:14,lineHeight:23,color:C.muted},flip:{fontSize:12,lineHeight:19,color:C.muted,marginTop:18},result:{paddingVertical:24,borderTopWidth:1,borderBottomWidth:1,borderColor:C.line,gap:12,marginVertical:12},
});
