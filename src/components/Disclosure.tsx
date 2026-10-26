import React, {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {palette as C} from './design';

export function Disclosure({label,children}:{label:string;children:React.ReactNode}) {
  const [open,setOpen]=useState(false);
  return <View><Pressable accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setOpen(value=>!value)} style={{minHeight:44,flexDirection:'row',alignItems:'center',gap:8}}><Text style={{fontSize:13,fontWeight:'600',color:C.muted}}>{label}</Text><Text style={{color:C.muted}}>{open?'−':'+'}</Text></Pressable>{open && <View style={{gap:10,paddingBottom:8}}>{children}</View>}</View>;
}
