import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { palette as C } from './design';
import { appStyles as s } from './appStyles';
export function BottomTabs({active,onWork,onNotes}:{active:'work'|'notes';onWork:()=>void;onNotes:()=>void}) {
  return <View accessibilityRole="tablist" style={s.homeNav}>
    {[{id:'work',label:'출근하기',icon:'☀',action:onWork},{id:'notes',label:'표현노트',icon:'◇',action:onNotes},{id:'history',label:'출근기록',icon:'≡'},{id:'home',label:'나의 집',icon:'⌂'}].map(tab=><Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.action?tab.label:`${tab.label}, 준비 중`} accessibilityState={{selected:active===tab.id,disabled:!tab.action}} disabled={!tab.action} onPress={tab.action} style={[s.navItem,{opacity:tab.action?1:.3}]}><Text style={[s.navIcon,{color:active===tab.id?C.coral:C.ink}]}>{tab.icon}</Text><Text style={[s.navLabel,{color:active===tab.id?C.coral:C.ink}]}>{tab.label}</Text></Pressable>)}
  </View>;
}
