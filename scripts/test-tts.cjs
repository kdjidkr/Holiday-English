const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('src/core/geminiTts.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};let requests=[],respond;
class Audio {
  state='running';destination={};
  async resume(){this.state='running';}
  async close(){this.state='closed';}
  async decodeAudioData(bytes){assert.equal(Buffer.from(bytes).toString(),'WAV');return {};}
  createBufferSource(){return {connect(){},start(){setImmediate(()=>this.onended?.());},stop(){this.onended?.();}};}
}
vm.runInNewContext(source,{module:mod,exports:mod.exports,require,process:{env:{EXPO_PUBLIC_GEMINI_API_KEY:'test'}},window:{AudioContext:Audio},fetch:async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return respond(url,options);},setTimeout,clearTimeout,AbortController,atob});
const {GeminiTtsClient,customerVoice,CUSTOMER_VOICES}=mod.exports;
const castModule={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/scenarios/customers.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:castModule,exports:castModule.exports,require});
const cast=castModule.exports.BRISBANE_CUSTOMERS;
for(const customer of cast){
  assert.equal(CUSTOMER_VOICES[customer.id]?.gender,customer.gender,customer.id);
  assert.equal(customerVoice(customer).name,CUSTOMER_VOICES[customer.id].name);
  assert.match(customerVoice(customer).style,/Never imitate or voice the barista/);
}
assert.equal(new Set(cast.filter(c=>c.portraitIndex!==undefined).map(c=>customerVoice(c).name)).size,14);
assert.equal(customerVoice({id:'cust_1',gender:'FEMALE',age:25,personality:'friendly'}).name,'Kore');
const textResponse={ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Cheers, mate!'}]}}]})};
const audioResponse={ok:true,json:async()=>({steps:[{type:'model_output',content:[{type:'audio',data:Buffer.from('WAV').toString('base64')}]}]})};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  const female={id:'cust_2',gender:'FEMALE',age:26,personality:'friendly'};
  const male={...female,id:'cust_1',gender:'MALE'};
  assert.notEqual(customerVoice(male).name,customerVoice(female).name);
  assert.match(customerVoice(female).style,/female/);assert.match(customerVoice(male).style,/male/);
  assert.equal(customerVoice(male).name,customerVoice(male).name);
  let complete=0,lines=[];
  const callbacks={onReady(){},onStart(){},onText:line=>lines.push(line),onComplete:()=>complete++,onError:error=>{throw new Error(error);}};
  respond=()=>textResponse;
  let client=new GeminiTtsClient();client.setSoundEnabled(false);await client.connect('English only',callbacks);
  client.send('Hello');await settle();assert.equal(requests.length,1);assert.equal(complete,1);assert.equal(lines[0],'Cheers, mate!');client.disconnect();
  requests=[];complete=0;respond=url=>url.endsWith('interactions')?audioResponse:textResponse;
  client=new GeminiTtsClient();await client.connect('English only',callbacks,customerVoice(female).name);client.send('Hello');await settle();await settle();
  assert.equal(requests[1].body.model,'gemini-3.8-flash-lite-tts');assert.equal(requests[1].body.input[0].content[0].text,'Cheers, mate!');assert.equal(requests[1].body.generation_config.speech_config[0].voice,customerVoice(female).name);assert.equal(complete,1);client.disconnect();
  requests=[];complete=0;let release;
  respond=()=>new Promise(resolve=>release=resolve);
  client=new GeminiTtsClient();client.setSoundEnabled(false);await client.connect('English only',callbacks);client.send('Hello');client.disconnect();release(textResponse);await settle();assert.equal(complete,0);assert.equal(requests.length,1);
  complete=0;let unavailable=0;respond=url=>url.endsWith('interactions')?Promise.reject(new Error('audio failed')):textResponse;
  client=new GeminiTtsClient();await client.connect('English only',{...callbacks,onSpeechUnavailable:()=>unavailable++});client.send('Hello');await settle();assert.equal(complete,1);assert.equal(unavailable,1);client.disconnect();
  console.log('PASS: gender-specific stable voices, exact TTS transcript/model, muted cost avoidance, stale request cancellation, audio failure text fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
