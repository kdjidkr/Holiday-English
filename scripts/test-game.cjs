const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
function load(path, resolve = name => name === './apiUrl' ? {apiUrl:value=>value,geminiLiveSocketUrl:()=> 'ws://localhost:3000/api/gemini/live'} : name === './apiClient' ? {apiFetch:()=>{throw Error('Unexpected API call');}} : require(name)) {
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} }; vm.runInNewContext(output, { module, exports: module.exports, require: resolve, setTimeout, clearTimeout }); return module.exports;
}
const rules = load('src/core/gameRules.ts');

const events=load('src/scenarios/dailyEvents.ts');
const october=events.createShiftBriefing(1,new Date(2026,9,12));
assert.doesNotMatch(october.briefing.join(' '),/물어보|이야기해|확인해|권해/);assert.equal(october.briefing.length,3);assert.equal(october.title,october.briefing[0]);assert.doesNotMatch(october.briefing.join(' '),/크리스마스|Boxing/);
assert.match(events.createShiftBriefing(1,new Date(2026,11,24)).briefing.join(' '),/크리스마스/);
console.log('PASS: coherent shift briefing, three topics, date-aware holiday context');

const ttsModule = load('src/core/geminiTts.ts');
const handover = load('src/core/handoverGreeting.ts');
const customerData = load('src/scenarios/customers.ts', id => id === './types' ? {} : require(id));
const attributionDialogue=[
  {speaker:'customer',text:'You should visit South Bank this weekend.',kind:'conversation'},
  {speaker:'user',text:"I'll check it out!",kind:'conversation'},
  ...Array.from({length:8},()=>({speaker:'customer',text:'Lovely coffee.',kind:'conversation'})),
];
const attribution=handover.handoverContext(customerData.BRISBANE_CUSTOMERS[0],attributionDialogue);
assert.equal(attribution.roles.user.role,'barista');assert.equal(attribution.roles.customer.role,'customer');
assert.equal(attribution.outputSpeaker,'user');assert.equal(attribution.outputAddressee,'customer');
assert.equal(attribution.dialogue.length,10); // Earlier recommendations must not lose their attribution after eight turns.
assert.equal(attribution.dialogue[0].speakerRole,'customer');assert.equal(attribution.dialogue[0].addressee,'user');
assert.equal(attribution.dialogue[1].speakerRole,'barista');assert.equal(attribution.dialogue[1].addressee,'customer');
assert.equal(attribution.dialogue[1].text,"I'll check it out!");
assert.equal(attribution.order.menuName,customerData.BRISBANE_CUSTOMERS[0].preferredOrder.menuName);
console.log('PASS: handover speaker/addressee roles and full dialogue attribution');

