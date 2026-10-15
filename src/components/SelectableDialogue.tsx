import {SaveNoteButton} from './SaveNoteButton';
import { FrameProposalCard } from './FrameProposalCard';
import { MobileDialogueSelection } from './MobileDialogueSelection';
import { palette as C } from './design';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { analyzeExpressions, DialogueSelection, ExpressionTip, expressionToPattern } from '../core/expressionAnalysis';

export function SelectableDialogue({text,day,speaker,textStyle,onSelectionChange,preserveSelection=false,headerAction}:{text:string;headerAction?:React.ReactNode;day:number;speaker:string;onSelectionChange?:(active:boolean)=>void;preserveSelection?:boolean;textStyle?:import('react-native').TextStyle}) {
  const previous=useRef(text);
  const selectionCallback=useRef(onSelectionChange);selectionCallback.current=onSelectionChange;
  useEffect(()=>()=>selectionCallback.current?.(false),[]);
  const pending=useRef<AbortController|null>(null), revision=useRef(0), lastKey=useRef('');
  const [selection,setSelection]=useState<DialogueSelection|null>(null);
  const [tips,setTips]=useState<ExpressionTip[]>([]), [loading,setLoading]=useState(false), [error,setError]=useState('');
  const cache=useRef(new Map<string,ExpressionTip[]>());

  const closeSelection=()=>{
    // Closing the tip also dismisses the browser's highlighted text and any
    // analysis that is still in flight, so selectionchange cannot reopen it.
    pending.current?.abort();
    pending.current=null;
    revision.current++;
    lastKey.current='';
    if(Platform.OS==='web' && typeof window!=='undefined') window.getSelection()?.removeAllRanges();
    setSelection(null);setTips([]);setLoading(false);setError('');
    selectionCallback.current?.(false);
  };
  const inspect=async(value:DialogueSelection)=>{
    const key=JSON.stringify(value);
    if (lastKey.current===key) return;
    lastKey.current=key; pending.current?.abort(); const id=++revision.current;
    selectionCallback.current?.(true);
    setSelection(value);setTips([]);setError('');
    const cached=cache.current.get(key);
    if(cached){setTips(cached);setLoading(false);return;}
    const controller=new AbortController();pending.current=controller;setLoading(true);
    const timeout=setTimeout(()=>controller.abort(),15000);
    try {
      const result=await analyzeExpressions(value,controller.signal);
      if(revision.current!==id)return;
      if(cache.current.size>=30)cache.current.delete(cache.current.keys().next().value!);
      cache.current.set(key,result);setTips(result);
    } catch(problem:any) {if(revision.current===id)setError(controller.signal.aborted?'표현 설명이 늦어지고 있어요. 다시 시도해 주세요.':problem.message);}
    finally {clearTimeout(timeout);if(revision.current===id)setLoading(false);}
  };
  const inspectRef=useRef(inspect);inspectRef.current=inspect;
  useEffect(()=>{
    if(!preserveSelection && !text.startsWith(previous.current)){
      pending.current?.abort();revision.current++;lastKey.current='';setSelection(null);setTips([]);setLoading(false);setError('');selectionCallback.current?.(false);
    }
    previous.current=text;
  },[text,preserveSelection]);
  useEffect(()=>()=>{pending.current?.abort();revision.current++;},[]);
  const beginSelection=()=>{pending.current?.abort();revision.current++;lastKey.current='';setLoading(false);setTips([]);setError('');selectionCallback.current?.(true);};
  return <View>
    <View style={{flexDirection:'row',alignItems:'flex-start',gap:8}}><View style={{flex:1,minWidth:0}}><MobileDialogueSelection text={text || '…'} selection={selection} onSelect={value=>{void inspectRef.current(value);}} onBegin={beginSelection} textStyle={textStyle} /></View>{headerAction}</View>
    {selection && <View style={{marginTop:12,gap:10}}>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text numberOfLines={2} style={{flex:1,fontSize:11,color:C.muted}}>선택한 말 · {selection.selected}</Text><Pressable accessibilityRole="button" accessibilityLabel="표현 Tip 닫기" onPress={closeSelection} style={{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:20,color:C.muted}}>×</Text></Pressable></View>
      {loading && <Text style={{fontSize:12,color:C.muted}}>문맥에서 표현을 살펴보고 있어요…</Text>}
      {!!error && <Pressable accessibilityRole="button" onPress={()=>{lastKey.current='';void inspect(selection);}}><Text style={{fontSize:12,color:'#A35137'}}>{error} ↻</Text></Pressable>}
      {!loading && !error && !tips.length && <Text style={{fontSize:12,color:C.muted}}>설명할 단어나 표현을 조금 더 선택해 주세요.</Text>}
      {tips.map(tip=>{
        const pattern=expressionToPattern(tip,selection,day,speaker);
        return <View key={pattern.id} style={{borderLeftWidth:3,borderLeftColor:C.gold,paddingLeft:12,paddingVertical:4}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{flex:1}}><Text style={{fontSize:10,fontWeight:'800',color:C.coral}}>Tip · {tip.kind==='phrase'?'표현':'단어'}</Text><Text selectable style={{fontSize:17,fontWeight:'700',color:C.ink}}>{tip.expression}</Text></View><SaveNoteButton pattern={pattern}/></View>
          <Text style={{fontSize:13,fontWeight:'600',color:C.ink,marginTop:4}}>{tip.meaning}</Text>
          {tip.surface!==selection.selected.trim() && <Text style={{fontSize:11,color:C.coral,marginTop:4}}>원문 속 표현 · {tip.surface}</Text>}
          <Text style={{fontSize:12,lineHeight:20,color:C.muted,marginTop:4}}>{tip.explanation}</Text>
        </View>;
      })}
      {tips.filter((tip,index,array)=>tip.frame && array.findIndex(other=>other.frame?.template===tip.frame?.template)===index).slice(0,2).map(tip=><FrameProposalCard key={tip.frame!.template} frame={tip.frame!} day={day} source={selection.source} sourceKorean={tip.sourceKorean} speaker={speaker} />)}
    </View>}
  </View>;
}
