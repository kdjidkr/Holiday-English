const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/core/flashcards.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:mod,exports:mod.exports});
const f=mod.exports;
const note=(id,day,english,kind)=>({id,shiftDay:day,englishTemplate:english,koreanMeaning:'뜻',slotExamples:[],expressionKind:kind});
const notes=[note('a',3,'brisk','word'),note('b',1,'get the hang of','phrase'),note('c',3,"Here's your coffee."),note('d',2,'muggy','word')];
assert.equal(f.classifyNote(notes[0]),'word');assert.equal(f.classifyNote(notes[1]),'phrase');assert.equal(f.classifyNote(notes[2]),'sentence');
assert.deepEqual(Array.from(f.noteDays(notes)),[1,2,3]);
assert.deepEqual(Array.from(f.selectCards(notes,['word','sentence'],[2,3]),n=>n.id),['a','c','d']);
assert.equal(f.selectCards(notes,[],[1,2,3]).length,0);assert.equal(f.selectCards(notes,['word'],[]).length,0);
assert.equal(f.selectCards([...notes,notes[0]],['word'],[3]).length,1);
assert.equal(f.selectCards([note('empty',1,'','word')],['word'],[1]).length,0);
const shuffled=f.shuffleCards(notes,()=>0);assert.equal(notes[0].id,'a');assert.equal(new Set(shuffled.map(n=>n.id)).size,4);
let session=f.startCards(notes.slice(0,3));
session=f.rateCard(session,false);assert.equal(session.index,1);assert.equal(session.round,1); // Failed card waits until round ends.
session=f.rateCard(session,true);session=f.rateCard(session,false);
assert.equal(session.round,2);assert.deepEqual(Array.from(session.cards,n=>n.id),['a','c']);
assert.equal(session.seen.length,3);assert.equal(session.again.length,2);
session=f.rateCard(session,true);session=f.rateCard(session,false);assert.equal(session.round,3);assert.equal(session.cards.length,1);assert.equal(session.cards[0].id,'c');
session=f.rateCard(session,true);assert.equal(session.done,true);assert.equal(session.seen.length,3);assert.equal(session.again.length,2);
assert.equal(f.rateCard(session,false),session);assert.equal(f.startCards([]).done,true);
console.log('PASS: Day/type multi-filter, no duplicate cards, shuffle preserves notes, retry after round and unique session totals');
const dictMod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/core/vaultDictionary.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:dictMod,exports:dictMod.exports,require:name=>name==='./apiUrl'?{apiUrl:value=>value}:name==='./apiClient'?{apiFetch:async()=>{throw Error('Unexpected API call');}}:f});
const testMod={exports:{}};
const frameModule={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/core/sentenceFrames.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:frameModule,exports:frameModule.exports});
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/core/vocabularyTest.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:testMod,exports:testMod.exports,require:name=>name==='./flashcards'?f:name==='./apiClient'?{apiFetch:async()=>{throw Error('Unexpected API call');}}:frameModule.exports});
(async()=>{
const storeMod={exports:{}};let persistConfig;
const create=()=>initializer=>{let state;const set=next=>{state={...state,...(typeof next==='function'?next(state):next)};};state=initializer(set);const use=()=>state;use.getState=()=>state;return use;};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/store/gameStore.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:storeMod,exports:storeMod.exports,require:name=>name==='../core/vocabularyTest'?testMod.exports:name==='../core/vaultDictionary'?dictMod.exports:name==='zustand'?{create}:name==='zustand/middleware'?{persist:(init,config)=>{persistConfig=config;return init;},createJSONStorage:()=>({})}:name==='react-native'?{Platform:{OS:'web'}}:name==='expo-file-system'?{documentDirectory:''}:{},setTimeout,clearTimeout,AbortController});
const store=storeMod.exports.useGameStore;
await store.getState().savePatternToVault(notes[0]);await store.getState().savePatternToVault(notes[1]);
store.getState().togglePatternStar('a');assert.equal(store.getState().vaultPatterns.find(n=>n.id==='a').starred,true);
assert.equal(store.getState().vaultPatterns.find(n=>n.id==='b').starred,undefined);
const saved=JSON.parse(JSON.stringify(persistConfig.partialize(store.getState())));assert.equal(saved.vaultPatterns.find(n=>n.id==='a').starred,true);
await store.getState().savePatternToVault(notes[0]);assert.equal(store.getState().vaultPatterns.find(n=>n.id==='a').starred,true);
store.getState().togglePatternStar('a');assert.equal(store.getState().vaultPatterns.find(n=>n.id==='a').starred,false);
store.getState().togglePatternStar('missing');assert.equal(store.getState().vaultPatterns.length,2);
console.log('PASS: legacy notes star/unstar, persistence, duplicate save preserves star and other notes unchanged');