const cafe = load('src/scenarios/cafe.ts', id => id === './customers' ? customerData : require(id));
const savedPatterns = Array.from({length:9},(_,i)=>({englishTemplate:`phrase ${i}`,koreanMeaning:`뜻 ${i}`}));
assert.deepEqual(JSON.parse(JSON.stringify(cafe.selectVaultPatterns(savedPatterns,1,0).map(item=>item.englishTemplate))),['phrase 0','phrase 1','phrase 2','phrase 3','phrase 4','phrase 5']);
assert.deepEqual(JSON.parse(JSON.stringify(cafe.selectVaultPatterns(savedPatterns,2,0).map(item=>item.englishTemplate))),['phrase 3','phrase 4','phrase 5','phrase 6','phrase 7','phrase 8']);
const vaultPrompt = cafe.buildSystemPromptForCustomer({name:'Jack',occupation:'developer',personality:'friendly',topics:[],preferredOrder:{menuName:'flat white'}},{title:'A sunny morning'},'Jun',false,[savedPatterns[0]]);
assert.match(vaultPrompt,/phrase 0/);assert.match(vaultPrompt,/never force or awkwardly adapt/);assert.match(vaultPrompt,/no more than one saved expression in a reply/);
assert.doesNotMatch(cafe.buildSystemPromptForCustomer({name:'Jack',occupation:'developer',personality:'friendly',topics:[],preferredOrder:{menuName:'flat white'}},{title:'A sunny morning'},'Jun',false),/saved English expressions/);
const visit=(id,text)=>({customer:{id,name:id},dialogue:[{speaker:'customer',text},{speaker:'user',text:'Thanks!'}]});
const older=visit('older','Old topic'),previous1=visit('previous1','It is BRISK today!'),previous2=visit('previous2','Shall we kickstart the day?'),currentVisit=visit('current','New topic');
const history=[{sessions:[older,previous1,previous2]}];
assert.deepEqual(Array.from(cafe.recentCustomerSessions([],history),s=>s.customer.id),['previous1','previous2']);
assert.deepEqual(Array.from(cafe.recentCustomerSessions([currentVisit],history),s=>s.customer.id),['previous2','current']);
assert.deepEqual(Array.from(cafe.recentCustomerSessions([previous1,previous2,currentVisit],history),s=>s.customer.id),['previous2','current']);
const repetitionNotes=['brisk','kickstart','trade'].map(englishTemplate=>({englishTemplate,koreanMeaning:'뜻'}));
assert.deepEqual(Array.from(cafe.selectVaultPatterns(repetitionNotes,1,0,[previous1,previous2]),s=>s.englishTemplate),['trade']);
assert.equal(cafe.selectVaultPatterns([{englishTemplate:'nip'}],1,0,[visit('other','A snippet')]).length,1); // Whole words only.
assert.equal(cafe.selectVaultPatterns(repetitionNotes,1,0,[previous2,currentVisit]).some(s=>s.englishTemplate==='brisk'),true); // Expires after two visits.
const referencePrompt=cafe.buildSystemPromptForCustomer(customerData.BRISBANE_CUSTOMERS[0],{title:'Morning'},'Jun',false,[],[previous1,previous2]);
assert.match(referencePrompt,/BRISK today/);assert.match(referencePrompt,/speakerName/);assert.match(referencePrompt,/NOT your current conversation/);
assert.doesNotMatch(referencePrompt,/try to weave|On many visits/);
console.log('PASS: two-visit history across shift boundaries, expression cooldown and reference attribution');
const jack = customerData.BRISBANE_CUSTOMERS[0];
assert.equal(customerData.orderForVisit(jack,0,()=>0).preferredOrder.menuName,jack.preferredOrder.menuName);
let altRoll=[0.29,0];
const jackAlternative=customerData.orderForVisit(jack,1,()=>altRoll.shift());
assert.notEqual(jackAlternative.preferredOrder.menuName,jack.preferredOrder.menuName);
assert.equal(jackAlternative.id,jack.id);
let favoriteRoll=[0.7];
assert.equal(customerData.orderForVisit(jack,1,()=>favoriteRoll.shift()).preferredOrder.menuName,jack.preferredOrder.menuName);
assert.equal(cafe.selectCustomers(1,{}).length,1);
assert.equal(cafe.selectCustomers(7,{}).length,1);
assert.equal(cafe.selectCustomers(1,{})[0].preferredOrder.menuName,jack.preferredOrder.menuName);
assert.equal(handover.defaultHandoverGreeting({preferredOrder:{menuName:'Double Espresso + Banana Bread'}}).english,"Here's your double espresso and banana bread. Enjoy!");
assert.throws(()=>handover.validateHandoverGreeting({english:'커피 나왔어요.',korean:'커피 나왔어요.'}));
assert.deepEqual(JSON.parse(JSON.stringify(handover.validateHandoverGreeting({english:' Here is your coffee. ',korean:' 커피 나왔어요. '}))),{english:'Here is your coffee.',korean:'커피 나왔어요.'});
const customer = { id: 'jack', name: 'Jack', preferredOrder: { menuName: 'Flat white' } };
const turn = (speaker, text, kind = 'conversation', rescue = false) => ({ speaker, text, kind, rescue });
const greeting = turn('customer', 'Hello!', 'greeting');
const dialogue = [greeting, turn('user','Hi'),turn('customer','How are you?'),turn('user','Good thanks'),turn('customer','Lovely')];
assert.equal(rules.exchangeCount([greeting]),0);
assert.equal(rules.exchangeCount([turn('user','Hi')]),0);
assert.equal(rules.exchangeCount([turn('user','Hi'),turn('user','Hello'),turn('customer','Hey')]),1);
assert.equal(rules.exchangeCount([turn('user','(pause)','conversation',true),turn('customer','Take your time')]),0);
assert.equal(rules.exchangeCount(dialogue),2);
assert.equal(rules.exchangeCount([{...turn('user','Here is your coffee'),assisted:true},turn('customer','Thanks')]),0);
assert.equal(rules.exchangeCount([...dialogue,turn('user','Bye','farewell'),turn('customer','See you','farewell')]),2);
const session = {customer, dialogue, served:true,mode:'practice'};
assert.equal(rules.visitRelationship(undefined,{...session,served:false}).status,'NEW');
const first = rules.visitRelationship(undefined,session); assert.equal(first.status,'FRIEND');
const second = rules.visitRelationship(first,session); assert.equal(second.status,'REGULAR');
assert.equal(rules.visitRelationship(second,session).status,'REGULAR');
assert.equal(rules.queueServe('CHATTING',false,false),'CHATTING');
assert.equal(rules.queueServe('CHATTING',true,true),'SERVE_QUEUED');
assert.equal(rules.queueServe('CHATTING',true,false),'FAREWELL');
assert.equal(rules.queueServe('DEPARTING',true,false),'DEPARTING');
assert.equal(rules.buildCoaching(1,[]).length,0);
assert.equal(rules.buildCoaching(1,[{...session,dialogue:[turn('user','It is humid today')]}])[0].koreanMeaning,'오늘 날씨에 대해 말하기');
assert.equal(rules.buildCoaching(1,[{...session,dialogue:[turn('customer','It is humid today')]}]).length,0);
assert.equal(rules.buildCoaching(1,[{...session,dialogue:[{...turn('user','It is humid today'),assisted:true}]}]).length,0);
console.log('PASS: exchange counting, rescue exclusion, relationship progression, handover gating, transcript-based coaching');

