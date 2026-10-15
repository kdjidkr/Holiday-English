import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Platform,Text} from 'react-native';
import type {TextStyle} from 'react-native';
import type {DialogueSelection} from '../core/expressionAnalysis';
import {dialogueWords,wordSelection} from '../core/dialogueSelection';
import {palette as C} from './design';
// Web selection is drawn by the app, independent of Safari's copy/search menu.
export function MobileDialogueSelection({text,selection,onSelect,onBegin,textStyle}:{text:string;selection:DialogueSelection|null;onSelect:(value:DialogueSelection)=>void;onBegin:()=>void;textStyle?:TextStyle}) {
  const words=useMemo(()=>dialogueWords(text),[text]);
  const root=useRef<HTMLDivElement|null>(null);
  const [range,setRange]=useState<{first:number;last:number}|null>(null),[edges,setEdges]=useState<{x:number;y:number}[]>([]);
  const liveRange=useRef(range);liveRange.current=range;
  const press=useRef<ReturnType<typeof setTimeout>|null>(null);
  const origin=useRef<{x:number;y:number}|null>(null);
  const drag=useRef<'first'|'last'|null>(null);
  const draggingPointer=useRef<number|null>(null);
  const clearPress=()=>{if(press.current)clearTimeout(press.current);press.current=null;};
  useEffect(()=>{
    if(!selection || selection.source!==text){setRange(null);return;}
    const first=words.findIndex(w=>w.start===selection.start),last=words.findIndex(w=>w.end===selection.end);
    setRange(first>=0 && last>=first?{first,last}:null);
  },[selection?.start,selection?.end,selection?.source,text]);
  useEffect(()=>{clearPress();origin.current=null;drag.current=null;draggingPointer.current=null;},[text]);
  useEffect(()=>()=>clearPress(),[]);
  useLayoutEffect(()=>{
    if(Platform.OS!=='web' || !root.current)return;
    const position=()=>{
      const r=liveRange.current,container=root.current;if(!r || !container){setEdges([]);return;}
      const base=container.getBoundingClientRect();
      const first=container.querySelector(`[data-word="${r.first}"]`),last=container.querySelector(`[data-word="${r.last}"]`);
      if(!first || !last)return;
      const a=first.getClientRects()[0],rects=last.getClientRects(),b=rects[rects.length-1];
      if(a && b)setEdges([{x:a.left-base.left,y:a.bottom-base.top},{x:b.right-base.left,y:b.bottom-base.top}]);
    };
    position();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(position);observer?.observe(root.current);
    return()=>observer?.disconnect();
  },[range,text]);
  if(Platform.OS!=='web')return <Text selectable style={[{fontSize:21,lineHeight:31,fontWeight:'600',color:C.ink},textStyle]}>{text}</Text>;
  const locate=(x:number,y:number)=>{
    let best=-1,distance=Infinity;
    root.current?.querySelectorAll<HTMLElement>('[data-word]').forEach(element=>{
      for(const rect of Array.from(element.getClientRects())){
        const dx=Math.max(rect.left-x,0,x-rect.right),dy=Math.max(rect.top-y,0,y-rect.bottom);
        const score=dx*dx+dy*dy*4;
        if(score<distance){distance=score;best=Number(element.dataset.word);}
      }
    });return best;
  };
  const commit=()=>{const r=liveRange.current;if(r){const value=wordSelection(text,r.first,r.last);if(value)onSelect(value);}};
  const change=(edge:'first'|'last',index:number)=>{
    const r=liveRange.current;if(!r || index<0)return;
    const next=edge==='first'?{first:Math.min(index,r.last),last:r.last}:{first:r.first,last:Math.max(index,r.first)};
    liveRange.current=next;setRange(next);
  };
  const start=(event:React.PointerEvent, index:number)=>{
    if(event.button!==0 || drag.current)return;
    clearPress();origin.current={x:event.clientX,y:event.clientY};
    press.current=setTimeout(()=>{press.current=null;const next={first:index,last:index};liveRange.current=next;setRange(next);onBegin();const value=wordSelection(text,index,index);if(value)onSelect(value);},450);
  };
  const handle=(event:React.PointerEvent,edge:'first'|'last')=>{
    event.preventDefault();event.stopPropagation();clearPress();drag.current=edge;draggingPointer.current=event.pointerId;onBegin();event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move=(event:React.PointerEvent)=>{
    if(drag.current){event.preventDefault();change(drag.current,locate(event.clientX,event.clientY-18));}
    else if(origin.current && Math.hypot(event.clientX-origin.current.x,event.clientY-origin.current.y)>10)clearPress();
  };
  const finish=(event:React.PointerEvent)=>{
    clearPress();origin.current=null;
    if(drag.current && draggingPointer.current===event.pointerId){drag.current=null;draggingPointer.current=null;commit();}
  };
  let previous=0;
  return <div ref={root} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onContextMenu={e=>e.preventDefault()} style={{position:'relative',fontSize:textStyle?.fontSize || 21,lineHeight:`${textStyle?.lineHeight || 31}px`,fontWeight:textStyle?.fontWeight || 600,color:C.ink,userSelect:'none',WebkitUserSelect:'none',WebkitTouchCallout:'none',touchAction:'pan-y',whiteSpace:'pre-wrap',overflowWrap:'break-word'} as React.CSSProperties}>
    {words.map((word,index)=>{const whitespace=text.slice(previous,word.start);previous=word.end;return <React.Fragment key={word.start}>{whitespace}<span data-word={index} onPointerDown={e=>start(e,index)} onDoubleClick={()=>{onBegin();const value=wordSelection(text,index,index);if(value)onSelect(value);}} style={{backgroundColor:range && index>=range.first && index<=range.last?'#D7E9DE':undefined,borderRadius:3}}>{word.text}</span></React.Fragment>;})}{text.slice(previous)}
    {range && edges.map((edge,index)=><button key={index} aria-label={index===0?'선택 시작 핸들':'선택 끝 핸들'} onPointerDown={e=>handle(e,index===0?'first':'last')} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();onBegin();const boundary=index===0?'first':'last';change(boundary,Math.max(0,Math.min(words.length-1,liveRange.current![boundary]+(e.key==='ArrowLeft'?-1:1))));commit();}}} style={{position:'absolute',left:edge.x-22,top:edge.y-6,width:44,height:44,padding:0,border:0,background:'transparent',touchAction:'none',cursor:'grab',zIndex:2}}><span style={{position:'absolute',top:0,left:21,width:2,height:22,background:C.coral}}/><span style={{position:'absolute',left:14,top:20,width:16,height:16,borderRadius:16,background:C.coral,boxShadow:'0 1px 3px #0002'}}/></button>)}
  </div>;
}
