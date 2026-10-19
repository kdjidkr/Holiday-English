const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('src/core/expressionSuggestions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
let requests=[],responses=[];const mod={exports:{}};
const fakeFetch=async(url,options)=>{assert.equal(url,'/api/jev');requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({answers:responses.shift()})};};
vm.runInNewContext(source,{module:mod,exports:mod.exports,require:()=>({apiUrl:value=>value,apiFetch:fakeFetch}),fetch:fakeFetch});
const api=mod.exports;
const notes=[{id:'a',shiftDay:3,englishTemplate:'keen on',koreanMeaning:'~을 좋아하다',expressionKind:'phrase'},{id:'b',englishTemplate:'head down to',koreanMeaning:'~로 가다',expressionKind:'phrase'},{id:'c',englishTemplate:'keen on',koreanMeaning:'~을 좋아하다',expressionKind:'phrase'},{id:'sentence',englishTemplate:'I like coffee.',koreanMeaning:'커피를 좋아해요.'}];
const context={customerLine:'Got any plans after work?',recentDialogue:[],order:'Flat white',drinkReady:false,briefing:['A sunny morning']};
const pick=choice=>({pick:{type:'choice',choice,confidence:.9}});
(async()=>{
  assert.equal(api.SUGGESTION_THRESHOLD,.7);
  assert.equal(api.suggestionCandidates(notes).length,2);
  assert.equal(api.suggestionCandidates([{...notes[0],englishTemplate:'flat',koreanMeaning:'평평한'},{...notes[1],englishTemplate:'flat',koreanMeaning:'아파트'}]).length,2);
  const frameCandidate=api.suggestionCandidates([{id:'frame',shiftDay:3,learningKind:'frame',englishTemplate:"It's a bit [상태].",koreanMeaning:'조금 ~하네요.',frame:{slotHint:'형용사',variations:[]}}])[0];
  assert.equal(frameCandidate.frame.slotHint,'형용사');assert.equal(frameCandidate.day,3);
  responses=[pick('option_0'),pick('option_0'),{suitable_0:{type:'noul',noul:.95},suitable_1:{type:'noul',noul:.86}}];
  let result=await api.suggestExpressions(context,notes,new AbortController().signal);
  assert.equal(result.length,2);assert.notEqual(result[0].id,result[1].id);assert.equal(requests.length,3);
  assert.ok(requests[0].questions.pick.criteria.none);assert.equal(Object.keys(requests[1].questions.pick.criteria).length,2);assert.equal(Object.keys(requests[2].questions).length,2);
  assert.equal(result[0].day,3);assert.equal(result[0].english,'keen on'); // Original notes, no generated answers or template insertion.
  assert.equal(api.verifiedSuggestions(result,{suitable_0:{type:'noul',noul:.5},suitable_1:{type:'noul',noul:1.1}}).length,0);
  assert.equal(api.verifiedSuggestions(result,{suitable_0:{type:'noul',noul:.71},suitable_1:{type:'noul',noul:.7}}).length,1);
  requests=[];responses=[pick('none')];assert.equal((await api.suggestExpressions(context,notes,new AbortController().signal)).length,0);assert.equal(requests.length,1);
  requests=[];responses=[pick('option_999')];assert.equal((await api.suggestExpressions(context,notes,new AbortController().signal)).length,0);assert.equal(requests.length,1);
  requests=[];assert.equal((await api.suggestExpressions(context,[],new AbortController().signal)).length,0);assert.equal(requests.length,0);
  const controller=new AbortController();controller.abort();responses=[pick('option_0')];assert.equal((await api.suggestExpressions(context,notes,controller.signal)).length,0);
  console.log('PASS: saved words/phrases only, distinct Choice candidates, none option, batched Noul threshold, invalid answers and cancellation');
  // Exercise the actual hook: late results from an old turn must never reappear.
  const hookSource=ts.transpileModule(fs.readFileSync('src/core/useExpressionSuggestions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const hookMod={exports:{}},slots=[],effects=[],pending=[];let cursor=0;
  const react={useState:init=>{const i=cursor++;if(!(i in slots))slots[i]=init;return [slots[i],value=>slots[i]=value];},useRef:init=>{const i=cursor++;if(!(i in slots))slots[i]={current:init};return slots[i];},useEffect:(fn,deps)=>{const i=cursor++,prev=effects[i];if(!prev || deps.some((value,j)=>value!==prev.deps[j])){prev?.cleanup?.();effects[i]={deps,cleanup:fn()};}}};
  vm.runInNewContext(hookSource,{module:hookMod,exports:hookMod.exports,require:name=>name==='react'?react:{logSuggestionEvent(){},suggestExpressions:()=>new Promise(resolve=>pending.push(resolve))},AbortController,setTimeout,clearTimeout});
  const render=(ctx,enabled=true)=>{cursor=0;return hookMod.exports.useExpressionSuggestions(ctx,notes,enabled);};
  render(context);render({...context,customerLine:'What milk do you have?'});pending[0](result);await new Promise(setImmediate);assert.equal(slots[0].length,0);
  pending[1]([result[1]]);await new Promise(setImmediate);assert.equal(slots[0].length,1);
  assert.equal(render(context,false).length,0);assert.equal(slots[0].length,0);
  effects.forEach(effect=>effect?.cleanup?.());
  console.log('PASS: recommendation hook ignores stale turns and clears suggestions when input phase ends');
})().catch(error=>{console.error(error);process.exitCode=1;});