// Run the actual hook with a deterministic clock, including queued handover and exit.
let clock = 0, nextTimer = 0, rendered;
const tasks = new Map();
const schedule = (fn, delay, interval = 0) => { const id = ++nextTimer; tasks.set(id,{fn, at:clock+delay, interval}); return id; };
function advance(ms) {
  const end = clock + ms;
  while (true) {
    const candidate = [...tasks.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
    if (!candidate) break;
    const [id, task] = candidate; clock=task.at;
    if (task.interval) task.at+=task.interval; else tasks.delete(id);
    task.fn();
  }
  clock=end;
}
const fakeTimers = {setTimeout:(fn,ms)=>schedule(fn,ms),clearTimeout:id=>tasks.delete(id),setInterval:(fn,ms)=>schedule(fn,ms,ms),clearInterval:id=>tasks.delete(id)};
const people = [0,1,2].map(i=>({id:`c${i}`,name:`Person ${i}`,occupation:'local',personality:'friendly',topics:['coffee'],preferredOrder:{menuName:'Flat white',prepDurationSeconds:3}}));
const persisted = {currentShiftDay:1,relationships:{},shiftHistory:[],vaultPatterns:[{englishTemplate:'check in on [someone]',koreanMeaning:'누군가의 안부를 묻다'}],userProfile:{englishNameAlphabet:'Sunny'}};
persisted.completeShift = record => {
  if (persisted.shiftHistory.some(r=>r.id===record.id)) return;
  const ids=[];
  for (const session of record.sessions) {
    const previous = persisted.relationships[session.customer.id];
    const next = rules.visitRelationship(previous,session);
    persisted.relationships[session.customer.id]=next;
    if(next.status==='REGULAR' && previous?.status!=='REGULAR') ids.push(session.customer.id);
  }
  persisted.shiftHistory.unshift({...record,newRegularIds:ids}); persisted.currentShiftDay++;
};
let liveCallbacks, selectedVoice, livePrompt, sentLive=[], disconnects=0;
let greetingGenerator=()=>Promise.reject(new Error('offline test'));
class MockLive {
  setSoundEnabled(enabled) {this.soundEnabled=enabled;}
  async enableAudio() {return true;}
  connect(prompt, callbacks, voice) {livePrompt=prompt;liveCallbacks=callbacks; selectedVoice=voice; callbacks.onReady();}
  send(text) {this.text=text; sentLive.push(text); return true;}
  disconnect() {disconnects++;}
}
const hookSource = ts.transpileModule(fs.readFileSync('src/core/useCafeGame.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const hookModule={exports:{}};
const mocks = {
  react:{useState:init=>{rendered=init;return [init,next=>{rendered=next;}];},useRef:current=>({current}),useEffect:fn=>fn()},
  '../store/gameStore':{useGameStore:{getState:()=>persisted}},
  '../scenarios/cafe':{selectCustomers:()=>people.slice(0,1),selectVaultPatterns:cafe.selectVaultPatterns,recentCustomerSessions:cafe.recentCustomerSessions,buildSystemPromptForCustomer:cafe.buildSystemPromptForCustomer},
  '../scenarios/dailyEvents':{getRandomDailyEvent:()=>({title:'Sunny morning'})},
  './geminiLive':{GeminiLiveClient:MockLive},
  './geminiTts':{GeminiTtsClient:class extends MockLive {configureVoice(){}},customerVoice:ttsModule.customerVoice},
  './turnManager':{TurnManager:class {reset(){} }}, './gameRules':rules,
  './handoverGreeting':{defaultHandoverGreeting:handover.defaultHandoverGreeting,generateHandoverGreeting:(...args)=>greetingGenerator(...args)},
};
vm.runInNewContext(hookSource,{module:hookModule,exports:hookModule.exports,require:name=>mocks[name],...fakeTimers,Date,AbortController});
const game=hookModule.exports.useCafeGame();
for(const line of ["Here's your coffee.","Your coffee is ready.","Your oat flat white's ready!",'커피 나왔어요.'])assert.equal(rules.isDrinkHandover(line),true,line);
for(const line of ["Your coffee will be ready soon.","Is your coffee ready?","Your coffee isn't ready.","If your coffee is ready, I'll bring it.","Your coffee is almost ready.",'커피 곧 나와요.'])assert.equal(rules.isDrinkHandover(line),false,line);
game.start('practice');advance(4500);
assert.equal(rendered.phase,'AWAITING_ORDER');advance(60000);assert.equal(rendered.seconds,0);
game.send('blocked');assert.equal(rendered.dialogue.length,1);
game.acceptOrder();advance(3200);assert.equal(rendered.finalSeconds,20);
game.send('Thanks for the recommendation!');assert.equal(rendered.phase,'FAREWELL');
const finalTurns=rendered.dialogue.length;game.send('another turn');assert.equal(rendered.dialogue.length,finalTurns);
assert.equal(rendered.dialogue.filter(t=>t.assisted).length,0);
advance(1200);assert.equal(rendered.busy,false);advance(1200);assert.equal(rendered.phase,'DEPARTING');
game.depart();advance(1400);
assert.equal(rendered.running,false);assert.equal(persisted.shiftHistory.length,1);
assert.equal(persisted.shiftHistory[0].sessions.length,1);
assert.ok(persisted.shiftHistory[0].sessions[0].dialogue.some(t=>t.speaker==='user' && t.text==='Thanks for the recommendation!'));
game.start('live');advance(2200);assert.equal(selectedVoice,ttsModule.customerVoice(people[0]).name);
liveCallbacks.onStart();liveCallbacks.onText('Hello');liveCallbacks.onComplete();game.acceptOrder();
game.send('Any weekend plans?');advance(10000);
assert.equal(rendered.phase,'CHATTING');assert.equal(rendered.finalSeconds,null); // Do not consume player's time during customer speech.
liveCallbacks.onText('Try South Bank.');liveCallbacks.onComplete();assert.equal(rendered.finalSeconds,20);
advance(18000);assert.ok(rendered.finalSeconds>0);
const beforeFinal=sentLive.length;game.send("I'll check it out, thanks!");assert.equal(sentLive.length,beforeFinal+1);
assert.equal(rendered.phase,'FAREWELL');assert.match(sentLive.at(-1),/COFFEE_HANDED_OVER/);assert.match(sentLive.at(-1),/I'll check it out/);
advance(4000);assert.equal(sentLive.length,beforeFinal+1); // Timer cannot send a duplicate goodbye.
liveCallbacks.onText('Cheers for the coffee, see you!');liveCallbacks.onComplete();advance(1200);assert.equal(rendered.phase,'DEPARTING');
const oldCallbacks=liveCallbacks;game.leave();oldCallbacks.onText('stale');oldCallbacks.onComplete();assert.equal(rendered.phase,'DONE');
game.start('live');advance(2200);liveCallbacks.onText('Hello');liveCallbacks.onComplete();game.acceptOrder();
assert.equal(rendered.seconds,0);game.send("Here's your coffee.");assert.equal(rendered.phase,'FAREWELL');assert.match(sentLive.at(-1),/Here's your coffee/);
game.leave();advance(60000);assert.equal(persisted.shiftHistory.length,1);
game.start('live');advance(2200);liveCallbacks.onText('Hello');liveCallbacks.onComplete();game.acceptOrder();
game.send('Your coffee will be ready soon.');assert.equal(rendered.phase,'CHATTING');game.leave();
game.start('live');advance(2200);liveCallbacks.onText('Hello');liveCallbacks.onComplete();game.acceptOrder();
game.setSelectionOpen(true);game.send("Here's your coffee.");
const beforeDisconnect=disconnects;liveCallbacks.onText('Thank you, goodbye!');liveCallbacks.onComplete();
assert.equal(disconnects,beforeDisconnect+1); // Reading a tip must not keep the Live connection open.
const heldIndex=rendered.index;advance(60000);assert.equal(rendered.index,heldIndex);assert.equal(rendered.phase,'FAREWELL');
game.setSelectionOpen(false);assert.equal(rendered.phase,'DEPARTING');advance(1400);assert.equal(rendered.running,false);assert.equal(rendered.summary.sessions.length,1);
game.leave();
console.log('PASS: selection holds farewell screen with Live disconnected; closing resumes departure');
console.log('PASS: final 20-second turn after playback, timeout handover, one combined farewell, early explicit delivery, no invented player speech, stale callbacks and complete single-customer shift');

(async () => {
  let time=0, next=0, resolveCheck;
  const timers=new Map(), commits=[];
  const waiters={setTimeout:(fn,ms)=>{const id=++next;timers.set(id,{fn,at:time+ms});return id;},clearTimeout:id=>timers.delete(id)};
  const advanceTurn=async ms=>{const end=time+ms;while(true){const entry=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;const[id,t]=entry;time=t.at;timers.delete(id);await t.fn();await new Promise(setImmediate);}time=end;};
  let evaluator = text => Promise.resolve(text === 'yes');
  const output=ts.transpileModule(fs.readFileSync('src/core/turnManager.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const mod={exports:{}};
  vm.runInNewContext(output,{module:mod,exports:mod.exports,require:()=>({turnHeuristics:{isSentenceComplete:text=>evaluator(text)}}),...waiters});
  const tm=new mod.exports.TurnManager({onExpressionChange(){},onCommitTurn:(text,rescue)=>commits.push({text,rescue})});
  tm.handleTranscriptUpdate('yes');tm.handleSpeechEnd();await advanceTurn(500);
  assert.equal(commits.length,1);assert.equal(commits[0].rescue,false);
  tm.handleSpeechStart();tm.handleTranscriptUpdate('because');tm.handleSpeechEnd();await advanceTurn(4000);
  assert.equal(commits.length,2);assert.equal(commits[1].rescue,true);
  tm.handleSpeechStart();tm.handleSpeechEnd();await advanceTurn(4000);
  assert.equal(commits.length,3);assert.equal(commits[2].text,'');assert.equal(commits[2].rescue,true);
  evaluator=()=>new Promise(resolve=>{resolveCheck=resolve;});
  tm.handleTranscriptUpdate('yes');tm.handleSpeechEnd();
  const task=[...timers.entries()][0];timers.delete(task[0]);task[1].fn();
  tm.handleSpeechStart();resolveCheck(true);await new Promise(setImmediate);
  assert.equal(commits.length,3); // Stale completion cannot cut a newly started utterance.
  tm.reset();
  console.log('PASS: short turn, incomplete sentence rescue, empty silence rescue, asynchronous speech race');
})().catch(error=>{console.error(error);process.exitCode=1;});

const arrival = load('src/arrival/story.ts');
assert.equal(arrival.validateArrivalName(''), '손님에게 알려줄 영어 이름을 적어주세요.');
assert.equal(arrival.validateArrivalName('Jay'), null);
assert.equal(arrival.validateArrivalName("O'Neil"), null);
assert.equal(arrival.normalizeArrivalName(' Jun이라고 불러주세요 '), 'Jun');
assert.equal(arrival.normalizeArrivalName('Jun라고 불러 주세요.'), 'Jun');
assert.equal(arrival.normalizeArrivalName('Please call me Mary Jane'), 'Mary Jane');
assert.equal(arrival.normalizeArrivalName("O'Neil"), "O'Neil");
assert.equal(arrival.validateArrivalName('Jun이라고 불러주세요'), null);
assert.notEqual(arrival.validateArrivalName('써니'), null);
assert.notEqual(arrival.validateArrivalName('A'.repeat(31)), null);
let arrivalBeat='BOARDING', arrivalSteps=0;
while(arrivalBeat!=='FIRST_SHIFT' && arrivalSteps<20) { arrivalBeat=arrival.nextArrivalBeat(arrivalBeat);arrivalSteps++; }
assert.equal(arrivalBeat,'FIRST_SHIFT');assert.equal(arrivalSteps,6);
assert.equal(arrival.nextArrivalBeat('FIRST_SHIFT'),'FIRST_SHIFT');
assert.equal(arrival.arrivalLines.NAME.speaker,'manager');
assert.equal(arrival.arrivalLines.FIRST_SHIFT.speaker,'manager');
assert.equal(arrival.arrivalLines.BOARDING.speaker,'driver');
console.log('PASS: arrival input validation, taxi-to-cafe sequence, single player name prompt, first-shift boundary');

// Muting must silence existing and future audio without ending an active reply.
{
  const source=ts.transpileModule(fs.readFileSync('src/core/geminiLive.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const mod={exports:{}};let completed=0;
  vm.runInNewContext(source,{exports:mod.exports,require:()=>({geminiLiveSocketUrl:()=> 'ws://localhost:3000/api/gemini/live'}),setTimeout:fn=>{fn();return 1;},clearTimeout});
  const live=new mod.exports.GeminiLiveClient();
  live.output={gain:{value:1}};live.audio={state:'running'};live.active=true;live.generating=true;live.callbacks={onComplete:()=>completed++};
  live.setSoundEnabled(false);assert.equal(live.output.gain.value,0);assert.equal(completed,0);
  live.setSoundEnabled(true);assert.equal(live.output.gain.value,1);assert.equal(completed,0);
  live.audio.state='suspended';live.generating=false;
  live.setSoundEnabled(false);assert.equal(completed,1);
  console.log('PASS: immediate mute/unmute, active reply preservation, blocked-audio recovery while muted');
}
