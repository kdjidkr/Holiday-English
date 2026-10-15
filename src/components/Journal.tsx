import {VocabularyTest} from './VocabularyTest';
import {entryDays,normalizeEntry} from '../core/vaultDictionary';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DayPicker } from './DayPicker';
import { NoteDetail } from './NoteDetail';
import { Flashcards } from './Flashcards';
import { classifyNote, noteDays, NOTE_KINDS, NoteKind } from '../core/flashcards';
import { palette as C } from './design';
import { CustomerPortrait } from './CafeScene';
import { ShiftReview } from './ShiftReview';
import { useGameStore } from '../store/gameStore';
import { BRISBANE_CUSTOMERS } from '../scenarios/customers';
import { LearnedPattern } from '../scenarios/types';
import { ShiftRecord } from '../core/gameRules';
import { appStyles as s } from './appStyles';
type Book = 'customers' | 'history' | 'vault' | null;
export function Journal({book,setBook,record,setRecord,pattern,setPattern,footer}: {
  footer?:React.ReactNode;
  book:Book; setBook:(value:Book)=>void;
  record:ShiftRecord|null; setRecord:(value:ShiftRecord|null)=>void;
  pattern:LearnedPattern|null; setPattern:(value:LearnedPattern|null)=>void;
}) {
 const store=useGameStore();
 const bookScroll=useRef<ScrollView>(null);
 const [vaultFilter,setVaultFilter]=useState<NoteKind>('word');
 const [vaultDay,setVaultDay]=useState<number|null>(null);
 const [dayPicker,setDayPicker]=useState(false);
 const [flashcards,setFlashcards]=useState(false);
 const [testing,setTesting]=useState(false);
 useEffect(()=>{if(book!=='vault'){setTesting(false);setFlashcards(false);setDayPicker(false);}},[book]);
 const days=useMemo(()=>noteDays(store.vaultPatterns),[store.vaultPatterns]);
 const filteredVault=useMemo(()=>store.vaultPatterns.filter(item=>classifyNote(item)===vaultFilter && (vaultDay===null || entryDays(item).includes(vaultDay))).sort((a,b)=>Number(!!b.starred)-Number(!!a.starred)),[store.vaultPatterns,vaultFilter,vaultDay]);
 const vaultGroups=useMemo(()=>{
   const groups=new Map<string,LearnedPattern[]>();
   filteredVault.forEach(note=>{const key=normalizeEntry(note.englishTemplate);groups.set(key,[...(groups.get(key) || []),note]);});
   return [...groups.values()];
 },[filteredVault]);
 const dayLabel=(note:LearnedPattern)=>{const days=entryDays(note);return days.length<=2?days.map(day=>`${day}일차`).join(' · '):`${days[0]}일차 외 ${days.length-1}일`;};
 return (
    <Modal visible={!!book} transparent animationType="fade" onRequestClose={() => testing?setTesting(false):flashcards?setFlashcards(false):setBook(null)}><View style={s.modalShade}><View style={[s.notebook, {width:'100%', maxHeight:footer?'100%':'94%',height:footer?'100%':flashcards || testing?'94%':undefined, padding:20,borderTopLeftRadius:footer?0:28,borderTopRightRadius:footer?0:28}]}>
      {!((flashcards || testing) && footer) && <View style={[s.panelHeader,{minHeight:44,marginBottom:16}]}>
        {book==='vault' && !pattern && !flashcards && !testing ? <><Text accessibilityRole="header" style={{fontSize:24,lineHeight:32,fontWeight:'700',letterSpacing:-0.7,color:C.ink}}>표현노트</Text><View style={{flexDirection:'row',gap:8}}><Pressable accessibilityRole="button" onPress={()=>setTesting(true)} style={{minHeight:44,paddingHorizontal:12,borderRadius:12,backgroundColor:C.ink,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:12,fontWeight:'600',color:C.paper}}>테스트</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>setFlashcards(true)} style={{minHeight:44,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:12,fontWeight:'600',color:C.ink}}>플래시카드</Text></Pressable></View></> : <Text style={s.panelEyebrow}>{footer?'표현노트':'나의 카페 수첩'}</Text>}
        {!footer && <Pressable accessibilityRole="button" accessibilityLabel="수첩 닫기" onPress={() => setBook(null)}><Text style={s.close}>×</Text></Pressable>}
      </View>}
      {!footer && <View style={s.tabs}>{([{id:'customers',label:'만난 얼굴'},{id:'history',label:'대화 기록'},{id:'vault',label:'표현노트'}] as const).map(t => <Pressable accessibilityRole="tab" accessibilityState={{selected:book===t.id}} key={t.id} onPress={() => {setBook(t.id);setRecord(null);setPattern(null);}} style={[s.tab, book === t.id && s.activeTab]}><Text style={s.tabText}>{t.label}</Text></Pressable>)}</View>}
      {testing && book==='vault' ? <VocabularyTest initialKind={vaultFilter} notes={store.vaultPatterns} onClose={()=>setTesting(false)}/> : flashcards && book==='vault' ? <Flashcards initialKind={vaultFilter} notes={store.vaultPatterns} onClose={()=>setFlashcards(false)} /> : <ScrollView ref={bookScroll} contentContainerStyle={{paddingBottom:20}}>
        {pattern ? <NoteDetail note={store.vaultPatterns.find(item=>item.id===pattern.id) || pattern} onBack={()=>{setPattern(null);bookScroll.current?.scrollTo({y:0,animated:false});}} onStar={()=>store.togglePatternStar(pattern.id)} senses={store.vaultPatterns.filter(item=>classifyNote(item)===classifyNote(pattern) && normalizeEntry(item.englishTemplate)===normalizeEntry(pattern.englishTemplate))} onSense={setPattern} /> : record ? <><Pressable onPress={() => setRecord(null)}><Text style={s.subLink}>← 근무 일지</Text></Pressable><Text style={s.heading}>Day {record.day} · 오늘의 목소리</Text><Text style={s.subtitle}>{record.eventTitle}</Text>{record.sessions.map(session => <View key={session.customer.id} style={s.sessionCard}><View style={s.speakerRow}><CustomerPortrait customer={session.customer} size={44} /><Text style={s.customerName}>{session.customer.name}</Text></View>{session.dialogue.map((turn,i) => <View key={i} style={[s.logLine,turn.speaker === 'user' && s.userLog]}><Text style={s.logSpeaker}>{turn.speaker === 'user' ? store.userProfile.englishNameAlphabet : session.customer.name}{turn.rescue ? ' · 도움 요청' : turn.assisted ? ' · 추천 인사' : ''}</Text><Text style={s.logText}>{turn.text}</Text></View>)}{!session.dialogue.length && <Text style={s.tiny}>기록된 대화가 없습니다.</Text>}</View>)}<ShiftReview record={record} /></> : book === 'customers' ? <><Text style={s.heading}>익숙해지는 얼굴들.</Text><Text style={s.subtitle}>커피 한 잔으로 시작된 인연이에요.</Text><View style={s.customerGrid}>{BRISBANE_CUSTOMERS.map(c => { const r = store.relationships[c.id]; return <View key={c.id} style={[s.customerCard, !r && {opacity:.5}]}><CustomerPortrait customer={c} size={65} /><Text style={s.customerName}>{r ? c.name : '???'}</Text><Text style={s.tiny}>{r?.status === 'REGULAR' ? '♥ 단골' : r?.status === 'FRIEND' ? '✦ 친구' : r ? '✧ 만난 손님' : '아직 만나지 못했어요'}</Text>{r && <Text style={s.tiny}>{r.visits}번의 만남</Text>}</View>; })}</View></> : book === 'history' ? <><Text style={s.heading}>작은 대화가 쌓이는 곳.</Text>{!store.shiftHistory.length && <Text style={s.subtitle}>첫 근무를 마치면 실제 대화가 여기에 남습니다.</Text>}{store.shiftHistory.map(r => <Pressable key={r.id} onPress={() => setRecord(r)} style={s.patternCard}><Text style={s.customerName}>DAY {r.day} · {r.sessions.map(x => x.customer.name).join(', ')} ↗</Text><Text style={s.subtitle}>{r.eventTitle}</Text></Pressable>)}</> : <>
          <View accessibilityRole="tablist" style={{flexDirection:'row',padding:4,marginTop:8,marginBottom:12,borderRadius:16,backgroundColor:C.cream}}>
            {NOTE_KINDS.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:vaultFilter===item.id}} onPress={()=>setVaultFilter(item.id)} style={{flex:1,minHeight:44,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:vaultFilter===item.id?C.paper:'transparent'}}><Text style={{fontSize:12,fontWeight:'700',color:vaultFilter===item.id?C.ink:C.muted}}>{item.label}</Text></Pressable>)}
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:4}}><Pressable accessibilityRole="button" accessibilityLabel="일차 선택" accessibilityState={{expanded:dayPicker}} onPress={()=>setDayPicker(true)} style={{minHeight:44,flexDirection:'row',gap:10,alignItems:'center',paddingHorizontal:4}}><Text style={{fontSize:13,fontWeight:'600',color:C.ink}}>{vaultDay===null?'전체 일차':`${vaultDay}일차`}</Text><Text style={{fontSize:13,color:C.muted}}>⌄</Text></Pressable><Text style={{fontSize:12,color:C.muted}}>{filteredVault.length}개</Text></View>
          {filteredVault.length ? vaultGroups.map(group=><View key={group[0].id} style={{paddingVertical:16,borderBottomWidth:1,borderBottomColor:C.line}}>
            <Pressable accessibilityRole="button" onPress={()=>{setPattern(group[0]);bookScroll.current?.scrollTo({y:0,animated:false});}} style={{minHeight:32,justifyContent:'center'}}><Text style={{fontSize:20,lineHeight:29,fontWeight:'600',letterSpacing:-0.4,color:C.ink}}>{group[0].englishTemplate}</Text></Pressable>
            {group.map((p,index)=><View key={p.id} style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:group.length>1?8:0}}><Pressable accessibilityRole="button" onPress={()=>{setPattern(p);bookScroll.current?.scrollTo({y:0,animated:false});}} style={{flex:1,minHeight:44,justifyContent:'center',gap:3}}><Text numberOfLines={2} style={{fontSize:14,lineHeight:22,color:C.muted}}>{group.length>1?`${index+1}. `:''}{p.koreanMeaning}</Text><Text style={{fontSize:10,color:C.muted}}>{dayLabel(p)}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${p.englishTemplate} ${p.koreanMeaning} 별표 ${p.starred?'해제':'추가'}`} accessibilityState={{selected:!!p.starred}} onPress={()=>store.togglePatternStar(p.id)} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:23,color:p.starred?C.coral:C.muted}}>{p.starred?'★':'☆'}</Text></Pressable></View>)}
          </View>) : <Text style={s.subtitle}>{store.vaultPatterns.length?'선택한 분류와 Day에 저장된 항목이 없어요.':'대화에서 궁금한 표현을 선택하거나, 하루를 마친 뒤 마음에 드는 표현을 저장해 보세요.'}</Text>}</>}
      </ScrollView>}
      <DayPicker visible={dayPicker && book==='vault'} days={days} value={vaultDay} onSelect={setVaultDay} onClose={()=>setDayPicker(false)} />
      {footer}
    </View></View></Modal>
 );
}
