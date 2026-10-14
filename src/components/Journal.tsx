import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Flashcards } from './Flashcards';
import { classifyNote, noteDays } from '../core/flashcards';
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
 const [vaultFilter,setVaultFilter]=useState<'word'|'phrase'|'sentence'>('word');
 const [vaultDay,setVaultDay]=useState<number|null>(null);
 const [flashcards,setFlashcards]=useState(false);
 useEffect(()=>{if(book!=='vault')setFlashcards(false);},[book]);
 const days=useMemo(()=>noteDays(store.vaultPatterns),[store.vaultPatterns]);
 const filteredVault=useMemo(()=>store.vaultPatterns.filter(item=>classifyNote(item)===vaultFilter && (vaultDay===null || item.shiftDay===vaultDay)).sort((a,b)=>Number(!!b.starred)-Number(!!a.starred)),[store.vaultPatterns,vaultFilter,vaultDay]);
 return (
    <Modal visible={!!book} transparent animationType="fade" onRequestClose={() => flashcards?setFlashcards(false):setBook(null)}><View style={s.modalShade}><View style={[s.notebook, {width:'100%', maxHeight:footer?'100%':'94%',height:footer?'100%':flashcards?'94%':undefined, padding:20,borderTopLeftRadius:footer?0:28,borderTopRightRadius:footer?0:28}]}>
      <View style={s.panelHeader}><Text style={s.panelEyebrow}>{footer?'표현노트':'나의 카페 수첩'}</Text>{!footer && <Pressable accessibilityRole="button" accessibilityLabel="수첩 닫기" onPress={() => setBook(null)}><Text style={s.close}>×</Text></Pressable>}</View>
      {!footer && <View style={s.tabs}>{([{id:'customers',label:'만난 얼굴'},{id:'history',label:'대화 기록'},{id:'vault',label:'표현노트'}] as const).map(t => <Pressable accessibilityRole="tab" accessibilityState={{selected:book===t.id}} key={t.id} onPress={() => {setBook(t.id);setRecord(null);setPattern(null);}} style={[s.tab, book === t.id && s.activeTab]}><Text style={s.tabText}>{t.label}</Text></Pressable>)}</View>}
      {flashcards && book==='vault' ? <Flashcards notes={store.vaultPatterns} onClose={()=>setFlashcards(false)} /> : <ScrollView ref={bookScroll} contentContainerStyle={{paddingBottom:20}}>
        {pattern ? <><Pressable onPress={() => setPattern(null)}><Text style={s.subLink}>← 목록으로</Text></Pressable><Text style={s.heading}>{pattern.koreanMeaning}</Text><Text style={s.patternTemplate}>{pattern.englishTemplate}</Text>{pattern.expressionKind && <Text style={s.tiny}>{pattern.expressionKind === 'phrase' ? '문맥 속 표현' : '문맥 속 단어'}</Text>}{pattern.explanation && <Text style={s.subtitle}>{pattern.explanation}</Text>}{pattern.selectedText && <Text style={s.tiny}>선택한 말 · {pattern.selectedText}</Text>}{pattern.sourceQuote && <View style={s.hintBox}><Text style={s.tiny}>DAY {pattern.shiftDay} · {pattern.sourceSpeaker ? `${pattern.sourceSpeaker}의 대사` : '내가 했던 말'}</Text><Text style={s.logText}>“{pattern.sourceQuote}”</Text></View>}{pattern.slotExamples.map(x => <Text key={x} style={s.example}>{x}</Text>)}</> : record ? <><Pressable onPress={() => setRecord(null)}><Text style={s.subLink}>← 근무 일지</Text></Pressable><Text style={s.heading}>Day {record.day} · 오늘의 목소리</Text><Text style={s.subtitle}>{record.eventTitle}</Text>{record.sessions.map(session => <View key={session.customer.id} style={s.sessionCard}><View style={s.speakerRow}><CustomerPortrait customer={session.customer} size={44} /><Text style={s.customerName}>{session.customer.name}</Text></View>{session.dialogue.map((turn,i) => <View key={i} style={[s.logLine,turn.speaker === 'user' && s.userLog]}><Text style={s.logSpeaker}>{turn.speaker === 'user' ? store.userProfile.englishNameAlphabet : session.customer.name}{turn.rescue ? ' · 도움 요청' : turn.assisted ? ' · 추천 인사' : ''}</Text><Text style={s.logText}>{turn.text}</Text></View>)}{!session.dialogue.length && <Text style={s.tiny}>기록된 대화가 없습니다.</Text>}</View>)}<ShiftReview record={record} /></> : book === 'customers' ? <><Text style={s.heading}>익숙해지는 얼굴들.</Text><Text style={s.subtitle}>커피 한 잔으로 시작된 인연이에요.</Text><View style={s.customerGrid}>{BRISBANE_CUSTOMERS.map(c => { const r = store.relationships[c.id]; return <View key={c.id} style={[s.customerCard, !r && {opacity:.5}]}><CustomerPortrait customer={c} size={65} /><Text style={s.customerName}>{r ? c.name : '???'}</Text><Text style={s.tiny}>{r?.status === 'REGULAR' ? '♥ 단골' : r?.status === 'FRIEND' ? '✦ 친구' : r ? '✧ 만난 손님' : '아직 만나지 못했어요'}</Text>{r && <Text style={s.tiny}>{r.visits}번의 만남</Text>}</View>; })}</View></> : book === 'history' ? <><Text style={s.heading}>작은 대화가 쌓이는 곳.</Text>{!store.shiftHistory.length && <Text style={s.subtitle}>첫 근무를 마치면 실제 대화가 여기에 남습니다.</Text>}{store.shiftHistory.map(r => <Pressable key={r.id} onPress={() => setRecord(r)} style={s.patternCard}><Text style={s.customerName}>DAY {r.day} · {r.sessions.map(x => x.customer.name).join(', ')} ↗</Text><Text style={s.subtitle}>{r.eventTitle}</Text></Pressable>)}</> : <><Text style={s.heading}>다음에 꺼내 쓸 한마디.</Text>
          <Pressable accessibilityRole="button" onPress={()=>setFlashcards(true)} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:16,borderRadius:18,backgroundColor:C.mint,marginVertical:8,minHeight:60}}><View style={{flex:1,gap:4}}><Text style={{fontSize:15,fontWeight:'700',color:C.ink}}>플래시카드</Text><Text style={{fontSize:12,color:C.muted}}>뜻을 보고 뒤집어 확인하기</Text></View><Text style={{fontSize:22,color:C.ink}}>→</Text></Pressable>
          <View accessibilityRole="tablist" style={{flexDirection:'row',padding:4,marginTop:8,marginBottom:12,borderRadius:16,backgroundColor:C.cream}}>
            {([{id:'word',label:'단어'},{id:'phrase',label:'표현'},{id:'sentence',label:'문장'}] as const).map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:vaultFilter===item.id}} onPress={()=>setVaultFilter(item.id)} style={{flex:1,minHeight:44,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:vaultFilter===item.id?C.paper:'transparent'}}><Text style={{fontSize:13,fontWeight:'700',color:vaultFilter===item.id?C.ink:C.muted}}>{item.label}</Text></Pressable>)}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingBottom:12}} accessibilityLabel="Day별 조회">
            {[null,...days].map(day=><Pressable key={day===null?'all':day} accessibilityRole="button" accessibilityState={{selected:vaultDay===day}} onPress={()=>setVaultDay(day)} style={{minHeight:44,paddingHorizontal:16,borderRadius:14,justifyContent:'center',backgroundColor:vaultDay===day?C.ink:C.cream}}><Text style={{fontSize:13,fontWeight:'600',color:vaultDay===day?C.paper:C.ink}}>{day===null?'전체 Day':`${day}일차`}</Text></Pressable>)}
          </ScrollView>
          {filteredVault.length ? filteredVault.map(p=><View key={p.id} style={[s.patternCard,{flexDirection:'row',alignItems:'flex-start',gap:8}]}><Pressable accessibilityRole="button" onPress={()=>setPattern(p)} style={{flex:1}}><Text style={s.vaultEnglish}>{p.englishTemplate}</Text><Text style={s.subtitle}>{p.koreanMeaning}</Text><Text style={s.tiny}>DAY {p.shiftDay}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${p.englishTemplate} 별표 ${p.starred?'해제':'추가'}`} accessibilityState={{selected:!!p.starred}} onPress={()=>store.togglePatternStar(p.id)} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:26,color:p.starred?C.coral:C.muted}}>{p.starred?'★':'☆'}</Text></Pressable></View>) : <Text style={s.subtitle}>{store.vaultPatterns.length?'선택한 분류와 Day에 저장된 항목이 없어요.':'대화에서 궁금한 표현을 선택하거나, 하루를 마친 뒤 마음에 드는 표현을 저장해 보세요.'}</Text>}</>}
      </ScrollView>}
      {footer}
    </View></View></Modal>
 );
}
