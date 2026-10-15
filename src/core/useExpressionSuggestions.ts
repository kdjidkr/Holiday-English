import { useEffect, useRef, useState } from 'react';
import type { LearnedPattern } from '../scenarios/types';
import { ExpressionSuggestion, SuggestionContext, suggestExpressions, logSuggestionEvent } from './expressionSuggestions';
export function useExpressionSuggestions(context:SuggestionContext,patterns:LearnedPattern[],enabled:boolean) {
  const [suggestions,setSuggestions]=useState<ExpressionSuggestion[]>([]);
  const revision=useRef(0),cache=useRef(new Map<string,ExpressionSuggestion[]>());
  const key=JSON.stringify({context,patterns:patterns.map(item=>[item.id,item.englishTemplate,item.koreanMeaning,item.expressionKind,item.shiftDay,item.learningKind,item.frame])});
  useEffect(()=>{
    const id=++revision.current;setSuggestions([]);
    if(!enabled || !context.customerLine.trim() || !patterns.length){if(enabled)logSuggestionEvent('skipped',{hasLine:!!context.customerLine.trim(),notes:patterns.length});return;}
    const hit=cache.current.get(key);if(hit){logSuggestionEvent('cache-hit',{shown:hit.length});setSuggestions(hit);return;}
    let finished=false;const started=Date.now();
    const controller=new AbortController(),timeout=setTimeout(()=>{logSuggestionEvent('timeout',{elapsedMs:Date.now()-started});controller.abort();},6000);
    void suggestExpressions(context,patterns,controller.signal).then(result=>{
      if(id!==revision.current || controller.signal.aborted)return;
      if(cache.current.size>=30)cache.current.delete(cache.current.keys().next().value!);
      cache.current.set(key,result);setSuggestions(result);
    }).catch(error=>logSuggestionEvent('failed',{name:error?.name,message:error?.message,aborted:controller.signal.aborted,elapsedMs:Date.now()-started})).finally(()=>{finished=true;clearTimeout(timeout);});
    return()=>{revision.current++;clearTimeout(timeout);if(!finished)logSuggestionEvent('cancelled',{elapsedMs:Date.now()-started});controller.abort();};
  },[key,enabled]);
  return enabled?suggestions:[];
}
