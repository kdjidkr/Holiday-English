import {Disclosure} from './Disclosure';
import { palette as C } from './design';
import React, { useState } from 'react';
import { Modal, SafeAreaView, ScrollView, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

export function GameMenu({ soundEnabled, onSoundChange, translationEnabled, onTranslationChange, onJournal, onReplay, onHint, onLeave, voiceMode, onVoiceMode, prepTimeSeconds, onPrepTime }: {
  voiceMode?:'tts'|'live';onVoiceMode?:(mode:'tts'|'live')=>void;prepTimeSeconds?:number;onPrepTime?:(seconds:number)=>void;
  soundEnabled: boolean; onSoundChange: (enabled: boolean) => void;
  translationEnabled?: boolean; onTranslationChange?: (enabled: boolean) => void;
  onJournal?: () => void; onReplay?: () => void; onHint?: () => void; onLeave?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const action = (callback: () => void) => { setOpen(false); callback(); };
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="메뉴 열기" onPress={() => setOpen(true)} style={styles.trigger}><Text style={styles.triggerText}>···</Text></Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={styles.shade}>
        <Pressable accessibilityLabel="메뉴 닫기" style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        <ScrollView style={styles.sheet} contentContainerStyle={{padding:24,paddingBottom:28}} bounces={false}>
          <View style={styles.heading}><Text style={styles.title}>설정</Text><Pressable accessibilityRole="button" accessibilityLabel="메뉴 닫기" style={styles.close} onPress={() => setOpen(false)}><Text style={styles.closeText}>×</Text></Pressable></View>
          <View style={styles.row}><Text style={styles.label}>{'소리'}</Text><Switch accessibilityLabel={'소리'} value={soundEnabled} onValueChange={onSoundChange} trackColor={{false:'#DDDCCE',true:'#679E73'}} /></View>
          {onVoiceMode && <View style={styles.row}><Text style={styles.label}>대화 음성</Text><View style={{flexDirection:'row',gap:8}}>{(['tts','live'] as const).map(mode=><Pressable key={mode} accessibilityRole="radio" accessibilityState={{checked:voiceMode===mode}} onPress={()=>onVoiceMode(mode)} style={{padding:12,borderRadius:12,backgroundColor:voiceMode===mode?C.mint:C.cream}}><Text style={{color:C.ink,fontWeight:'700'}}>{mode==='tts'?'일반':'실시간'}</Text></Pressable>)}</View></View>}
          {onPrepTime && <Disclosure label="고급 설정"><View style={[styles.row,{flexDirection:'column',alignItems:'flex-start',gap:10,paddingVertical:12}]}><Text style={styles.label}>음료 제조 시간</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{[0,60,90,120].map(seconds=><Pressable key={seconds} accessibilityRole="radio" accessibilityState={{checked:prepTimeSeconds===seconds}} onPress={()=>onPrepTime(seconds)} style={{padding:12,borderRadius:12,backgroundColor:prepTimeSeconds===seconds?C.mint:C.cream}}><Text style={{color:C.ink}}>{seconds?`${seconds}초`:'메뉴별'}</Text></Pressable>)}</View></View></Disclosure>}
          {onTranslationChange && <View style={styles.row}><Text style={styles.label}>한국어 해석</Text><Switch accessibilityLabel="한국어 해석" value={translationEnabled} onValueChange={onTranslationChange} trackColor={{false:'#DDDCCE',true:'#679E73'}} /></View>}
          {([{label:'표현노트',callback:onJournal},{label:'이야기 힌트',callback:onHint},{label:'첫 만남 다시 보기',callback:onReplay},{label:'카페로 돌아가기',callback:onLeave}] as const).map(item=>item.callback && <Pressable accessibilityRole="button" key={item.label} style={styles.row} onPress={()=>action(item.callback!)}><Text style={styles.label}>{item.label}</Text><Text style={styles.chevron}>›</Text></Pressable>)}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  trigger:{width:48,height:48,alignItems:'center',justifyContent:'center',borderRadius:16,backgroundColor:C.cream},triggerText:{fontSize:23,color:C.ink},
  shade:{flex:1,backgroundColor:'#19392B70',justifyContent:'flex-end',alignItems:'center'},sheet:{width:'100%',maxWidth:480,backgroundColor:C.paper,borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:'90%',flexGrow:0},
  heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14},title:{fontSize:22,fontWeight:'800',color:C.ink},close:{width:44,height:44,alignItems:'center',justifyContent:'center'},closeText:{fontSize:30,color:'#758272'},
  row:{minHeight:60,flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#ECEADB'},label:{fontSize:17,fontWeight:'600',color:C.ink},chevron:{fontSize:26,color:'#83907A'},
});
