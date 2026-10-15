import React,{useState} from 'react';
import {ActivityIndicator,Pressable,Text,View} from 'react-native';
import type {LearnedPattern} from '../scenarios/types';
import {isPatternSaved} from '../core/vaultDictionary';
import {useGameStore} from '../store/gameStore';
import {palette as C} from './design';
export function SaveNoteButton({pattern}:{pattern:LearnedPattern}){
  const notes=useGameStore(state=>state.vaultPatterns),save=useGameStore(state=>state.savePatternToVault);
  const [saving,setSaving]=useState(false),[error,setError]=useState(false);
  const exists=isPatternSaved(notes,pattern);
  const submit=async()=>{if(saving || exists)return;setSaving(true);setError(false);try{await save(pattern);}catch{setError(true);}finally{setSaving(false);}};
  return <View style={{alignItems:'center',width:48}}><Pressable accessibilityRole="button" accessibilityLabel={`${pattern.englishTemplate} ${saving?'중복 확인 중':exists?'저장됨':'표현노트에 저장'}`} accessibilityState={{disabled:saving || exists,busy:saving}} disabled={saving || exists} onPress={()=>{void submit();}} style={{width:48,height:48,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:exists?C.mint:C.cream}}>{saving?<ActivityIndicator size="small" color={C.ink}/>:<Text style={{fontSize:22,color:C.ink}}>{exists?'✓':'＋'}</Text>}</Pressable>{error && <Text style={{fontSize:10,color:C.coral}}>재시도</Text>}</View>;
}
