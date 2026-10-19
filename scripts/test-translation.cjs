const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const slots = [], effects = [], requests = [];
let cursor = 0;
const react = {
  useRef(value) { const i=cursor++; return slots[i] ||= {current:value}; },
  useState(value) { const i=cursor++; if (!(i in slots)) slots[i]=value; return [slots[i], update=>{slots[i]=typeof update==='function'?update(slots[i]):update;}]; },
  useEffect(fn,deps) { const i=cursor++; const previous=slots[i]; if(!previous || deps.some((d,j)=>d!==previous.deps[j])) effects.push(()=>{previous?.cleanup?.();slots[i]={deps,cleanup:fn()};}); },
};
const mod={exports:{}};
const fakeFetch=(_url,options)=>new Promise(resolve=>requests.push({sentence:JSON.parse(options.body).contents[0].parts[0].text,signal:options.signal,resolve}));
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/core/useTranslation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, {
  module:mod,exports:mod.exports,require:name=>name==='react'?react:name==='./apiClient'?{apiFetch:fakeFetch}:{apiUrl:value=>value},AbortController,setTimeout,clearTimeout,
  fetch:fakeFetch,
});
const {splitDialogueSentences,useTranslation}=mod.exports;
const render=(text,enabled=true,busy=true)=>{cursor=0;const result=useTranslation(text,enabled,busy);while(effects.length)effects.shift()();return result;};
const finish=async(index,translation,tip='')=>{requests[index].resolve({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({translation,tip})}]}}]})});await new Promise(setImmediate);};
(async()=>{
  assert.equal(JSON.stringify(splitDialogueSentences('Hi! Coffee? It is $3.50. Still speaking',true)),JSON.stringify(['Hi!','Coffee?','It is $3.50.']));
  assert.equal(JSON.stringify(splitDialogueSentences('No punctuation',false)),JSON.stringify(['No punctuation']));
  render('Hi!');assert.equal(requests.length,1);
  render('Hi! Coffee');assert.equal(requests.length,1);assert.equal(requests[0].signal.aborted,false);
  render('Hi! Coffee?');assert.equal(requests.length,2);assert.equal(requests[0].signal.aborted,false);
  await finish(1,'커피요?');assert.equal(render('Hi! Coffee?').text,'');
  await finish(0,'안녕하세요!','인사 표현');assert.equal(render('Hi! Coffee?').text,'안녕하세요! 커피요?');
  assert.equal(render('Hi! Coffee?').tips,undefined);
  render('Hi! Coffee? No punctuation',true,false);assert.equal(requests.length,3);
  render('Different turn!');assert.equal(requests[2].signal.aborted,true);
  await finish(2,'이전 대사의 늦은 번역');assert.equal(render('Different turn!').text,'');
  render('Different turn!',false);assert.equal(requests[3].signal.aborted,true);
  await finish(3,'숨긴 대사');assert.equal(render('Different turn!',false).text,'');
  console.log('PASS: incremental sentence translation, decimal boundary, ordered responses, no duplicate requests, stale-turn rejection, toggle cancellation');
})().catch(error=>{console.error(error);process.exitCode=1;});
