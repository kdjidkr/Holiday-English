import type {LearnedPattern,SentenceFrame} from '../scenarios/types';
export interface FrameProposal extends SentenceFrame {template:string;meaning:string}
const normalize=(s:string)=>s.trim().replace(/[’‘]/g,"'").replace(/[.!?]+$/,'').trim();
export function validateFrame(value:unknown):FrameProposal|undefined {
  const f=value as any;
  if(!f || !['template','meaning','slotHint'].every(k=>typeof f[k]==='string' && f[k].trim()) || f.template.length>160 || !/\[[^\[\]]+\]/.test(f.template) || !Array.isArray(f.variations))return;
  const parts=normalize(f.template).split(/\[[^\[\]]+\]/);
  if(parts.length>5 || parts.join('').trim().length<4)return;
  const pattern=new RegExp('^'+parts.map((s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.+?')+'$','i');
  const seen=new Set<string>();
  const variations=f.variations.filter((v:any)=>{
    if(!v || typeof v.english!=='string' || typeof v.korean!=='string' || !v.english.trim() || !v.korean.trim() || v.english.length>220 || /\[|\]|[가-힣]/.test(v.english) || !pattern.test(normalize(v.english)))return false;
    const key=normalize(v.english).toLowerCase();if(seen.has(key))return false;seen.add(key);return true;
  }).slice(0,3).map((v:any)=>({english:v.english.trim(),korean:v.korean.trim()}));
  if(variations.length<2)return;
  return {template:f.template.trim(),meaning:f.meaning.trim(),slotHint:f.slotHint.trim(),variations};
}
export function frameFitsSource(frame:FrameProposal,source:string):boolean {
  const parts=normalize(frame.template).split(/\[[^\[\]]+\]/);
  const pattern=parts.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+')).join('[^.!?\\n]+?');
  return new RegExp(pattern,'i').test(source.replace(/[’‘]/g,"'"));
}
export function frameFitsSelection(frame:FrameProposal,source:string,start:number,end:number):boolean {
  const parts=normalize(frame.template).split(/\[[^\[\]]+\]/);
  const pattern=parts.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+')).join('[^.!?\\n]+');
  const matches=new RegExp(pattern,'gi');
  const normalized=source.replace(/[’‘]/g,"'");
  let match:RegExpExecArray|null;
  while((match=matches.exec(normalized))){
    if(match.index<end && match.index+match[0].length>start)return true;
    if(!match[0].length)matches.lastIndex++;
  }
  return false;
}
export const FRAME_INSTRUCTIONS=`When a genuinely reusable conversational sentence frame occurs, optionally propose it with a labeled slot such as "It's a bit [상태].". Do not force a frame for every word or convert an arbitrary sentence into a template. Include at most two useful frames across this response. Keep fixed grammar and collocations intact; slotHint must explain in Korean what grammatical/semantic kind of words fits, with any restrictions. Provide 2-3 different short variations with natural English and Korean, all using the exact SAME fixed template with only the slots replaced. Variations are illustrative, not new facts about a speaker. Proposal shape: {"template":"It's a bit [상태].","meaning":"조금 ~하네요.","slotHint":"형용사로 상태를 말해요. chilly, busy, noisy처럼 쓸 수 있어요.","variations":[{"english":"It's a bit chilly.","korean":"조금 쌀쌀하네요."},{"english":"It's a bit busy.","korean":"조금 붐비네요."}]}. Omit frame when no useful, well-grounded pattern exists.`;
export function frameToPattern(frame:FrameProposal,day:number,sourceQuote:string,speaker:string,sourceKorean?:string):LearnedPattern {
  let hash=2166136261;
  for(const c of `${frame.template.toLowerCase()}|${frame.meaning}`)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  return {id:`frame_${hash.toString(16)}`,learningKind:'frame',frame:{slotHint:frame.slotHint,variations:frame.variations},shiftDay:day,englishTemplate:frame.template,koreanMeaning:frame.meaning,sourceQuote,sourceKorean,sourceSpeaker:speaker,explanation:frame.slotHint,slotExamples:frame.variations.map(v=>`${v.english} — ${v.korean}`)};
}
