const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const moduleBox={exports:{}};let calls=0,body;
const answer={weather:'breezy',briefing:['바람이 선선하게 불어요.','근처 도서관에서 사진 전시가 시작됐어요.'],briefingEnglish:['A cool breeze is blowing.','A photography exhibition has opened at the local library.']};
const fakeFetch=async(_url,options)=>{calls++;body=JSON.parse(options.body);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(answer)}]}}]})};};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/core/shiftBriefing.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:moduleBox,exports:moduleBox.exports,require:()=>({apiUrl:value=>value,apiFetch:fakeFetch}),setTimeout,clearTimeout,AbortController,fetch:fakeFetch});
(async()=>{
 const {generateShiftBriefing,validateBriefing}=moduleBox.exports;
 assert.throws(()=>validateBriefing({...answer,briefingEnglish:undefined},1,'2026-10-15'));
 assert.throws(()=>validateBriefing({...answer,briefingEnglish:['한국어','Wrong']},1,'2026-10-15'));
 assert.throws(()=>validateBriefing({...answer,weather:'snow'},1,'2026-10-15'));
 assert.throws(()=>validateBriefing({...answer,briefing:['short']},1,'2026-10-15'));
 const history=Array.from({length:7},(_,i)=>({day:7-i,briefing:[`소식 ${i}`]}));
 const first=generateShiftBriefing(8,history,new Date(2026,9,15));const second=generateShiftBriefing(8,history);
 assert.equal(first,second);const event=await first;assert.equal(calls,1);assert.equal(event.weather,'breezy');assert.equal(event.title,answer.briefing[0]);assert.equal(event.briefing.length,2);assert.equal(event.briefingEnglish[1],answer.briefingEnglish[1]);
 const input=JSON.parse(body.contents[0].parts[0].text);assert.equal(input.recent.length,5);assert.equal(input.date,'2026-10-22');
 await generateShiftBriefing(9,history);assert.equal(calls,2);
 console.log('PASS: generated coherent briefing, five-day history, duplicate-request reuse, next day and invalid-response rejection');
})().catch(error=>{console.error(error);process.exitCode=1;});
