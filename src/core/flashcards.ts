import type { LearnedPattern } from '../scenarios/types';
export type NoteKind='word'|'phrase'|'sentence';
export const NOTE_KINDS: {id:NoteKind;label:string}[]=[{id:'word',label:'단어'},{id:'phrase',label:'표현'},{id:'sentence',label:'문장'}];
export function classifyNote(item:LearnedPattern):NoteKind {
  if(item.expressionKind)return item.expressionKind;
  if(/[.!?…]["')\]]*$/u.test(item.englishTemplate.trim()))return 'sentence';
  return (item.selectedText || item.englishTemplate).trim().split(/\s+/).length===1?'word':'phrase';
}
export function noteDays(notes:LearnedPattern[]):number[] {return [...new Set(notes.map(n=>n.shiftDay))].sort((a,b)=>a-b);}
export function selectCards(notes:LearnedPattern[],kinds:NoteKind[],days:number[]):LearnedPattern[] {
  const seen=new Set<string>();
  return notes.filter(n=>{
    if(!kinds.includes(classifyNote(n)) || !days.includes(n.shiftDay) || !n.englishTemplate.trim() || !n.koreanMeaning.trim() || seen.has(n.id))return false;
    seen.add(n.id);return true;
  });
}
export function shuffleCards(cards:LearnedPattern[],random:()=>number=Math.random):LearnedPattern[] {
  const result=[...cards];for(let i=result.length-1;i>0;i--){const j=Math.min(i,Math.floor(random()*(i+1)));[result[i],result[j]]=[result[j],result[i]];}return result;
}
export interface CardSession {cards:LearnedPattern[];index:number;retry:LearnedPattern[];round:number;seen:string[];again:string[];done:boolean}
export function startCards(cards:LearnedPattern[]):CardSession {return {cards,index:0,retry:[],round:1,seen:[],again:[],done:!cards.length};}
export function rateCard(session:CardSession,known:boolean):CardSession {
  if(session.done)return session;
  const card=session.cards[session.index];
  const seen=[...new Set([...session.seen,card.id])],again=known?session.again:[...new Set([...session.again,card.id])];
  const retry=known?session.retry:[...session.retry,card];
  if(session.index+1<session.cards.length)return {...session,index:session.index+1,retry,seen,again};
  if(retry.length)return {...session,cards:retry,index:0,retry:[],round:session.round+1,seen,again};
  return {...session,seen,again,retry:[],done:true};
}
// Moving forward without revealing an answer is not a correct/incorrect assessment.
export function skipCard(session:CardSession):CardSession {
  if(session.done)return session;
  if(session.index+1<session.cards.length)return {...session,index:session.index+1};
  if(session.retry.length)return {...session,cards:session.retry,index:0,retry:[],round:session.round+1};
  return {...session,done:true};
}
