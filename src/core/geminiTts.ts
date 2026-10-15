import type { LiveCallbacks } from './geminiLive';
import type { CustomerPersona } from '../scenarios/types';
import {apiUrl} from './apiUrl';

// Explicit cast assignments. Voices are shared only after the available same-gender pool is exhausted.
export const CUSTOMER_VOICES: Record<string, {name:string; gender:string}> = {
  cust_1: {name:'Puck',gender:'MALE'},
  cust_2: {name:'Aoede',gender:'FEMALE'},
  cust_3: {name:'Charon',gender:'MALE'},
  cust_4: {name:'Kore',gender:'FEMALE'},
  cust_5: {name:'Fenrir',gender:'MALE'},
  cust_6: {name:'Leda',gender:'FEMALE'},
  cust_7: {name:'Orus',gender:'MALE'},
  cust_8: {name:'Zephyr',gender:'FEMALE'},
  cust_9: {name:'Iapetus',gender:'MALE'},
  cust_10: {name:'Callirrhoe',gender:'FEMALE'},
  cust_11: {name:'Alnilam',gender:'MALE'},
  cust_12: {name:'Despina',gender:'FEMALE'},
  cust_13: {name:'Schedar',gender:'MALE'},
  cust_14: {name:'Erinome',gender:'FEMALE'},
  cust_15: {name:'Achird',gender:'MALE'},
  cust_16: {name:'Laomedeia',gender:'FEMALE'},
  cust_17: {name:'Zubenelgenubi',gender:'MALE'},
  cust_18: {name:'Achernar',gender:'FEMALE'},
  cust_19: {name:'Algieba',gender:'MALE'},
  cust_20: {name:'Gacrux',gender:'FEMALE'},
  cust_21: {name:'Sadachbia',gender:'MALE'},
  cust_22: {name:'Pulcherrima',gender:'FEMALE'},
  cust_23: {name:'Sadaltager',gender:'MALE'},
  cust_24: {name:'Sulafat',gender:'FEMALE'},
  cust_25: {name:'Puck',gender:'MALE'},
  cust_26: {name:'Vindemiatrix',gender:'FEMALE'},
  cust_27: {name:'Charon',gender:'MALE'},
  cust_28: {name:'Aoede',gender:'FEMALE'},
  cust_29: {name:'Fenrir',gender:'MALE'},
  cust_30: {name:'Kore',gender:'FEMALE'},
  cust_31: {name:'Orus',gender:'MALE'},
  cust_32: {name:'Leda',gender:'FEMALE'},
  cust_33: {name:'Iapetus',gender:'MALE'},
  cust_34: {name:'Zephyr',gender:'FEMALE'},
  cust_35: {name:'Umbriel',gender:'MALE'},
  cust_36: {name:'Callirrhoe',gender:'FEMALE'},
  cust_37: {name:'Algenib',gender:'MALE'},
  cust_38: {name:'Autonoe',gender:'FEMALE'},
  cust_39: {name:'Rasalgethi',gender:'MALE'},
  cust_40: {name:'Despina',gender:'FEMALE'},
  cust_41: {name:'Alnilam',gender:'MALE'},
  cust_42: {name:'Erinome',gender:'FEMALE'},
  cust_43: {name:'Schedar',gender:'MALE'},
  cust_44: {name:'Laomedeia',gender:'FEMALE'},
  cust_45: {name:'Achird',gender:'MALE'},
  cust_46: {name:'Achernar',gender:'FEMALE'},
  cust_47: {name:'Zubenelgenubi',gender:'MALE'},
  cust_48: {name:'Gacrux',gender:'FEMALE'},
  cust_49: {name:'Algieba',gender:'MALE'},
  cust_50: {name:'Pulcherrima',gender:'FEMALE'},
  cust_fitness_male: {name:'Umbriel',gender:'MALE'},
  cust_fitness_female: {name:'Autonoe',gender:'FEMALE'},
  cust_surfer_kai: {name:'Algenib',gender:'MALE'},
  cust_finance_daniel: {name:'Rasalgethi',gender:'MALE'},
};
export function customerVoice(customer: CustomerPersona) {
  const assigned = CUSTOMER_VOICES[customer.id];
  const name = assigned && assigned.gender === customer.gender ? assigned.name : customer.gender === 'FEMALE' ? 'Kore' : 'Puck';
  return {name, style:`VOICE IDENTITY: You are one ${customer.gender === 'FEMALE'?'female':'male'} customer, age ${customer.age}, speaking natural Australian English with the configured ${name} voice. Keep the same speaker identity and consistent vocal timbre throughout this session. Never imitate or voice the barista, another character, or quoted dialogue. Speak only your own customer replies. ${customer.personality}. Casual café conversation; concise, unhurried, never read instructions aloud.`};
}

