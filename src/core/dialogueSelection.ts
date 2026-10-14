import type {DialogueSelection} from './expressionAnalysis';
export interface DialogueWord {text:string;start:number;end:number}
export function dialogueWords(source:string):DialogueWord[] {
  return Array.from(source.matchAll(/\S+/g),m=>({text:m[0],start:m.index!,end:m.index!+m[0].length}));
}
export function wordSelection(source:string,first:number,last:number):DialogueSelection|null {
  const words=dialogueWords(source);
  if(!words.length || first<0 || last<first || last>=words.length)return null;
  const start=words[first].start,end=words[last].end;
  return {source,start,end,selected:source.slice(start,end)};
}