let skipped=f.startCards(notes.slice(0,2));skipped=f.skipCard(skipped);
assert.equal(skipped.index,1);assert.equal(skipped.seen.length,0);assert.equal(skipped.again.length,0);
skipped=f.skipCard(skipped);assert.equal(skipped.done,true);
let mixed=f.rateCard(f.startCards(notes.slice(0,2)),false);mixed=f.skipCard(mixed);
assert.equal(mixed.round,2);assert.equal(mixed.cards[0].id,'a');assert.equal(mixed.seen.length,1);
console.log('PASS: skip advances without assessment and preserves queued retry cards');

const frameNote={...note('frame',3,"It's a bit [상태]."),learningKind:'frame',frame:{slotHint:'형용사',variations:[{english:"It's a bit busy.",korean:'조금 바쁘네요.'},{english:"It's a bit noisy.",korean:'조금 시끄럽네요.'}]}};
assert.equal(f.classifyNote(frameNote),'frame');assert.equal(f.selectCards([...notes,frameNote],['frame'],[3]).length,1);
assert.equal(f.selectCards([...notes,frameNote],['sentence'],[3]).length,1);
assert.equal(f.framePractice(frameNote,1).english,"It's a bit busy.");assert.equal(f.framePractice(frameNote,2).korean,'조금 시끄럽네요.');
assert.equal(f.framePractice(frameNote,3).english,"It's a bit busy.");assert.equal(f.framePractice(notes[0],1).english,'brisk');
await store.getState().savePatternToVault(frameNote);const frameSave=JSON.parse(JSON.stringify(persistConfig.partialize(store.getState()))).vaultPatterns.find(n=>n.id==='frame');
assert.equal(frameSave.frame.variations.length,2);assert.equal(frameSave.learningKind,'frame');
console.log('PASS: frame classification, Day filter, changing practice situations and compatible persistent frame fields');

const savedBefore=[notes[0]],fixedSession=f.startCards(savedBefore);savedBefore.push(notes[1]);
assert.equal(fixedSession.cards.length,1);assert.equal(f.startCards(savedBefore).cards.length,2);
console.log('PASS: current flashcard deck stays fixed; newly saved examples appear in the next session');

await store.getState().savePatternToVault({...note('translated',6,'go-to','phrase'),sourceQuote:'Oat milk is my go-to.',sourceKorean:'오트밀크를 즐겨 마셔요.'});
const translatedNote=JSON.parse(JSON.stringify(persistConfig.partialize(store.getState()))).vaultPatterns.find(n=>n.id==='translated');
assert.equal(translatedNote.sourceKorean,'오트밀크를 즐겨 마셔요.');assert.equal(translatedNote.sourceQuote,'Oat milk is my go-to.');
console.log('PASS: original English and Korean example persist together');

const countBefore=store.getState().vaultPatterns.length;
await Promise.all([
 store.getState().savePatternToVault({...note('concurrent1',8,'flat','word'),koreanMeaning:'아파트'}),
 store.getState().savePatternToVault({...note('concurrent2',9,'flat','word'),koreanMeaning:'평평한'}),
]);
assert.equal(store.getState().vaultPatterns.length,countBefore+2);
assert.equal(store.getState().vaultPatterns.filter(n=>n.englishTemplate==='flat').length,2);
console.log('PASS: concurrent saves preserve both senses when JEV is unavailable');
const quizNote=store.getState().vaultPatterns[0],quizSignature=testMod.exports.questionSignature(quizNote);
store.getState().cacheTestQuestion({noteId:quizNote.id,signature:quizSignature,kind:'word',korean:'뜻',prefix:'It is ',suffix:'.',answer:'flat'});
store.getState().recordTestAnswer(quizNote.id,quizSignature,'assisted',true);
const quizSaved=JSON.parse(JSON.stringify(persistConfig.partialize(store.getState())));
assert.equal(quizSaved.testQuestions[quizNote.id].signature,quizSignature);
assert.equal(quizSaved.testProgress[quizNote.id].hints,1);
assert.equal(quizSaved.testProgress[quizNote.id].correct,0);
assert.ok(quizSaved.testProgress[quizNote.id].dueAt>quizSaved.testProgress[quizNote.id].lastReviewedAt);
console.log('PASS: test question cache and sense-specific review progress persist alongside legacy notes');

})().catch(error=>{console.error(error);process.exitCode=1;});
