const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const load=(path,extra={})=>{const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:m,exports:m.exports,...extra});return m.exports;};
const cards=load('src/core/flashcards.ts');let requests=[],answers=[];
const dict=load('src/core/vaultDictionary.ts',{require:name=>name==='apiUrl'?{apiUrl:value=>value}:name==='./apiUrl'?{apiUrl:value=>value}:cards,fetch:async(url,options)=>{assert.equal(url,'/api/jev');requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({answers:answers.shift()})};}});
const note=(id,english,meaning,day=1,source='Example')=>({id,englishTemplate:english,koreanMeaning:meaning,expressionKind:english.includes(' ')?'phrase':'word',shiftDay:day,sourceQuote:source,sourceKorean:'번역',slotExamples:[]});
(async()=>{
 const old={...note('r1','ripper','아주 멋진',6,'What a ripper day!'),starred:true},incoming=note('r2','ripper','훌륭한',7,'That was a ripper game!');
 assert.equal(dict.duplicateCandidates([old],incoming).length,1);
 assert.equal(dict.duplicateCandidates([note('uk','colour','색')],note('us','color','색')).length,1);
 assert.equal(dict.duplicateCandidates([note('other','great','훌륭한')],incoming).length,0);
 assert.equal(dict.duplicateCandidates([note('few','a few','조금 있는')],note('no','few','거의 없는')).length,0);
 assert.equal(dict.duplicateCandidates([note('work','go to work','출근하다')],note('art','go to the work','그 작품으로 가다')).length,1); // Candidate isn't approval.
 answers=[{relation:{type:'choice',choice:'entry_0',confidence:.98}},{sameSense:{type:'noul',noul:.9}}];
 const target=await dict.findDuplicate(incoming,[old],new AbortController().signal);assert.equal(target,'r1');
 const merged=dict.saveDictionaryEntry([old],incoming,target);assert.equal(merged.length,1);assert.equal(merged[0].starred,true);assert.equal(merged[0].occurrences.length,2);assert.deepEqual(Array.from(dict.entryDays(merged[0])),[6,7]);
 assert.equal(cards.selectCards(merged,['word'],[7]).length,1);assert.deepEqual(Array.from(cards.noteDays(merged)),[6,7]);assert.equal(dict.isPatternSaved(merged,incoming),true);
 assert.equal(dict.saveDictionaryEntry(merged,incoming,target).length,1);assert.equal(merged[0].occurrences.length,2);
 const homonym=note('r1','ripper','찢는 도구',8,'Use a seam ripper.');
 answers=[{relation:{type:'choice',choice:'none'}}];assert.equal(await dict.findDuplicate(homonym,[old],new AbortController().signal),undefined);
 const separated=dict.saveDictionaryEntry([old],homonym);assert.equal(separated.length,2);assert.notEqual(separated[0].id,old.id);assert.equal(separated[0].lexemeKey,'ripper');assert.equal(dict.isPatternSaved(separated,homonym),true);
 for(const probability of [.7,.89,1.1,NaN]){answers=[{relation:{type:'choice',choice:'entry_0',confidence:.98}},{sameSense:{type:'noul',noul:probability}}];assert.equal(await dict.findDuplicate(incoming,[old],new AbortController().signal),undefined);}
 answers=[{relation:{type:'choice',choice:'entry_0',confidence:.8}}];assert.equal(await dict.findDuplicate(incoming,[old],new AbortController().signal),undefined);
 answers=[{relation:{type:'choice',choice:'entry_999'}}];assert.equal(await dict.findDuplicate(incoming,[old],new AbortController().signal),undefined);
 assert.equal(dict.normalizeEntry('  It’s  good '),"it's good");
 const previous=JSON.stringify(old);dict.saveDictionaryEntry([old],incoming,'r1');assert.equal(JSON.stringify(old),previous);
 assert.equal(requests[0].state.incoming.examples[0].english,incoming.sourceQuote);
 const sentence={...note('sentence','I was worried it might get busy.','바빠질까 봐 걱정했어요.'),expressionKind:undefined,sourceQuote:'I worried many people your cafe',explanation:'Original dialogue correction',sourceKorean:'원래 대화'};
 answers=[{relation:{type:'choice',choice:'entry_0',confidence:.99}},{sameSense:{type:'noul',noul:.99}}];
 const before=requests.length;
 await dict.findDuplicate(sentence,[{...sentence,id:'older'}],new AbortController().signal);
 for(const request of requests.slice(before)){
   assert.equal(request.state.incoming.english,sentence.englishTemplate);
   assert.equal(request.state.incoming.meaning,sentence.koreanMeaning);
   assert.equal(request.state.incoming.examples,undefined);
   assert.equal(request.state.incoming.explanation,undefined);
   assert.ok(!JSON.stringify(request.state).includes(sentence.sourceQuote));
 }
 console.log('PASS: sentence duplicate checks exclude original dialogue in both selection and verification');
 console.log('PASS: conservative JEV sense merge, homonyms and article distinctions, provenance, collision-safe IDs, stars, Day filters, idempotence and malformed decisions');
})().catch(error=>{console.error(error);process.exitCode=1;});
