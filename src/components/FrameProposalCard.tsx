import {Disclosure} from './Disclosure';
import {SaveNoteButton} from './SaveNoteButton';
import React from 'react';
import {Text,View} from 'react-native';
import type {FrameProposal} from '../core/sentenceFrames';
import {frameToPattern} from '../core/sentenceFrames';
import {palette as C} from './design';
export function FrameProposalCard({frame,day,source,speaker,sourceKorean}:{frame:FrameProposal;day:number;source:string;speaker:string;sourceKorean?:string}) {
  const pattern=frameToPattern(frame,day,source,speaker,sourceKorean);
  return <View style={{padding:16,borderRadius:18,backgroundColor:C.mint,gap:8}}>
    <Text style={{fontSize:11,fontWeight:'700',color:C.coral}}>문장 틀</Text>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Text selectable style={{flex:1,fontSize:18,lineHeight:27,fontWeight:'700',color:C.ink}}>{frame.template}</Text><SaveNoteButton pattern={pattern}/></View>
    <Text style={{fontSize:14,lineHeight:22,color:C.ink}}>{frame.meaning}</Text>
    <Disclosure label="예문과 설명"><Text style={{fontSize:12,lineHeight:20,color:C.muted}}>{frame.slotHint}</Text>
    {frame.variations.map(v=><View key={v.english} style={{gap:2,paddingTop:5}}><Text style={{fontSize:14,lineHeight:22,color:C.ink}}>{v.english}</Text><Text style={{fontSize:12,lineHeight:19,color:C.muted}}>{v.korean}</Text></View>)}</Disclosure>
  </View>;
}
