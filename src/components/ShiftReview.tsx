import { palette as C } from './design';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ShiftRecord } from '../core/gameRules';
import { generateShiftReview, reviewContext, reviewExpressionToPattern, validateShiftReview } from '../core/shiftReview';
import { SelectableDialogue } from './SelectableDialogue';
import { useGameStore } from '../store/gameStore';

export function ShiftReview({record}:{record:ShiftRecord}) {
  const stored=useGameStore(state=>state.shiftHistory.find(item=>item.id===record.id));
  const saved=useGameStore(state=>state.vaultPatterns);
  const saveReview=useGameStore(state=>state.saveShiftReview), saveExpression=useGameStore(state=>state.savePatternToVault);
  const rawCards=stored?.review ?? record.review;
  const cards=useMemo(()=>rawCards===undefined?undefined:validateShiftReview({cards:rawCards},record),[rawCards,record]);
  const targetCount=Math.min(3,new Set(record.sessions.flatMap(session=>session.dialogue.filter(turn=>turn.speaker==='user' && !turn.rescue && !turn.assisted && turn.text.trim()).map(turn=>turn.text.trim().toLowerCase()))).size);
  const [loading,setLoading]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[expanded,setExpanded]=useState<number|null>(null);
  useEffect(()=>{
    setExpanded(null);setError('');
    if(cards!==undefined && cards.length>=targetCount){setLoading(false);return;}
    const controller=new AbortController();let active=true;
    setLoading(true);const timer=setTimeout(()=>controller.abort(),30000);
    void generateShiftReview(record,controller.signal).then(result=>{if(active)saveReview(record.id,result);}).catch(problem=>{if(active)setError(controller.signal.aborted?'복습 준비가 늦어지고 있어요. 다시 시도해 주세요.':problem.message);}).finally(()=>{clearTimeout(timer);if(active)setLoading(false);});
    return()=>{active=false;clearTimeout(timer);controller.abort();};
  },[record.id,cards,attempt]);
  return <View style={{marginTop:24,gap:12}}>
    <Text style={{fontSize:21,lineHeight:29,fontWeight:'800',color:C.ink}}>오늘 나눈 말, 이렇게도 표현해요</Text>
    {loading && <Text style={{fontSize:13,lineHeight:21,color:C.muted}}>오늘 나눈 대화에서 표현을 골라보고 있어요…</Text>}
    {!!error && <Pressable accessibilityRole="button" accessibilityLabel="복습 표현 다시 불러오기" onPress={()=>setAttempt(value=>value+1)} style={{paddingVertical:12}}><Text style={{fontSize:13,color:'#A35137'}}>{error} ↻</Text></Pressable>}
    {cards?.length===0 && <Text style={{fontSize:13,lineHeight:21,color:C.muted}}>오늘은 복습할 발화가 충분하지 않았어요. 다음 근무에서 나눈 말로 다시 준비할게요.</Text>}
    {cards?.map((card,index)=><View key={`${card.sessionIndex}-${card.turnIndex}`}>
      <Pressable accessibilityRole="button" accessibilityLabel={card.koreanSentence} accessibilityState={{expanded:expanded===index}} onPress={()=>setExpanded(expanded===index?null:index)} style={{backgroundColor:C.cream,borderRadius:18,padding:18,flexDirection:'row',alignItems:'center',gap:12}}><Text style={{flex:1,fontSize:16,lineHeight:24,fontWeight:'700',color:C.ink}}>{card.koreanSentence}</Text><Text style={{fontSize:20,color:C.ink}}>{expanded===index?'−':'＋'}</Text></Pressable>
      {expanded===index && <View style={{paddingVertical:16,gap:14}}>
        <Text style={{fontSize:11,fontWeight:'700',color:C.coral}}>{card.kind==='polish'?'조금 더 자연스럽게':card.kind==='good'?'잘 쓴 표현이에요':'이렇게도 말할 수 있어요'}</Text>
        <Text style={{fontSize:13,lineHeight:22,color:C.muted}}>{card.note}</Text>
        {card.expressions.map((expression,i)=>{
          const pattern=reviewExpressionToPattern(record,card,i),exists=saved.some(item=>item.id===pattern.id);
          return <View key={pattern.id} style={{backgroundColor:C.paper,borderRadius:18,borderWidth:1,borderColor:C.line,padding:16,gap:8}}>
            <View style={{flexDirection:'row',gap:8,alignItems:'center'}}><View style={{flex:1}}><SelectableDialogue text={expression.english} day={record.day} speaker="복습 대안" textStyle={{fontSize:18,lineHeight:27,fontWeight:'700'}} /></View><Pressable accessibilityRole="button" accessibilityLabel={exists?`${expression.english} 저장됨`:`${expression.english} 표현노트에 저장`} disabled={exists} onPress={()=>saveExpression(pattern)} style={{width:48,height:48,borderRadius:14,backgroundColor:exists?C.mint:C.cream,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:22,color:C.ink}}>{exists?'✓':'＋'}</Text></Pressable></View>
            <Text style={{fontSize:13,lineHeight:21,color:C.muted}}>{expression.koreanMeaning}</Text><Text style={{fontSize:12,lineHeight:20,color:C.muted}}>{expression.explanation}</Text>
          </View>;
        })}
        <View style={{borderLeftWidth:3,borderLeftColor:C.line,paddingLeft:12,gap:8}}><Text style={{fontSize:11,fontWeight:'700',color:C.muted}}>그때 나눈 대화</Text>{reviewContext(record,card).map((turn,i)=><View key={i}><Text style={{fontSize:10,fontWeight:'700',color:turn.speaker==='user'?C.coral:C.muted}}>{turn.speaker==='user'?(turn.assisted?'추천 인사':'내가 했던 말'):record.sessions[card.sessionIndex].customer.name}</Text><Text selectable style={{fontSize:14,lineHeight:22,color:C.ink}}>{turn.text}</Text></View>)}</View>
      </View>}
    </View>)}
  </View>;
}
