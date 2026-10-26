import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { palette as C } from './design';
import { appStyles as s } from './appStyles';
export function BottomTabs({active,onWork,onNotes}:{active:'work'|'notes';onWork:()=>void;onNotes:()=>void}) {
  return <View accessibilityRole="tablist" style={s.homeNav}>
    {[{id:'work',label:'출근하기',icon:'☀',action:onWork},{id:'notes',label:'표현노트',icon:'◇',action:onNotes}].map(tab=><Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{selected:active===tab.id}} onPress={tab.action} style={s.navItem}><Text style={[s.navIcon,{color:active===tab.id?C.coral:C.ink}]}>{tab.icon}</Text><Text style={[s.navLabel,{color:active===tab.id?C.coral:C.ink}]}>{tab.label}</Text></Pressable>)}
  </View>;
}
