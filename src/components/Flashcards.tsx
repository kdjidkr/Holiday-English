import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Animated,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {LearnedPattern} from '../scenarios/types';
import {CardSession,NOTE_KINDS,NoteKind,classifyNote,noteDays,rateCard,skipCard,selectCards,shuffleCards,startCards} from '../core/flashcards';
import {useGameStore} from '../store/gameStore';
import {palette as C} from './design';
export function Flashcards({notes,onClose}:{notes:LearnedPattern[];onClose:()=>void}) {
  const toggleStar=useGameStore(state=>state.togglePatternStar);
  const turn=useRef(new Animated.Value(0)).current;
  const days=useMemo(()=>noteDays(notes),[notes]);
  const [kinds,setKinds]=useState<NoteKind[]>(['word','phrase','sentence']);
  const [showExample,setShowExample]=useState(false);
  const [selectedDays,setDays]=useState<number[]|null>(null);
  const [session,setSession]=useState<CardSession|null>(null),[flipped,setFlipped]=useState(false);
  const chosenDays=selectedDays ?? days;
  const cards=selectCards(notes,kinds,chosenDays),card=session?.cards[session.index];
  const starred=!!notes.find(n=>n.id===card?.id)?.starred;
  useEffect(()=>{turn.stopAnimation();turn.setValue(0);setFlipped(false);setShowExample(false);},[card?.id,session?.round]);
  const flip=()=>{const next=!flipped;setFlipped(next);Animated.timing(turn,{toValue:next?1:0,duration:320,useNativeDriver:true}).start();};
  const rate=(known:boolean)=>{if(!session || !flipped)return;setSession(rateCard(session,known));setFlipped(false);};
  const start=()=>{setSession(startCards(shuffleCards(cards)));setFlipped(false);};
  const toggleDay=(day:number)=>setDays(chosenDays.includes(day)?chosenDays.filter(d=>d!==day):[...chosenDays,day]);
  return <View style={{flex:1,minHeight:0}}>
    <View style={s.header}><Pressable accessibilityRole="button" onPress={onClose} style={s.back}><Text style={s.backText}>← 표현노트</Text></Pressable>{session && !session.done && <Pressable accessibilityRole="button" onPress={()=>setSession({...session,done:true})} style={s.back}><Text style={s.muted}>학습 끝내기</Text></Pressable>}</View>
    <ScrollView contentContainerStyle={s.content}>
      {!session ? <>
        <Text accessibilityRole="header" style={s.title}>플래시카드</Text><Text style={s.subtitle}>뜻을 보고 영어를 떠올려 보세요.</Text>
        <Text style={s.label}>학습할 분류 · 여러 개 선택 가능</Text><View style={s.chips}>{NOTE_KINDS.map(k=><Pressable key={k.id} accessibilityRole="checkbox" accessibilityState={{checked:kinds.includes(k.id)}} onPress={()=>setKinds(kinds.includes(k.id)?kinds.filter(x=>x!==k.id):[...kinds,k.id])} style={[s.chip,kinds.includes(k.id)&&s.selected]}><Text style={[s.chipText,kinds.includes(k.id)&&s.selectedText]}>{k.label}{kinds.includes(k.id)?' ✓':''}</Text></Pressable>)}</View>
        <Text style={s.label}>학습할 Day · 여러 개 선택 가능</Text>
        <View style={s.chips}><Pressable accessibilityRole="checkbox" accessibilityLabel="모든 Day 선택" accessibilityState={{checked:days.length>0 && days.every(d=>chosenDays.includes(d))}} onPress={()=>setDays(days.every(d=>chosenDays.includes(d))?[]:null)} style={[s.chip,days.length>0 && days.every(d=>chosenDays.includes(d))&&s.selected]}><Text style={s.chipText}>전체</Text></Pressable>{days.map(day=><Pressable key={day} accessibilityRole="checkbox" accessibilityState={{checked:chosenDays.includes(day)}} onPress={()=>toggleDay(day)} style={[s.chip,chosenDays.includes(day)&&s.selected]}><Text style={s.chipText}>{day}일차{chosenDays.includes(day)?' ✓':''}</Text></Pressable>)}</View>
        {!notes.length && <Text style={s.subtitle}>표현노트에 항목을 저장하면 학습할 수 있어요.</Text>}
        <View style={s.preview}><Text style={s.count}>{cards.length}개 카드</Text><Text style={s.muted}>{cards.length?'선택한 카드가 무작위 순서로 나와요.':'분류와 Day를 선택해 주세요.'}</Text></View>
      </> : session.done ? <>
        <Text accessibilityRole="header" style={s.title}>{session.seen.length?'학습을 마쳤어요':'학습을 종료했어요'}</Text>
        <View style={s.result}><Text style={s.count}>{session.seen.length}개 확인했어요</Text><Text style={s.subtitle}>{session.again.length}개는 다시 보기로 선택했어요.</Text></View>
        <Pressable accessibilityRole="button" onPress={()=>{setSession(null);setFlipped(false);}} style={s.secondary}><Text style={s.chipText}>학습 범위 다시 선택</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={s.primary}><Text style={s.primaryText}>표현노트로 돌아가기</Text></Pressable>
      </> : card && <>
        <View style={s.progressRow}><Text style={s.muted}>{session.round===1?'첫 번째 학습':`다시 보기 · ${session.round-1}회차`}</Text><Text style={s.muted}>{session.index+1} / {session.cards.length}</Text></View>
        <View style={s.progress}><View style={[s.progressFill,{width:`${session.index/session.cards.length*100}%`}]} /></View>
        <View style={s.cardWrap}>
          <Pressable accessibilityRole="button" accessibilityLabel={flipped?'뜻 다시 보기':'카드 뒤집어 정답 보기'} onPress={flip} style={{flex:1,minHeight:Math.max(300,Math.ceil(Math.max(card.koreanMeaning.length*1.8,card.englishTemplate.length)/22)*38+120)}}>
            <Animated.View pointerEvents="none" style={[s.cardFace,{opacity:turn.interpolate({inputRange:[0,.49,.5,1],outputRange:[1,1,0,0]}),transform:[{perspective:1000},{rotateY:turn.interpolate({inputRange:[0,1],outputRange:['0deg','180deg']})}]}]}><Text style={s.cardCaption}>뜻</Text><Text style={s.cleanPrompt}>{card.koreanMeaning}</Text></Animated.View>
            <Animated.View pointerEvents="none" style={[s.cardFace,{backgroundColor:C.mint,opacity:turn.interpolate({inputRange:[0,.49,.5,1],outputRange:[0,0,1,1]}),transform:[{perspective:1000},{rotateY:turn.interpolate({inputRange:[0,1],outputRange:['180deg','360deg']})}]}]}><Text style={s.cardCaption}>영어</Text><Text style={s.cleanPrompt}>{card.englishTemplate}</Text></Animated.View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`카드 별표 ${starred?'해제':'추가'}`} accessibilityState={{selected:starred}} onPress={()=>toggleStar(card.id)} style={s.star}><Text style={{fontSize:28,color:starred?C.coral:C.muted}}>{starred?'★':'☆'}</Text></Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{expanded:showExample}} onPress={()=>setShowExample(!showExample)} style={{minHeight:44,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:13,fontWeight:'600',color:C.muted}}>{showExample?'예문 닫기':'예문 보기'}</Text></Pressable>
        {showExample && <View style={{padding:18,borderRadius:18,backgroundColor:C.cream,gap:10}}><Text style={{fontSize:11,fontWeight:'600',color:C.muted}}>[{card.shiftDay}일차]{card.sourceSpeaker?` · ${card.sourceSpeaker}`:''}</Text><Text selectable style={{fontSize:16,lineHeight:25,color:C.ink}}>{card.sourceQuote || '이 항목에는 저장 당시 대화가 남아 있지 않아요.'}</Text></View>}
      </>}
    </ScrollView>
    {!session && <View style={s.dock}><Pressable accessibilityRole="button" disabled={!cards.length} onPress={start} style={[s.primary,!cards.length&&{opacity:.35}]}><Text style={s.primaryText}>{cards.length}개 학습 시작</Text></Pressable></View>}
    {session && !session.done && !flipped && <View style={s.dock}><Pressable accessibilityRole="button" onPress={()=>{setSession(skipCard(session));setFlipped(false);}} style={s.primary}><Text style={s.primaryText}>다음으로 →</Text></Pressable></View>}
    {session && !session.done && flipped && <View style={s.dock}><View style={s.actions}><Pressable accessibilityRole="button" onPress={()=>rate(false)} style={[s.secondary,{flex:1}]}><Text style={s.chipText}>다시 볼게요</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>rate(true)} style={[s.primary,{flex:1}]}><Text style={s.primaryText}>알았어요 ✓</Text></Pressable></View></View>}
  </View>;
}
const s=StyleSheet.create({
  cardWrap:{marginTop:16,position:'relative'},
  cardFace:{position:'absolute',top:0,right:0,bottom:0,left:0,borderRadius:26,padding:28,paddingTop:60,backgroundColor:C.cream,backfaceVisibility:'hidden',justifyContent:'center'},
  cardCaption:{fontSize:12,color:C.muted,marginBottom:16},
  cleanPrompt:{fontSize:26,lineHeight:38,fontWeight:'700',color:C.ink},
  star:{position:'absolute',top:10,right:10,width:48,height:48,alignItems:'center',justifyContent:'center'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{minHeight:44,justifyContent:'center'},backText:{fontSize:13,fontWeight:'600',color:C.ink},
  content:{paddingBottom:24,gap:12},title:{fontSize:26,lineHeight:34,fontWeight:'800',color:C.ink},subtitle:{fontSize:14,lineHeight:23,color:C.muted},label:{fontSize:13,fontWeight:'700',color:C.ink,marginTop:16},
  chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{minHeight:44,paddingHorizontal:16,borderRadius:14,justifyContent:'center',borderWidth:1,borderColor:C.line,backgroundColor:C.paper},selected:{backgroundColor:C.mint,borderColor:C.ink},chipText:{fontSize:14,fontWeight:'600',color:C.ink,textAlign:'center'},selectedText:{color:C.ink},
  preview:{backgroundColor:C.cream,padding:20,borderRadius:20,gap:6,marginTop:16},count:{fontSize:22,fontWeight:'700',color:C.ink},muted:{fontSize:12,lineHeight:18,color:C.muted},
  primary:{minHeight:52,borderRadius:16,backgroundColor:C.ink,padding:14,alignItems:'center',justifyContent:'center'},primaryText:{fontSize:15,fontWeight:'700',color:C.paper},secondary:{minHeight:52,padding:14,borderRadius:16,backgroundColor:C.cream,alignItems:'center',justifyContent:'center'},dock:{paddingVertical:12},actions:{flexDirection:'row',gap:10},
  progressRow:{flexDirection:'row',justifyContent:'space-between',marginTop:8},progress:{height:4,borderRadius:2,backgroundColor:C.cream,overflow:'hidden'},progressFill:{height:4,backgroundColor:C.coral},
  card:{borderRadius:26,minHeight:280,padding:24,backgroundColor:C.cream,marginTop:16,gap:18},tag:{fontSize:11,color:C.muted,fontWeight:'600'},prompt:{fontSize:26,lineHeight:36,fontWeight:'700',color:C.ink,marginVertical:22},meaning:{fontSize:15,lineHeight:23,color:C.ink},example:{fontSize:14,lineHeight:23,color:C.muted},flip:{fontSize:12,lineHeight:19,color:C.muted,marginTop:18},result:{padding:24,borderRadius:24,backgroundColor:C.mint,gap:12,marginVertical:20},
});
