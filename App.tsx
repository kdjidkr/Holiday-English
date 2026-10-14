import { BottomTabs } from './src/components/BottomTabs';
import { createShiftBriefing } from './src/scenarios/dailyEvents';
import type { DailyEvent } from './src/scenarios/types';
import { useScreenHeight } from './src/components/useScreenHeight';
import { Journal } from './src/components/Journal';
import { appStyles as s } from './src/components/appStyles';
import React, { useEffect, useState } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import { ArrivalConversation } from './src/components/ArrivalConversation';
import { ShiftReview } from './src/components/ShiftReview';
import { SelectableDialogue } from './src/components/SelectableDialogue';
import { useExpressionSuggestions } from './src/core/useExpressionSuggestions';
import { useTranslation } from './src/core/useTranslation';
import { GameMenu } from './src/components/GameMenu';
import { CafeScene, CustomerPortrait } from './src/components/CafeScene';
import { useGameStore } from './src/store/gameStore';
import { useCafeGame } from './src/core/useCafeGame';
import { LearnedPattern } from './src/scenarios/types';
import { ShiftRecord } from './src/core/gameRules';

import { palette as C, ActionButton as Button } from './src/components/design';
export default function App() {
  const store = useGameStore();
  const game = useCafeGame();
  const g = game.state;
  const [englishVisible, setEnglishVisible] = useState(true);
  const translation = useTranslation(g.running ? g.line : '', store.translationEnabled, g.busy);
  const height = useScreenHeight();
  const compact = true;
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [replayArrival, setReplayArrival] = useState(false);
  const [input, setInput] = useState('');
  const [hint, setHint] = useState(false);
  const [book, setBook] = useState<'customers' | 'history' | 'vault' | null>(null);
  const [record, setRecord] = useState<ShiftRecord | null>(null);
  const [pattern, setPattern] = useState<LearnedPattern | null>(null);
  const [briefing,setBriefing]=useState<DailyEvent|null>(null);
  const beginShift=()=>{if(!briefing)return;setEnglishVisible(true);store.setTranslationEnabled(true);const event=briefing;setBriefing(null);game.start(store.voiceMode || 'live',event);};
  const [exitConfirm, setExitConfirm] = useState(false);
  const customer = g.customers[g.index];
  const regulars = Object.values(store.relationships).filter(r => r.status === 'REGULAR').length;
  const ready = !!customer && g.seconds >= g.prepSeconds && g.prepSeconds>0;
  const suggestions=useExpressionSuggestions({customerLine:g.line,recentDialogue:g.dialogue.slice(-6).map(turn=>({speaker:turn.speaker,text:turn.text})),order:customer?.preferredOrder.menuName || '',drinkReady:ready,briefing:g.event?.briefing || []},store.vaultPatterns,g.running && !g.busy && g.status==='ready' && g.phase==='CHATTING');
  const canTalk = !g.busy && g.status === 'ready' && g.phase === 'CHATTING';
  const sendInput = () => { if (!input.trim() || !canTalk) return; game.send(input); setInput(''); };
  useEffect(() => { setInput(''); setHint(false); }, [customer?.id]);
  const openBook = (tab: typeof book) => { setBook(tab); setRecord(null); setPattern(null); };
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (store.hydrated && (!store.arrivalSeen || replayArrival)) {
    return <ArrivalConversation profile={store.userProfile} onComplete={draft => { store.completeOnboarding(draft); setReplayArrival(false); }} onCancel={store.arrivalSeen ? () => setReplayArrival(false) : undefined} />;
  }
  const relation = customer ? store.relationships[customer.id] : undefined;
  return <SafeAreaView style={s.safe}>
    <StatusBar barStyle="dark-content" />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.frame, { height: Platform.OS === 'web' ? height : undefined }, compact && s.mobileFrame]}>
      <View style={s.topbar}>
        <View style={s.brand}><Text style={s.brandSun}>✳</Text><Text style={s.brandName}>sunny side</Text></View>
        <GameMenu voiceMode={store.voiceMode || 'live'} onVoiceMode={!g.running?store.setVoiceMode:undefined} prepTimeSeconds={store.prepTimeSeconds || 0} onPrepTime={!g.running?store.setPrepTimeSeconds:undefined} soundEnabled={store.soundEnabled} onSoundChange={enabled => { void game.setSoundEnabled(enabled); }} onJournal={g.running ? () => openBook('vault') : undefined} onReplay={!g.running ? () => setReplayArrival(true) : undefined} onHint={g.running && g.phase === 'CHATTING' ? () => setHint(!hint) : undefined} onLeave={g.running ? () => setExitConfirm(true) : undefined} />
      </View>
      {!store.hydrated ? <View style={s.loading}><Text style={s.subtitle}>카페 문을 여는 중…</Text></View> : <>
      {g.running && customer ? <>
        <View style={[s.stage,{height:keyboardOpen ? 104 : Math.max(150,Math.min(height*.29,250))}]}>
          <CafeScene customer={customer} phase={g.phase} talking={g.talking} ready={ready} weather={g.event?.weather} gender={store.userProfile.gender} />
          <View style={s.dayPill}><Text style={s.dayText}>DAY {store.currentShiftDay} · {g.index+1} / 3</Text></View>
          {relation?.status === 'REGULAR' && <View style={s.friendPill}><Text style={s.dayText}>♥ 단골</Text></View>}
        </View>
        <View style={s.orderBar}><Text style={s.orderIcon}>☕</Text><Text numberOfLines={1} style={s.orderLabel}>{customer.preferredOrder.menuName}</Text><Text style={s.orderStatus}>{['FAREWELL','DEPARTING'].includes(g.phase) ? '전달 완료' : ready ? '준비 완료' : ['ARRIVING','ORDERING','AWAITING_ORDER'].includes(g.phase)?'주문 확인':`${Math.max(0,g.prepSeconds-g.seconds)}초`}</Text></View>
        <View style={s.conversationHeader}>
          <View style={{flex:1}}><Text style={s.speaker}>{customer.name}</Text><Text style={s.speakerMeta}>{g.status !== 'ready' ? '연결하고 있어요' : g.talking || g.busy ? '이야기하는 중' : g.recording ? '듣고 있어요' : g.phase==='AWAITING_ORDER'?'주문을 확인해 주세요':'당신의 차례예요'}</Text></View>
          <View style={s.languageOptions}>{[{label:'EN',name:'영어',enabled:englishVisible,toggle:()=>setEnglishVisible(!englishVisible)},{label:'한',name:'한국어',enabled:store.translationEnabled,toggle:()=>store.setTranslationEnabled(!store.translationEnabled)}].map(option=><Pressable key={option.name} accessibilityRole="switch" accessibilityLabel={`${option.name} 대사 보기`} accessibilityState={{checked:option.enabled}} onPress={option.toggle} style={[s.languageOption,option.enabled && s.languageActive]}><Text style={[s.languageText,!option.enabled && {color:C.muted}]}>{option.label}{option.enabled?' ✓':''}</Text></Pressable>)}</View>
        </View>
        <ScrollView style={{flex:1}} contentContainerStyle={s.dialogueContent} keyboardShouldPersistTaps="handled">
          {englishVisible && <SelectableDialogue onSelectionChange={game.setSelectionOpen} preserveSelection={g.phase==='FAREWELL' || g.phase==='DEPARTING'} day={store.currentShiftDay} speaker={customer.name} text={g.line || (g.status === 'connecting' ? '손님을 맞이하고 있어요…' : '…')} />}
          {store.translationEnabled && <View style={{marginTop:10}}><Text style={s.translation}>{translation.text || (translation.loading?'뜻을 옮기고 있어요…':'')}</Text>{!!translation.error && <Text style={s.errorText}>{translation.error}</Text>}</View>}
          {!!g.error && <View style={s.errorRow}><Text style={s.errorText}>{g.error}</Text>{g.status==='error' && <Button small secondary onPress={game.switchToPractice}>대화 이어가기</Button>}{g.mode !== 'practice' && g.status === 'ready' && g.error.includes('소리') && <Button small onPress={() => { void game.enableSound(); }}>목소리 듣기</Button>}{(g.stalled || g.status === 'error') && ['SERVE_QUEUED', 'FAREWELL'].includes(g.phase) && <Button small secondary onPress={game.depart}>직접 배웅하기</Button>}</View>}
          {hint && g.phase === 'CHATTING' && <View style={s.hintBox}><Text style={s.hintText}>{g.event?.hintKorean.replace('💡 스몰토크 힌트: ', '')}</Text><Pressable accessibilityRole="button" disabled={!canTalk} onPress={() => { game.send(g.event!.suggestedOpening); setHint(false); }} style={{minHeight:48,justifyContent:'center'}}><Text style={s.hintEnglish}>{g.event?.suggestedOpening} ↗</Text></Pressable></View>}
          {!!g.transcript && <Text style={s.transcript}>{g.transcript}</Text>}
        </ScrollView>
        <View style={s.replyDock}>
          {g.phase==='AWAITING_ORDER' && <Button onPress={game.acceptOrder}>주문 받기</Button>}
          {ready && g.phase==='CHATTING' && <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingBottom:10}}>
            <Text style={{flex:1,fontSize:14,fontWeight:'600',color:C.ink}}>커피가 준비됐어요</Text>
            {g.finalSeconds!==null && <View accessible accessibilityLabel={`마지막으로 말할 시간 ${g.finalSeconds}초`} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}>
              <Svg width={44} height={44} style={{position:'absolute'}}><Circle cx={22} cy={22} r={18} stroke={C.muted} strokeOpacity={0.18} strokeWidth={3} fill="none"/><Circle cx={22} cy={22} r={18} stroke={C.coral} strokeWidth={3} fill="none" strokeDasharray={`${2*Math.PI*18}`} strokeDashoffset={2*Math.PI*18*(1-g.finalSeconds/20)} rotation={-90} origin="22,22" strokeLinecap="round"/></Svg>
              <Text style={{fontSize:14,fontWeight:'600',color:C.ink}}>{g.finalSeconds}</Text>
            </View>}
          </View>}
          {g.phase==='FAREWELL' && g.stalled && <Button secondary onPress={game.depart}>배웅하기</Button>}
          {!!suggestions.length && <View style={{gap:5,paddingBottom:10}}>{suggestions.map(item=><View key={item.id} style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{item.day!=null && <Text style={{fontSize:10,color:C.muted,backgroundColor:C.mint,borderRadius:5,paddingHorizontal:5,paddingVertical:2}}>[{item.day}일차]</Text>}<Text selectable style={{fontSize:13,fontWeight:'600',color:C.ink}}>{item.english}</Text><Text style={{fontSize:12,color:C.muted}}>· {item.meaning}</Text></View>)}</View>}
          {g.phase==='CHATTING' && <View style={s.inputRow}>
            <TextInput accessibilityLabel="손님에게 할 말" editable={canTalk} style={s.field} value={input} onChangeText={setInput} onFocus={()=>setKeyboardOpen(true)} onBlur={()=>setKeyboardOpen(false)} placeholder={g.busy ? '손님의 이야기를 듣는 중…' : '내 대답…'} placeholderTextColor={C.muted} onSubmitEditing={sendInput} />
            <Pressable accessibilityRole="button" accessibilityLabel={g.recording?'녹음 마치기':'마이크로 말하기'} disabled={!canTalk && !g.recording} onPress={game.voice} style={[s.micButton,{opacity:canTalk || g.recording?1:.4}]}><Svg width={23} height={23} viewBox="0 0 24 24">{g.recording ? <Rect x="5" y="5" width="14" height="14" rx="3" fill={C.coral} /> : <><Rect x="9" y="2" width="6" height="13" rx="3" fill={C.ink} /><Path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" stroke={C.ink} strokeWidth="2" fill="none" strokeLinecap="round" /></>}</Svg></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="답하기" disabled={!canTalk || !input.trim()} onPress={sendInput} style={[s.sendButton,{opacity:canTalk && input.trim()?1:.35}]}><Text style={{fontSize:24,color:C.paper}}>↑</Text></Pressable>
          </View>}
        </View>
      </> : g.summary ? <>
        <ScrollView contentContainerStyle={s.summaryContent}>
          <Text style={s.panelEyebrow}>DAY {g.summary.day} · 영업 끝</Text><Text style={s.heading}>오늘도 잘했어요.</Text>
          <View style={s.resultRow}>{g.summary.sessions.map(session=><View key={session.customer.id} style={s.resultPerson}><CustomerPortrait customer={session.customer} size={62}/><Text style={s.customerName}>{session.customer.name}</Text><Text style={s.tiny}>{g.summary!.newRegularIds.includes(session.customer.id)?'새 단골 ♥':'또 만나요'}</Text></View>)}</View>
          <ShiftReview record={g.summary}/>
          <Pressable accessibilityRole="button" onPress={()=>{openBook('history');setRecord(g.summary);}} style={s.textAction}><Text style={s.subLink}>오늘의 대화 다시 읽기 ↗</Text></Pressable>
        </ScrollView>
        <View style={s.bottomAction}><Button onPress={game.clearSummary}>카페로 돌아가기</Button></View>
      </> : <>
        <ScrollView style={{flex:1}} contentContainerStyle={{flexGrow:1}}>
          <View style={s.homeHeading}><Text style={s.panelEyebrow}>브리즈번 · DAY {store.currentShiftDay}</Text><Text style={s.heroTitle}>{store.userProfile.englishNameAlphabet},<Text>{'\n'}오늘도 좋은 아침!</Text></Text></View>
          <View style={{height:Math.max(220,Math.min(height*.34,330)),marginHorizontal:16,borderRadius:32,overflow:'hidden'}}><CafeScene home gender={store.userProfile.gender}/></View>
          <View style={s.homeCaption}><Text style={s.subtitle}>커피 한 잔, 작은 이야기 하나.</Text><Pressable accessibilityRole="button" accessibilityLabel="단골 손님 보기" onPress={()=>openBook('customers')} style={s.regularLink}><Text style={s.regularText}>♥ 단골 {regulars}/20</Text></Pressable></View>
          <View style={s.homeActions}><Button onPress={()=>setBriefing(createShiftBriefing(store.currentShiftDay))}>카페 문 열기 →</Button></View>
        </ScrollView>
        <BottomTabs active="work" onWork={()=>setBook(null)} onNotes={()=>openBook('vault')} />
      </>}
      </>}
      {!!store.saveError && <Text style={s.saveError}>{store.saveError}</Text>}
    </KeyboardAvoidingView>
    <Journal footer={book==='vault' && !g.running?<BottomTabs active="notes" onWork={()=>setBook(null)} onNotes={()=>openBook('vault')} />:undefined} book={book} setBook={setBook} record={record} setRecord={setRecord} pattern={pattern} setPattern={setPattern} />
    <Modal visible={!!briefing} transparent animationType="fade" onRequestClose={()=>setBriefing(null)}>
      <View style={s.briefingShade}>
        <View style={s.briefingCard}>
          <View style={s.briefingHeader}>
            <View style={{flex:1}}>
              <Text style={s.briefingDay}>DAY {store.currentShiftDay}</Text>
              <Text accessibilityRole="header" style={s.briefingTitle}>오늘의 브리핑</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="브리핑 취소" onPress={()=>setBriefing(null)} style={s.briefingClose}>
              <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={C.ink} strokeWidth={2} strokeLinecap="round"/></Svg>
            </Pressable>
          </View>
          <ScrollView style={{flexShrink:1}} contentContainerStyle={s.briefingList}>
            {briefing?.briefing?.map((item,index)=><View key={`${index}-${item}`} style={s.briefingItem}>
              <View style={[s.briefingIcon,{backgroundColor:['#F8E9C8','#E3EDE4','#E9E5F1'][index%3]}]}>
                <Svg width={22} height={22} viewBox="0 0 24 24">
                  {index===0 ? briefing.weather==='rainy' ? <Path d="M6 15a4 4 0 010-8 6 6 0 0111-1 4.5 4.5 0 011 9M7 18l-1 3m6-3l-1 3m6-3l-1 3" stroke={C.ink} strokeWidth={1.6} fill="none" strokeLinecap="round"/> : <><Circle cx={12} cy={12} r={4} stroke={C.ink} strokeWidth={1.6} fill="none"/><Path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19" stroke={C.ink} strokeWidth={1.6} strokeLinecap="round"/></> : index===1 ? <><Rect x={4} y={5} width={16} height={16} rx={3} stroke={C.ink} strokeWidth={1.6} fill="none"/><Path d="M8 3v4m8-4v4M4 11h16m-11 5h6" stroke={C.ink} strokeWidth={1.6} strokeLinecap="round"/></> : <><Path d="M4 5h16v14H4zM8 9h8m-8 4h8m-8 3h5" stroke={C.ink} strokeWidth={1.6} fill="none" strokeLinejoin="round" strokeLinecap="round"/></>}
                </Svg>
              </View>
              <View style={{flex:1,minWidth:0,gap:4}}><Text style={s.briefingLabel}>{['날씨','오늘','동네 소식'][index] || '소식'}</Text><Text style={s.briefingBody}>{item}</Text></View>
            </View>)}
          </ScrollView>
          <View style={s.briefingFooter}><Pressable accessibilityRole="button" onPress={beginShift} style={({pressed})=>[s.briefingStart,pressed && {opacity:0.85}]}><Text style={s.briefingStartText}>출근하기!</Text><Text style={s.briefingStartArrow}>→</Text></Pressable></View>
        </View>
      </View>
    </Modal>
    <Modal visible={exitConfirm} transparent animationType="fade" onRequestClose={() => setExitConfirm(false)}><View style={s.modalShade}><View style={s.confirm}><Text style={s.heading}>오늘 근무를 멈출까요?</Text><Text style={s.subtitle}>이번 근무는 결산 전이라 저장되지 않습니다.{ '\n' }이전 근무와 단골 기록은 남아 있어요.</Text><View style={s.actionRow}><Button secondary onPress={() => setExitConfirm(false)}>계속 이야기하기</Button><Button onPress={() => {game.leave();setExitConfirm(false);}}>카페 나가기</Button></View></View></View></Modal>
  </SafeAreaView>;
}
