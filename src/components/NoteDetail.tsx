import {occurrences} from '../core/vaultDictionary';
import React from 'react';
import {Disclosure} from './Disclosure';
import {classifyNote} from '../core/flashcards';
import {Platform,Pressable,StyleSheet,Text,View} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import type {LearnedPattern} from '../scenarios/types';
import {splitExample} from '../core/notePresentation';
import {palette as C} from './design';
const font=Platform.OS==='web'?'-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", sans-serif':'System';
function Emphasis({text,note,style}:{text:string;note:LearnedPattern;style:import('react-native').TextStyle}) {
  const candidates=[note.englishTemplate,note.selectedText || ''].filter(Boolean);
  const match=candidates.find(word=>text.toLowerCase().includes(word.toLowerCase()));
  if(!match)return <Text selectable style={style}>{text}</Text>;
  const index=text.toLowerCase().indexOf(match.toLowerCase());
  return <Text selectable style={style}>{text.slice(0,index)}<Text style={{fontWeight:'700',color:C.coral}}>{text.slice(index,index+match.length)}</Text>{text.slice(index+match.length)}</Text>;
}
export function NoteDetail({note,onBack,onStar,senses=[],onSense}:{note:LearnedPattern;onBack:()=>void;onStar:()=>void;senses?:LearnedPattern[];onSense?:(note:LearnedPattern)=>void}) {
  // Review notes sometimes contain a conversation transcript rather than illustrative examples.
  const examples=note.learningKind==='frame' && note.frame
    ? note.frame.variations
    : (note.slotExamples || []).filter(value=>!/^\s*(?:나|[^:]{1,40}):\s/.test(value) && value.trim()!==note.sourceQuote?.trim()).map(splitExample);
  return <View style={s.page}>
    <View style={s.navigation}><Pressable accessibilityRole="button" onPress={onBack} style={s.back}><Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M14 5l-7 7 7 7M7 12h13" stroke={C.ink} strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round"/></Svg><Text style={s.backLabel}>표현노트</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`별표 ${note.starred?'해제':'추가'}`} accessibilityState={{selected:!!note.starred}} onPress={onStar} style={s.star}><Text style={{fontSize:26,color:note.starred?C.coral:C.muted}}>{note.starred?'★':'☆'}</Text></Pressable></View>
    <View style={s.hero}><Text selectable accessibilityRole="header" style={[s.english,note.englishTemplate.length>35 && {fontSize:28,lineHeight:39,letterSpacing:-0.7}]}>{note.englishTemplate}</Text><Text selectable style={s.meaning}>{note.koreanMeaning}</Text></View>
    {senses.length>1 && <View style={{gap:6,paddingBottom:12}}><Text style={s.label}>뜻 {senses.length}개</Text>{senses.map((sense,index)=><Pressable key={sense.id} accessibilityRole="button" accessibilityState={{selected:sense.id===note.id}} onPress={()=>onSense?.(sense)} style={{padding:12,borderRadius:12,backgroundColor:sense.id===note.id?C.mint:C.cream}}><Text style={{fontSize:14,lineHeight:22,color:C.ink}}>{index+1}. {sense.koreanMeaning}</Text></Pressable>)}</View>}
    {!!(note.frame?.slotHint || note.explanation) && <Disclosure key={`explanation-${note.id}`} label="설명"><Text style={s.explanation}>{note.frame?.slotHint || note.explanation}</Text></Disclosure>}
    {classifyNote(note)!=='sentence' && occurrences(note).some(o=>o.sourceQuote) && <Disclosure key={note.id} label="대화에서">{occurrences(note).filter(o=>o.sourceQuote).map((o,index)=><View key={`${index}-${o.day}`} style={s.section}>
      <View style={s.sectionHeading}><Text style={s.label}>대화에서</Text><Text style={s.metadata}>{o.day}일차{o.speaker?` · ${o.speaker}`:''}</Text></View>
      <View style={s.quote}><Emphasis text={o.sourceQuote!} note={note} style={s.quoteEnglish} />{!!o.sourceKorean && <Text selectable style={[s.exampleKorean,{marginTop:8}]}>{o.sourceKorean}</Text>}</View>
    </View>)}
    </Disclosure>}
    {!!examples.length && <View style={s.section}><Text style={s.label}>{note.learningKind==='frame'?'이렇게 바꿔 써요':'예문'}</Text>{examples.map((example,index)=><View key={`${index}-${example.english}`} style={[s.example,index>0 && s.exampleSeparator]}><Emphasis text={example.english} note={note} style={s.exampleEnglish} />{!!example.korean && <Text selectable style={s.exampleKorean}>{example.korean}</Text>}</View>)}</View>}
  </View>;
}
const s=StyleSheet.create({
  page:{paddingHorizontal:4,paddingBottom:32},navigation:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},back:{minHeight:44,flexDirection:'row',alignItems:'center',gap:7},backLabel:{fontFamily:font,fontSize:13,fontWeight:'600',color:C.ink},star:{width:44,height:44,alignItems:'center',justifyContent:'center'},
  hero:{gap:12,paddingTop:4,paddingBottom:18},english:{fontFamily:font,fontSize:38,lineHeight:48,fontWeight:'700',letterSpacing:-1.3,color:C.ink},meaning:{fontFamily:font,fontSize:18,lineHeight:29,fontWeight:'500',letterSpacing:-0.3,color:'#414F46'},explanation:{fontFamily:font,fontSize:14,lineHeight:24,letterSpacing:-0.15,color:'#627068'},
  section:{marginTop:30,gap:12},sectionHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},label:{fontFamily:font,fontSize:12,lineHeight:18,fontWeight:'700',color:C.ink},metadata:{fontFamily:font,fontSize:11,lineHeight:18,color:C.muted,flexShrink:1},quote:{borderLeftWidth:2,borderLeftColor:C.coral,paddingLeft:16,paddingVertical:4},quoteEnglish:{fontFamily:font,fontSize:19,lineHeight:30,fontWeight:'400',letterSpacing:-0.25,color:C.ink},
  example:{gap:8,paddingVertical:6},exampleSeparator:{borderTopWidth:1,borderTopColor:C.line,paddingTop:18,marginTop:6},exampleEnglish:{fontFamily:font,fontSize:18,lineHeight:29,fontWeight:'400',letterSpacing:-0.2,color:C.ink},exampleKorean:{fontFamily:font,fontSize:14,lineHeight:23,fontWeight:'400',letterSpacing:-0.2,color:C.muted},
});
