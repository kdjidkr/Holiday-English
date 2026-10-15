import {InlineTestAnswer} from './InlineTestAnswer';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Keyboard,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {LearnedPattern} from '../scenarios/types';
import {NOTE_KINDS,NoteKind,noteDays,selectCards} from '../core/flashcards';
import {answerWords,initialTestSlots,fillSelectedAnswer,chooseTestNotes,revealNextLetter,enqueueTestRetry,ANSWER_FEEDBACK,classifyTestAnswer,TestAnswerCategory,TestSession,generateQuestion,matchesAnswer,questionSignature,TestOutcome,TestQuestion} from '../core/vocabularyTest';
import {useGameStore} from '../store/gameStore';
import {DayPicker} from './DayPicker';
import {palette as C} from './design';
type Feedback={outcome:TestOutcome;explanation:string};
export function VocabularyTest({notes,onClose,initialKind='word'}:{notes:LearnedPattern[];onClose:()=>void;initialKind?:NoteKind}){
  const store=useGameStore();
  const [kind,setKind]=useState<NoteKind>(initialKind),[selectedDays,setSelectedDays]=useState<number[]|null>(null),[picker,setPicker]=useState(false);
  const days=useMemo(()=>noteDays(notes),[notes]),chosenDays=selectedDays ?? days;
  const eligible=selectCards(notes,[kind],chosenDays);
  const [session,setSession]=useState<TestSession|null>(null);
  const [results,setResults]=useState<Record<string,TestOutcome>>({});
  const [completedIds,setCompletedIds]=useState<string[]>([]);
  const [question,setQuestion]=useState<TestQuestion|null>(null),[loading,setLoading]=useState(false),[checking,setChecking]=useState(false),[error,setError]=useState('');
  const [feedback,setFeedback]=useState<Feedback|null>(null),[attempt,setAttempt]=useState(0);
  const [slots,setSlots]=useState<{active:number;solved:boolean[];drafts:string[]}>({active:0,solved:[],drafts:[]});
  const slotsRef=useRef(slots);
  const updateSlots=(next:typeof slots)=>{slotsRef.current=next;setSlots(next);};
  const answer=slots.drafts[slots.active] || '';
  const setAnswer=(value:string)=>{const current=slotsRef.current,drafts=[...current.drafts];drafts[current.active]=value;updateSlots({...current,drafts});};
  const [revealed,setRevealed]=useState<number[]>([]);
  const [verdict,setVerdict]=useState<TestAnswerCategory|null>(null);
  const hadMistake=useRef(false),assistedRef=useRef(false),hintUses=useRef(0);
  const epoch=useRef(0),request=useRef<AbortController|null>(null),settled=useRef(false),busy=useRef(false);
  const note=session && !session.done?session.notes[session.index]:undefined;
  const signature=note?questionSignature(note):'';
  useEffect(()=>{
    const revision=++epoch.current;request.current?.abort();busy.current=false;settled.current=false;
    hadMistake.current=false;assistedRef.current=false;hintUses.current=0;setRevealed([]);setVerdict(null);updateSlots({active:0,solved:[],drafts:[]});setQuestion(null);setAnswer('');setFeedback(null);setError('');setChecking(false);
    if(!note){setLoading(false);return;}
    const cached=useGameStore.getState().testQuestions[note.id];
    if(cached?.signature===signature){setQuestion(cached);updateSlots(initialTestSlots(cached));setLoading(false);return;}
    const controller=new AbortController();request.current=controller;setLoading(true);
    const timer=setTimeout(()=>controller.abort(),20000);
    void generateQuestion(note,controller.signal).then(value=>{if(epoch.current!==revision)return;store.cacheTestQuestion(value);setQuestion(value);updateSlots(initialTestSlots(value));}).catch((cause:unknown)=>{if(epoch.current!==revision)return;const reason=controller.signal.aborted?'문제 준비 시간이 초과됐어요. 다시 시도해 주세요.':cause instanceof Error?cause.message:'문제 응답을 확인하지 못했어요.';console.warn('[vocabulary-test:question]',{kind:note.learningKind || note.expressionKind || 'sentence',reason});setError(reason);}).finally(()=>{clearTimeout(timer);if(epoch.current===revision)setLoading(false);});
    return()=>{controller.abort();epoch.current++;clearTimeout(timer);};
  },[note?.id,session?.index,signature,attempt]);
  useEffect(()=>()=>{epoch.current++;request.current?.abort();},[]);
  const commit=(value:Feedback)=>{
    if(!note || !question || settled.current)return;
    settled.current=true;Keyboard.dismiss();setFeedback(value);
    const outcome=hadMistake.current?'incorrect':value.outcome;
    if(outcome==='correct' && !assistedRef.current)setCompletedIds(previous=>previous.includes(note.id)?previous:[...previous,note.id]);
    setResults(previous=>previous[note.id]?previous:{...previous,[note.id]:outcome});
    store.recordTestAnswer(note.id,question.signature,outcome,assistedRef.current);
  };
  const revealHint=()=>{
    if(!question || settled.current)return;
    assistedRef.current=true;hintUses.current++;setAnswer('');
    setSession(previous=>previous?enqueueTestRetry(previous):previous);
    if(hintUses.current>=3){commit({outcome:'revealed',explanation:'정답을 확인하고, 뒤에서 다시 연습해요.'});return;}
    setRevealed(previous=>revealNextLetter(question.answer,slotsRef.current.active,previous));
  };
  const selectSlot=(index:number)=>{
    if(!question || busy.current || settled.current || index===slotsRef.current.active || slotsRef.current.solved[index] || index<0 || index>=answerWords(question.answer).length)return;
    updateSlots({...slotsRef.current,active:index});setVerdict(null);setError('');
  };
  const changeAnswer=(text:string)=>{
    if(!question || busy.current || settled.current)return;
    const current=slotsRef.current,result=fillSelectedAnswer(question.answer,current.solved,current.active,text),drafts=[...current.drafts];
    result.solved.forEach((matched,index)=>{if(matched)drafts[index]='';});
    if(result.activeIndex===current.active || result.input)drafts[result.activeIndex]=result.input;
    updateSlots({active:result.activeIndex,solved:result.solved,drafts});setError('');setVerdict(null);
    if(result.complete)commit({outcome:assistedRef.current?'assisted':'correct',explanation:assistedRef.current?'힌트를 보고 떠올렸어요. 다음에 한 번 더 연습해요.':'정확해요.'});
  };
  const submit=async()=>{
    if(!question || !answer.trim() || busy.current || settled.current)return;
    const current=slotsRef.current,submitted=answerWords(question.answer).map((word,index)=>current.solved[index]?word:current.drafts[index] || '').join(' ');
    if(matchesAnswer(submitted,question.answer)){updateSlots({...current,solved:answerWords(question.answer).map(()=>true),drafts:[]});commit({outcome:assistedRef.current?'assisted':'correct',explanation:assistedRef.current?'힌트를 보고 떠올렸어요. 다음에 한 번 더 연습해요.':'정확해요.'});return;}
    const revision=epoch.current,controller=new AbortController();request.current?.abort();request.current=controller;
    const timer=setTimeout(()=>controller.abort(),15000);busy.current=true;setChecking(true);setError('');
    try{const category=await classifyTestAnswer(question,answer,current.active,controller.signal,current.solved);if(epoch.current!==revision)return;setVerdict(category);if(category!=='equivalent')hadMistake.current=true;revealHint();}
    catch{if(epoch.current===revision)setError('답안 확인이 늦어지고 있어요. 다시 확인해 주세요.');}
    finally{clearTimeout(timer);if(epoch.current===revision){busy.current=false;setChecking(false);}}
  };
  const start=()=>{setResults({});setCompletedIds([]);const selected=chooseTestNotes(eligible,store.testProgress);setSession({notes:selected,index:0,done:false,initialCount:selected.length});};
  const next=()=>{if(!session)return;setSession({...session,index:session.index+1,done:session.index+1>=session.notes.length});};
  const finish=()=>{request.current?.abort();epoch.current++;Keyboard.dismiss();if(session)setSession({...session,done:true});};
  const scored=Object.values(results),correct=scored.filter(value=>value==='correct').length;
  const upcoming=note && store.testProgress[note.id]?.dueAt;
  return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,minHeight:0}}>
    {!session?.done && <View style={s.header}><Pressable accessibilityRole="button" onPress={onClose} style={s.textButton}><Text style={s.back}>← 표현노트</Text></Pressable>{session && <Pressable accessibilityRole="button" onPress={finish} style={s.textButton}><Text style={s.muted}>테스트 끝내기</Text></Pressable>}</View>}
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content,!!session && s.grow]}>
      {!session?<>
        <Text accessibilityRole="header" style={s.title}>테스트</Text>
        <View accessibilityRole="tablist" style={s.tabs}>{NOTE_KINDS.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:kind===item.id}} onPress={()=>setKind(item.id)} style={[s.tab,kind===item.id && {backgroundColor:C.paper}]}><Text style={{fontSize:12,fontWeight:'600',color:kind===item.id?C.ink:C.muted}}>{item.label}</Text></Pressable>)}</View>
        <View style={s.row}><Pressable accessibilityRole="button" accessibilityLabel="테스트 일차 선택" onPress={()=>setPicker(true)} style={s.textButton}><Text style={s.back}>{days.length>0 && days.every(day=>chosenDays.includes(day))?'전체 일차':chosenDays.length===1?`${chosenDays[0]}일차`:`${chosenDays.length}개 일차`}  ⌄</Text></Pressable><Text style={s.muted}>{eligible.length}개</Text></View>
        <Text style={s.description}>{eligible.length?'한국어 뜻을 보고 영어로 답해 보세요. 복습할 항목부터 최대 10문제를 준비해요.':'선택한 범위에 저장된 항목이 없어요.'}</Text>
      </>:session.done?<View style={s.complete}><View style={s.checkCircle}><Text style={{fontSize:28,color:C.ink}}>✓</Text></View><Text accessibilityRole="header" style={s.title}>테스트 완료</Text><Text style={s.description}>{scored.length}문제를 풀었어요.</Text>{!!scored.length && <Text style={s.muted}>목표 표현을 힌트 없이 떠올린 문제 {correct}개</Text>}</View>:<>
        <View style={s.row}><Text style={s.back}>테스트 · {NOTE_KINDS.find(item=>item.id===kind)?.label}{session.index>=session.initialCount?' · 다시 보기':''}</Text><Text style={s.muted}>{completedIds.length} / {session.initialCount}</Text></View>
        <View style={s.track}><View style={[s.bar,{width:`${completedIds.length/Math.max(1,session.initialCount)*100}%`}]}/></View>
        {loading?<View style={s.loading}><ActivityIndicator color={C.coral}/><Text style={s.description}>문제를 준비하고 있어요…</Text></View>:question?<View style={[s.question,feedback && {borderColor:feedback.outcome==='correct' || feedback.outcome==='assisted'? '#AEC5A1':C.line}]}>
          <Text style={s.caption}>영어로 어떻게 말할까요?</Text><Text style={s.korean}>{question.korean}</Text>
          <View style={s.divider}/>
          <InlineTestAnswer question={question} solved={slots.solved} activeIndex={slots.active} drafts={slots.drafts} onSelect={selectSlot} revealed={revealed} value={answer} disabled={checking} complete={!!feedback} onChange={changeAnswer} onSubmit={()=>{void submit();}}/>
          {!!verdict && !feedback && <Text accessibilityLiveRegion="polite" style={{fontSize:14,lineHeight:23,color:ANSWER_FEEDBACK[verdict].color,fontWeight:'600'}}>{ANSWER_FEEDBACK[verdict].text}</Text>}
          {feedback && <View accessibilityLiveRegion="polite" style={s.feedback}><Text style={s.feedbackTitle}>{feedback.outcome==='correct'?'정답이에요':feedback.outcome==='assisted'?'잘 떠올렸어요':feedback.outcome==='alternative'?'이 답도 자연스러워요':feedback.outcome==='revealed'?'정답을 확인했어요':'이 표현을 기억해 보세요'}</Text><Text style={s.description}>{feedback.explanation}</Text>{feedback.outcome==='alternative' && <Text style={s.muted}>위 문장은 이번에 연습할 목표 표현이에요.</Text>}{!!upcoming && <Text style={s.muted}>{Math.max(0,Math.round((upcoming-Date.now())/86400000))>=1?`${Math.max(1,Math.round((upcoming-Date.now())/86400000))}일 뒤 복습`:'잠시 후 다시 복습'}</Text>}</View>}
        </View>:null}
        {!!error && <View style={{gap:8}}><Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>{!question && <Pressable accessibilityRole="button" onPress={()=>setAttempt(value=>value+1)} style={s.textButton}><Text style={s.back}>다시 준비하기 ↻</Text></Pressable>}</View>}
      </>}
    </ScrollView>
    {!session?<View style={s.dock}><Pressable accessibilityRole="button" disabled={!eligible.length} onPress={start} style={[s.primary,!eligible.length && {opacity:.4}]}><Text style={s.primaryText}>테스트 시작</Text></Pressable></View>:session.done?<View style={s.dock}><Pressable accessibilityRole="button" onPress={onClose} style={s.primary}><Text style={s.primaryText}>표현노트로</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>setSession(null)} style={s.textButton}><Text style={s.muted}>다시 테스트</Text></Pressable></View>:question?<View style={s.dock}>
      {feedback?<Pressable accessibilityRole="button" onPress={next} style={s.primary}><Text style={s.primaryText}>{session.index+1===session.notes.length?'결과 보기':'다음 →'}</Text></Pressable>:<>
        <View style={s.row}><Pressable accessibilityRole="button" disabled={checking} onPress={revealHint} style={s.textButton}><Text style={[s.back,checking && {color:C.muted}]}>힌트 보기</Text></Pressable><Pressable accessibilityRole="button" disabled={checking} onPress={()=>{revealHint();commit({outcome:'revealed',explanation:'다음에는 직접 떠올려 보세요.'});}} style={s.textButton}><Text style={s.muted}>모르겠어요</Text></Pressable></View>
        <Pressable accessibilityRole="button" accessibilityState={{busy:checking,disabled:checking || !answer.trim()}} disabled={checking || !answer.trim()} onPress={()=>{void submit();}} style={[s.primary,(checking || !answer.trim()) && {opacity:.45}]}>{checking?<ActivityIndicator color={C.paper}/>:<Text style={s.primaryText}>확인</Text>}</Pressable>
      </>}
    </View>:null}
    <DayPicker visible={picker} days={days} value={null} selectedDays={chosenDays} onDaysChange={setSelectedDays} onSelect={()=>{}} onClose={()=>setPicker(false)}/>
  </KeyboardAvoidingView>;
}
const font=Platform.OS==='web'?'-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", sans-serif':'System';
const s=StyleSheet.create({
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},textButton:{minHeight:44,alignItems:'center',justifyContent:'center'},back:{fontFamily:font,fontSize:13,fontWeight:'600',color:C.ink},muted:{fontFamily:font,fontSize:12,lineHeight:20,color:C.muted},content:{gap:14,paddingBottom:24},grow:{flexGrow:1},title:{fontFamily:font,fontSize:24,lineHeight:32,fontWeight:'700',letterSpacing:-.7,color:C.ink},description:{fontFamily:font,fontSize:14,lineHeight:23,color:C.muted},tabs:{flexDirection:'row',padding:4,borderRadius:16,backgroundColor:C.cream},tab:{flex:1,minHeight:44,borderRadius:12,alignItems:'center',justifyContent:'center'},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},track:{height:4,borderRadius:2,backgroundColor:C.cream,overflow:'hidden'},bar:{height:4,backgroundColor:C.coral},question:{padding:22,borderRadius:24,borderWidth:1,borderColor:C.line,backgroundColor:C.paper,marginTop:12,gap:16},caption:{fontFamily:font,fontSize:12,color:C.muted},korean:{fontFamily:font,fontSize:23,lineHeight:35,fontWeight:'600',letterSpacing:-.6,color:C.ink},divider:{height:1,backgroundColor:C.line,marginVertical:4},english:{fontFamily:font,fontSize:23,lineHeight:36,fontWeight:'400',letterSpacing:-.4,color:C.ink},hint:{alignSelf:'flex-start',paddingHorizontal:14,paddingVertical:9,borderRadius:12,backgroundColor:C.mint},hintText:{fontFamily:font,fontSize:18,letterSpacing:2,fontWeight:'600',color:C.ink},feedback:{gap:8,paddingTop:12},feedbackTitle:{fontFamily:font,fontSize:16,fontWeight:'700',color:C.ink},error:{fontSize:13,lineHeight:21,color:C.coral},input:{fontFamily:font,minHeight:54,borderWidth:1,borderColor:C.line,borderRadius:16,paddingHorizontal:16,paddingVertical:14,fontSize:17,color:C.ink,backgroundColor:C.cream},primary:{minHeight:52,borderRadius:16,backgroundColor:C.ink,alignItems:'center',justifyContent:'center',padding:14},primaryText:{fontFamily:font,fontSize:15,fontWeight:'700',color:C.paper},dock:{paddingTop:10,paddingBottom:8,gap:4},loading:{flex:1,minHeight:200,alignItems:'center',justifyContent:'center',gap:14},complete:{flex:1,alignItems:'center',justifyContent:'center',gap:12,paddingVertical:40},checkCircle:{width:64,height:64,borderRadius:32,backgroundColor:C.mint,alignItems:'center',justifyContent:'center',marginBottom:12},
});