// Same lifecycle as Live: cancel old requests and audio when a customer leaves.
export class GeminiTtsClient {
  private active=false;
  private callbacks: LiveCallbacks|null=null;
  private instruction='';
  private history: {role:string;parts:{text:string}[]}[]=[];
  private controller: AbortController|null=null;
  private audio: AudioContext|null=null;
  private source: AudioBufferSourceNode|null=null;
  private sound=true;
  private voice='Puck';
  private style='Natural Australian English';
  private revision=0;
  private complete: (()=>void)|null=null;
  private pendingBuffer: AudioBuffer|null=null;
  configureVoice(style:string) {this.style=style;}
  async connect(instruction:string, callbacks:LiveCallbacks, voice='Puck') {
    this.active=true;this.instruction=instruction;this.callbacks=callbacks;this.voice=voice;
    if(this.sound) await this.enableAudio();
    if(this.active) callbacks.onReady();
  }
  setSoundEnabled(enabled:boolean) {
    this.sound=enabled;
    if(!enabled){if(this.complete)this.controller?.abort();this.source?.stop();this.source=null;this.pendingBuffer=null;this.complete?.();}
  }
  async enableAudio() {
    if(typeof window==='undefined') return false;
    try {const Audio=window.AudioContext || (window as any).webkitAudioContext;if(!Audio)return false;this.audio ||= new Audio();await this.audio!.resume();
      if(this.pendingBuffer && this.complete){const buffer=this.pendingBuffer;this.pendingBuffer=null;this.play(buffer,this.complete);}
      return this.audio!.state==='running';
    } catch {return false;}
  }
  send(text:string):boolean {
    if(!this.active || !this.callbacks)return false;
    this.controller?.abort();const controller=new AbortController();this.controller=controller;
    const id=++this.revision;const valid=()=>this.active && id===this.revision;
    const timeout=setTimeout(()=>controller.abort(),25000);
    this.history.push({role:'user',parts:[{text}]});
    this.callbacks.onStart();
    void (async()=>{
      const response=await fetch(apiUrl('/api/gemini/models/gemini-3.5-flash-lite:generateContent'),{
        method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},
        body:JSON.stringify({systemInstruction:{parts:[{text:this.instruction}]},contents:this.history.slice(-19),generationConfig:{temperature:0.7,maxOutputTokens:512,thinkingConfig:{thinkingLevel:'minimal'}}}),
      });
      if(!response.ok)throw new Error(`대사를 불러오지 못했어요 (${response.status}).`);
      const data=await response.json();
      const line=(data.candidates?.[0]?.content?.parts || []).filter((p:any)=>!p.thought).map((p:any)=>p.text || '').join('').trim();
      if(!line || /[가-힣]/.test(line))throw new Error('영어 대사를 불러오지 못했어요. 다시 시도해 주세요.');
      if(!valid())return;
      this.history.push({role:'model',parts:[{text:line}]});this.callbacks!.onText(line);
      clearTimeout(timeout);
      let finished=false;
      const finish=()=>{if(finished || !valid())return;finished=true;this.complete=null;this.callbacks?.onComplete();};
      this.complete=finish;
      if(!this.sound){finish();return;}
      const audioTimeout=setTimeout(()=>controller.abort(),18000);
      try {
        const speech=await fetch(apiUrl('/api/gemini/interactions'),{
          method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},
          body:JSON.stringify({model:'gemini-3.8-flash-lite-tts',input:[{type:'user_input',content:[{type:'text',text:line,annotations:[{type:'speech_metadata',style:this.style}]}]}],response_format:{type:'audio'},generation_config:{speech_config:[{voice:this.voice}]}}),
        });
        if(!speech.ok)throw new Error('TTS unavailable');
        const payload=await speech.json();
        const blocks=(payload.steps || []).flatMap((s:any)=>s.content || []).filter((p:any)=>p.type==='audio');
        const block=blocks[blocks.length-1] || payload.output_audio;
        if(!block?.data)throw new Error('No audio');
        if(!valid() || !this.sound){finish();return;}
        if(!this.audio)await this.enableAudio();
        if(!this.audio)throw new Error('Audio unavailable');
        const binary=atob(block.data), bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));
        const buffer=await this.audio.decodeAudioData(bytes.buffer);
        if(!valid() || !this.sound){finish();return;}
        if(this.audio.state!=='running'){this.pendingBuffer=buffer;this.callbacks?.onAudioBlocked?.();return;}
        this.play(buffer,finish);
      } catch {if(valid()){if(this.sound)this.callbacks?.onSpeechUnavailable?.();finish();}} finally {clearTimeout(audioTimeout);}
    })().catch(error=>{if(valid())this.callbacks?.onError(controller.signal.aborted?'응답이 늦어지고 있어요. 다시 시도해 주세요.':error.message);}).finally(()=>clearTimeout(timeout));
    return true;
  }
  private play(buffer:AudioBuffer,finish:()=>void) {
    if(!this.active || !this.audio)return;
    const source=this.audio.createBufferSource();source.buffer=buffer;source.connect(this.audio.destination);source.onended=finish;this.source=source;source.start();
  }
  disconnect() {this.active=false;this.revision++;this.controller?.abort();this.source?.stop();this.source=null;this.complete=null;this.pendingBuffer=null;void this.audio?.close();this.audio=null;}
}
