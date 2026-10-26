import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { addSpeechRecognitionListener, ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { CustomerPersona, DailyEvent } from '../scenarios/types';
import { useGameStore } from '../store/gameStore';
import { selectCustomers, buildSystemPromptForCustomer, selectVaultPatterns, recentCustomerSessions } from '../scenarios/cafe';
import { getRandomDailyEvent } from '../scenarios/dailyEvents';
import { GeminiLiveClient } from './geminiLive';
import { GeminiTtsClient, customerVoice } from './geminiTts';
import { TurnManager } from './turnManager';
import { CustomerSessionResult, DialogueTurn, SessionPhase, ShiftRecord, exchangeCount, practiceReply, isDrinkHandover } from './gameRules';

interface CafeState {
  running: boolean; mode: 'practice' | 'live' | 'tts'; phase: SessionPhase; customers: CustomerPersona[]; index: number;
  event: DailyEvent | null; seconds: number; busy: boolean; talking: boolean; readyToSayBye: boolean;
  dialogue: DialogueTurn[]; line: string; status: 'idle' | 'connecting' | 'ready' | 'error'; error: string | null;
  recording: boolean; transcript: string; completed: CustomerSessionResult[]; summary: ShiftRecord | null; stalled: boolean;
  finalSeconds: number | null; prepSeconds: number;
}
const initial: CafeState = { running: false, mode: 'practice', phase: 'DONE', customers: [], index: 0, event: null, seconds: 0, busy: false, talking: false, readyToSayBye: false, dialogue: [], line: '', status: 'idle', error: null, recording: false, transcript: '', completed: [], summary: null, stalled: false, finalSeconds: null, prepSeconds: 0 };
export function useCafeGame() {
  const [state, setState] = useState<CafeState>(initial);
  const current = useRef(state);
  const client = useRef<GeminiLiveClient | GeminiTtsClient | null>(null);
  const manager = useRef<TurnManager | null>(null);
  const recognition = useRef<any>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const generation = useRef(0);
  const selectionOpen=useRef(false),farewellFinished=useRef(false);
  const reply = useRef('');
  const requestRevision = useRef(0);
  const replyKind = useRef<DialogueTurn['kind']>('greeting');
  const patch = (next: Partial<CafeState>) => { current.current = { ...current.current, ...next }; setState(current.current); };
  const later = (fn: () => void, ms: number) => {
    const id = generation.current;
    const timer = setTimeout(() => { timers.current.delete(timer); if (generation.current === id) fn(); }, ms);
    timers.current.add(timer);
  };
  const stopRecognition = () => { if (recognition.current) { recognition.current.onend = null; recognition.current.abort(); recognition.current = null; } manager.current?.reset(); patch({ recording: false, transcript: '' }); };
  const dispose = () => {
    selectionOpen.current=false;farewellFinished.current=false;
    generation.current++; requestRevision.current++; for (const t of timers.current) clearTimeout(t); timers.current.clear();
    client.current?.disconnect(); client.current = null; stopRecognition();
  };
  const finishReply = () => {
    const s = current.current;
    if (!s.busy) return;
    if (reply.current.trim()) patch({ dialogue: [...s.dialogue, { speaker: 'customer', text: reply.current.trim(), kind: replyKind.current }] });
    patch({ busy: false, talking: false, stalled: false });
    if(current.current.phase==='ORDERING' && replyKind.current==='greeting')patch({phase:'AWAITING_ORDER'});
    if (current.current.phase === 'FAREWELL') {
      client.current?.disconnect();client.current=null;farewellFinished.current=true;
      later(() => { if (current.current.phase === 'FAREWELL' && !current.current.busy) depart(); }, 1200);
    } else if (current.current.phase === 'CHATTING' && current.current.seconds >= current.current.prepSeconds) {
      patch({finalSeconds:20});
    }
  };
  const fail = (message: string) => {
    client.current?.disconnect(); client.current = null;
    stopRecognition();
    patch({ status: 'error', error: message, busy: false, talking: false, stalled: true });
    if(['FAREWELL','SERVE_QUEUED'].includes(current.current.phase)) {patch({phase:'FAREWELL'});practice('Cheers! Catch you next time.', 'farewell');}
  };
  const requestLive = (text: string, kind: DialogueTurn['kind']) => {
    reply.current = ''; replyKind.current = kind;
    const requestId = ++requestRevision.current;
    patch({ busy: true, talking: false, stalled: false });
    const s=current.current;
    const readyContext=s.phase==='CHATTING' && s.seconds>=s.prepSeconds ? '[CAFE_EVENT: DRINK_READY] The drink is ready; wrap up this topic without new questions. ' : '';
    if (!client.current?.send(readyContext+text)) { fail('연결이 준비되지 않았습니다. 연습 모드로 이어갈 수 있어요.'); return; }
    later(() => { if (requestId === requestRevision.current && current.current.busy) patch({ stalled: true, error: '응답을 기다리고 있어요. 연결이 지연되면 연습 모드로 이어가거나 직접 배웅할 수 있습니다.' }); }, 20000);
  };
  const practice = (text: string, kind: DialogueTurn['kind']) => {
    reply.current = text; replyKind.current = kind;
    patch({ busy: true, talking: true, line: text });
    later(finishReply, 1100);
  };
  const enter = (index: number, mode: CafeState['mode']) => {
    dispose();
    const s = current.current, customer = s.customers[index];
    const previous = useGameStore.getState().relationships[customer.id];
    const article = /^[aeiou]/i.test(customer.preferredOrder.menuName) ? 'an' : 'a';
    const greeting = previous?.visits
      ? `Hey, ${useGameStore.getState().userProfile.englishNameAlphabet}! Good to see you again. Could I grab ${article} ${customer.preferredOrder.menuName}, please?`
      : `G'day! Could I grab ${article} ${customer.preferredOrder.menuName}, please? How's your morning going?`;
    patch({ index, mode, phase: 'ARRIVING', seconds: 0, dialogue: [], line: '', status: mode !== 'practice' ? 'connecting' : 'ready', error: null, busy: false, talking: false, readyToSayBye: false, stalled: false });
    patch({finalSeconds:null,prepSeconds:useGameStore.getState().prepTimeSeconds || customer.preferredOrder.prepDurationSeconds});
    manager.current = new TurnManager({ onExpressionChange: () => {}, onCommitTurn: (text, rescue) => send(text, rescue) });
    later(() => {
      patch({ phase: 'ORDERING' });
      if (mode === 'practice') practice(greeting, 'greeting');
    }, 1050);
    if (mode !== 'practice') {
      const live = mode==='tts' ? new GeminiTtsClient() : new GeminiLiveClient();
      const voice=customerVoice(customer);
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[Voice]', JSON.stringify({customerId:customer.id,gender:customer.gender,voiceName:voice.name,mode}));
      if(live instanceof GeminiTtsClient)live.configureVoice(voice.style); client.current = live;
      live.setSoundEnabled(useGameStore.getState().soundEnabled !== false);
      const id = generation.current;
      const guard = (fn: () => void) => { if (id === generation.current) fn(); };
      const store = useGameStore.getState();
      const recent=recentCustomerSessions(s.completed,store.shiftHistory);
      const savedExpressions = selectVaultPatterns(store.vaultPatterns, store.currentShiftDay, index,recent);
      void live.connect(buildSystemPromptForCustomer(customer, s.event!, store.userProfile.englishNameAlphabet, !!previous?.visits, savedExpressions,recent) + "\n" + voice.style, {
        onReady: () => guard(() => { patch({ status: 'ready', error: null, busy: true }); const greet = () => requestLive('[CAFE_EVENT: ARRIVAL] Greet the barista and order your coffee.', 'greeting'); if (current.current.phase === 'ARRIVING') later(greet, 1100); else greet(); }),
        onStart: () => guard(() => patch({ talking: true, line: '' })),
        onText: text => guard(() => { reply.current += text; patch({ line: reply.current }); }),
        onComplete: () => guard(finishReply),
        onSpeechUnavailable:()=>guard(()=>patch({error:'음성 생성이 늦어 자막으로 이어갈게요.'})),
        onAudioBlocked: () => guard(() => patch({ stalled: true, error: '소리 재생이 잠시 막혔어요. 손님 목소리 듣기를 눌러주세요.' })),
        onError: message => guard(() => fail(message)),
      }, voice.name);
    }
  };
  const start = (mode: CafeState['mode'], event?: DailyEvent) => {
    const store = useGameStore.getState();
    patch({ ...initial, running: true, mode, customers: selectCustomers(store.currentShiftDay, store.relationships), event: event || getRandomDailyEvent() });
    enter(0, mode);
  };
  const send = (text: string, rescue = false) => {
    const s = current.current;
    if (s.busy || s.status !== 'ready' || s.phase !== 'CHATTING' || (!text.trim() && !rescue)) return;
    stopRecognition();
    const closing = s.seconds >= s.prepSeconds || (!rescue && isDrinkHandover(text));
    const turn: DialogueTurn = { speaker:'user', text:text.trim() || '(잠시 말문이 막힘)', rescue, kind:closing?'farewell':'conversation' };
    patch({dialogue:[...s.dialogue,turn],transcript:''});
    if(closing){beginFarewell(text.trim());return;}
    if (s.mode !== 'practice') requestLive(rescue ? `[CAFE_EVENT: HELP] The barista paused. ${text}` : text, 'conversation');
    else practice(practiceReply(s.customers[s.index],text,exchangeCount(s.dialogue),rescue),'conversation');
  };
  const beginFarewell = (lastWords = '') => {
    const s = current.current;
    if(s.busy || s.phase==='DEPARTING' || s.phase==='DONE')return;
    stopRecognition(); patch({phase:'FAREWELL',finalSeconds:null,readyToSayBye:false});
    const customer=s.customers[s.index];
    const lastTurn=lastWords ? `The barista's final words to you are: ${JSON.stringify(lastWords)}. Respond to these words first, preserving who said and intends what.` : 'The barista silently hands you the drink. Do not invent words or plans for the barista.';
    if(s.mode !== 'practice' && s.status==='ready')requestLive(`[CAFE_EVENT: COFFEE_HANDED_OVER] Your actual order has now been handed to you. ${lastTurn} In ONE short final reply, acknowledge their words if any, notice YOUR drink, thank the barista for it, and say goodbye. No questions, no new topic, no invitation requiring a reply. Speak only as the customer.`, 'farewell');
    else practice(`Lovely, cheers for the ${customer.preferredOrder.menuName}! Catch you next time.`, 'farewell');
  };
  const depart = () => {
    const s = current.current;
    if (!['FAREWELL', 'SERVE_QUEUED'].includes(s.phase)) return;
    if (s.busy && !s.stalled) return;
    client.current?.disconnect();client.current=null;stopRecognition();
    if(selectionOpen.current)return;
    patch({ phase: 'DEPARTING', busy: false, talking: false, stalled: false });
    later(() => {
      if(selectionOpen.current){patch({phase:'FAREWELL'});return;}
      const now = current.current;
      const completed = [...now.completed, { customer: now.customers[now.index], dialogue: [...now.dialogue], served: true, mode: now.mode }];
      patch({ completed });
      if (now.index + 1 < now.customers.length) { enter(now.index + 1, now.mode); return; }
      const store = useGameStore.getState();
      const record: ShiftRecord = { id: `shift-${store.currentShiftDay}-${Date.now()}`, day: store.currentShiftDay, date: new Date().toISOString(), eventTitle: now.event!.title, briefing:now.event!.briefing, sessions: completed, newRegularIds: [], patterns: [] };
      store.completeShift(record);
      dispose(); patch({ running: false, phase: 'DONE', summary: useGameStore.getState().shiftHistory[0] });
    }, 1400);
  };
  const setSelectionOpen=(active:boolean)=>{
    selectionOpen.current=active;
    if(!active && farewellFinished.current && current.current.phase==='FAREWELL' && !current.current.busy)depart();
  };
  const switchToPractice = () => {
    const s = current.current; dispose();
    patch({ mode: 'practice', status: 'ready', error: null, busy: false, talking: false, stalled: false });
    manager.current = new TurnManager({ onExpressionChange: () => {}, onCommitTurn: (text, rescue) => send(text, rescue) });
    if (['FAREWELL', 'SERVE_QUEUED'].includes(s.phase)) beginFarewell();
    else { patch({ phase: s.phase==='CHATTING'?'CHATTING':'ORDERING' }); practice(s.dialogue.length ? "No worries, mate. Where were we? How's your day going?" : `G'day! Could I grab ${/^[aeiou]/i.test(s.customers[s.index].preferredOrder.menuName) ? 'an' : 'a'} ${s.customers[s.index].preferredOrder.menuName}, please?`, 'greeting'); }
  };
  const voice = () => {
    const s = current.current;
    if (s.recording) { recognition.current?.stop(); return; }
    if (s.busy || s.status !== 'ready' || s.phase!=='CHATTING') return;
    if (Platform.OS !== 'web') {
      void startNativeRecognition();
      return;
    }
    const Speech = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!Speech) { patch({ error: '이 기기에서는 음성 인식을 사용할 수 없어요. 아래 키보드로 직접 말해 주세요.' }); return; }
    const rec = new Speech(); recognition.current = rec;
    rec.lang = 'en-AU'; rec.interimResults = true; rec.continuous = true;
    let final = '', received = false;
    rec.onspeechstart = () => manager.current?.handleSpeechStart();
    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += `${event.results[i][0].transcript} `;
        else interim += event.results[i][0].transcript;
      }
      const text = (final + interim).trim(); received = !!text;
      patch({ transcript: text }); manager.current?.handleTranscriptUpdate(text);
      if (event.results[event.results.length - 1].isFinal) manager.current?.handleSpeechEnd();
    };
    rec.onspeechend = () => manager.current?.handleSpeechEnd();
    rec.onerror = (event: any) => {
      stopRecognition(); patch({ error: event.error === 'not-allowed' ? '마이크 권한을 허용하거나 키보드를 이용해 주세요.' : '음성을 듣지 못했어요. 다시 시도해 주세요.' });
    };
    rec.onend = () => { recognition.current = null; patch({ recording: false }); if (received) manager.current?.handleSpeechEnd(); };
    patch({ recording: true, transcript: '', error: null });
    try { rec.start(); manager.current?.handleSpeechEnd(); } catch { stopRecognition(); patch({ error: '마이크를 시작하지 못했습니다.' }); }
  };
  const startNativeRecognition = async () => {
    const startedInGeneration=generation.current;
    patch({ recording: true, transcript: '', error: null });
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if(startedInGeneration!==generation.current)return;
      if (!permission.granted) throw new Error('마이크와 음성 인식 권한을 허용해 주세요.');
      let finalTranscript = '';
      let received = false;
      const subscriptions: Array<{ remove: () => void }> = [];
      const cleanup = () => subscriptions.splice(0).forEach(subscription => subscription.remove());
      const handle = {
        stop: () => ExpoSpeechRecognitionModule.stop(),
        abort: () => { cleanup(); ExpoSpeechRecognitionModule.abort(); },
      };
      recognition.current = handle;
      subscriptions.push(addSpeechRecognitionListener('speechstart', () => manager.current?.handleSpeechStart()));
      subscriptions.push(addSpeechRecognitionListener('result', event => {
        const segment = event.results.map(result => result.transcript).filter(Boolean).join(' ').trim();
        if (event.isFinal && segment) finalTranscript = [finalTranscript, segment].filter(Boolean).join(' ');
        const text = [finalTranscript, !event.isFinal ? segment : ''].filter(Boolean).join(' ').trim();
        received = !!text;
        patch({ transcript: text }); manager.current?.handleTranscriptUpdate(text);
        if (event.isFinal) manager.current?.handleSpeechEnd();
      }));
      subscriptions.push(addSpeechRecognitionListener('error', event => {
        if (recognition.current !== handle) return;
        recognition.current = null; cleanup(); manager.current?.reset();
        patch({ recording: false, transcript: '', error: event.error === 'not-allowed' ? '마이크와 음성 인식 권한을 허용해 주세요.' : '음성을 듣지 못했어요. 다시 시도해 주세요.' });
      }));
      subscriptions.push(addSpeechRecognitionListener('end', () => {
        if (recognition.current !== handle) return;
        recognition.current = null; cleanup(); patch({ recording: false });
        if (received) manager.current?.handleSpeechEnd();
      }));
      ExpoSpeechRecognitionModule.start({
        lang: 'en-AU', interimResults: true, continuous: true,
        iosCategory: { category: 'playAndRecord', categoryOptions: ['defaultToSpeaker', 'allowBluetooth'], mode: 'measurement' },
      });
    } catch (error) {
      if(startedInGeneration===generation.current){stopRecognition();patch({ error: error instanceof Error ? error.message : '마이크를 시작하지 못했습니다.' });}
    }
  };
  useEffect(() => {
    const timer = setInterval(() => {
      const s = current.current;
      if (!s.running || !['CHATTING', 'SERVE_QUEUED'].includes(s.phase) ) return;
      if(s.phase==='CHATTING'){
        patch({seconds:s.seconds+1});
        // Preparation continues during speech; the final opportunity starts only on the player's turn.
        if(current.current.seconds < s.prepSeconds || s.busy || s.status !== 'ready')return;
        if(s.finalSeconds===null){patch({finalSeconds:20});return;}
        const remaining=Math.max(0,s.finalSeconds-1);patch({finalSeconds:remaining});
        if(remaining===0){
          if(s.recording && s.transcript.trim())send(s.transcript);
          else beginFarewell();
        }
      }
    }, 1000);
    return () => { clearInterval(timer); generation.current++; requestRevision.current++; for (const t of timers.current) clearTimeout(t); client.current?.disconnect(); manager.current?.reset(); if (recognition.current) { recognition.current.onend = null; recognition.current.abort(); } };
  }, []);
  const enableSound = async () => {
    const id = generation.current;
    const enabled = await client.current?.enableAudio();
    if (id !== generation.current) return;
    patch({ error: enabled ? null : '소리를 시작하지 못했습니다. 기기의 음량과 오디오 출력을 확인해 주세요.', stalled: !enabled });
  };
  const setSoundEnabled = async (enabled: boolean) => {
    useGameStore.getState().setSoundEnabled(enabled);
    client.current?.setSoundEnabled(enabled);
    if (enabled && client.current) await enableSound();
    else if (!enabled && current.current.error?.includes('소리')) patch({ error: null, stalled: false });
  };
  const acceptOrder=()=>{const s=current.current;if(s.phase!=='AWAITING_ORDER' || s.busy)return;patch({phase:'CHATTING',seconds:0});};
  return { state, setSelectionOpen, acceptOrder, setSoundEnabled, start, send, depart, voice, enableSound, switchToPractice, clearSummary: () => patch({ summary: null }), leave: () => { dispose(); patch({ ...initial }); } };
}
