import React,{useEffect,useRef,useState} from 'react';
import {Platform,StyleSheet,Text,TextInput,View} from 'react-native';
import type {TestQuestion} from '../core/vocabularyTest';
import {answerWords,fillSelectedAnswer,revealedWordPrefix} from '../core/vocabularyTest';
import {palette as C} from './design';
interface Props {question:TestQuestion;solved:boolean[];activeIndex:number;drafts:string[];onSelect:(index:number)=>void;revealed:number[];value:string;disabled:boolean;complete:boolean;onChange:(value:string)=>void;onSubmit:()=>void}
const font=Platform.OS==='web'?'-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", sans-serif':'System';
export function InlineTestAnswer({question,solved,activeIndex,drafts,onSelect,revealed,value,disabled,complete,onChange,onSubmit}:Props){
  const active=useRef<any>(null),words=answerWords(question.answer);
  const [invalidSlot,setInvalidSlot]=useState<number|null>(null);
  useEffect(()=>setInvalidSlot(null),[question.noteId,question.signature]);
  const change=(text:string)=>{
    if(disabled || complete)return;
    const result=fillSelectedAnswer(question.answer,solved,activeIndex,text);
    setInvalidSlot(/\s$/.test(text) && !!result.input.trim()?result.activeIndex:null);
    onChange(text);
  };
  const submit=()=>{
    if(disabled || complete || !value.trim())return;
    const result=fillSelectedAnswer(question.answer,solved,activeIndex,value+' ');
    if(result.solved[activeIndex]){setInvalidSlot(null);onChange(value+' ');return;}
    setInvalidSlot(activeIndex);onSubmit();
  };
  const hint=revealedWordPrefix(words[activeIndex] || '',revealed[activeIndex] || 0);
  useEffect(()=>{if(!disabled && !complete)active.current?.focus();},[question.noteId,question.signature,activeIndex,hint,disabled,complete]);
  const pieces:React.ReactNode[]=[];let previous=0,index=0;
  for(const match of question.answer.matchAll(/[a-z0-9]+(?:['’\-][a-z0-9]+)*/gi)){
    const at=match.index!,word=match[0],slot=index++;
    pieces.push(question.answer.slice(previous,at));previous=at+word.length;
    if(complete || !!solved[slot]){const matched=!!solved[slot] && !question.prefilled?.includes(slot);pieces.push(Platform.OS==='web'?React.createElement('span',{key:slot,style:{color:matched?'#326441':C.ink}},word):<Text key={slot} style={[s.filled,matched && {color:'#326441'}]}>{word}</Text>);continue;}
    const placeholder=revealedWordPrefix(word,revealed[slot] || 0),current=slot===activeIndex;
    if(Platform.OS==='web'){
      pieces.push(React.createElement('span',{key:slot,style:{display:'inline-block',position:'relative',verticalAlign:'baseline',whiteSpace:'pre',borderBottom:`2px solid ${invalidSlot===slot?'#B13D32':current?C.ink:C.muted}`,lineHeight:'36px',boxSizing:'content-box'}},
        React.createElement('span',{'aria-hidden':true,style:{visibility:'hidden',whiteSpace:'pre'}},word),
        React.createElement('input',{
          ref:(element:HTMLInputElement|null)=>{if(current)active.current=element;},
          'aria-label':`테스트 ${slot+1}번째 단어`,'aria-invalid':invalidSlot===slot,value:current?value:(drafts[slot] || ''),placeholder,
          readOnly:disabled,tabIndex:0,autoComplete:'off',autoCapitalize:'none',autoCorrect:'off',spellCheck:false,maxLength:400,
          onFocus:()=>{if(!current)onSelect(slot);},
          onChange:(event:React.ChangeEvent<HTMLInputElement>)=>change(event.target.value),
          onKeyDown:(event:React.KeyboardEvent<HTMLInputElement>)=>{
            if(event.key==='Enter'){event.preventDefault();submit();}
            if(event.key==='Backspace' && !value){event.preventDefault();}
          },
          style:{position:'absolute',inset:0,width:'100%',height:'100%',minWidth:0,boxSizing:'border-box',font:'inherit',lineHeight:'inherit',letterSpacing:'inherit',padding:0,margin:0,border:0,borderRadius:0,outline:'none',background:'transparent',color:C.ink,caretColor:C.coral,appearance:'none'},
        })));
    }else{
      pieces.push(<View key={slot} style={[s.slot,{borderBottomColor:invalidSlot===slot?'#B13D32':current?C.ink:C.muted}]}><Text accessible={false} style={[s.measure,{opacity:0}]}>{word}</Text><TextInput ref={current?active:undefined} accessibilityLabel={`테스트 ${slot+1}번째 단어`} value={current?value:(drafts[slot] || '')} placeholder={placeholder} placeholderTextColor={C.muted} editable={!disabled} onFocus={()=>onSelect(slot)} onChangeText={change} onSubmitEditing={submit} blurOnSubmit={false} autoCorrect={false} autoCapitalize="none" spellCheck={false} style={s.nativeInput}/></View>);
    }
  }
  pieces.push(question.answer.slice(previous));
  // Punctuation belongs directly after the last word, even if an old generated
  // question included an unnecessary leading space in its suffix.
  const suffix=question.suffix.replace(/^\s+(?=[.,!?;:])/,'');
  if(Platform.OS==='web')return React.createElement('p',{style:{margin:0,fontFamily:font,fontSize:23,lineHeight:'44px',fontWeight:400,letterSpacing:'-.4px',color:C.ink,overflowWrap:'anywhere'}},question.prefix,...pieces,suffix);
  return <View style={s.nativeRow}><Text style={s.measure}>{question.prefix}</Text>{pieces.map((piece,i)=>typeof piece==='string'?<Text key={`text-${i}`} style={s.measure}>{piece}</Text>:piece)}<Text style={s.measure}>{suffix}</Text></View>;
}
const s=StyleSheet.create({measure:{fontFamily:font,fontSize:23,lineHeight:36,fontWeight:'400',letterSpacing:-.4,color:C.ink},filled:{fontFamily:font,fontSize:23,lineHeight:36,color:C.ink},nativeRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'baseline'},slot:{position:'relative',borderBottomWidth:2,alignSelf:'flex-start'},nativeInput:{position:'absolute',top:0,bottom:0,left:0,right:0,fontFamily:font,fontSize:23,lineHeight:36,letterSpacing:-.4,padding:0,color:C.ink}});
