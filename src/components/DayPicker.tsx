import React from 'react';
import {FlatList,Modal,Pressable,Text,View} from 'react-native';
import {palette as C} from './design';
export function DayPicker({visible,days,value,onSelect,onClose,selectedDays,onDaysChange}:{visible:boolean;days:number[];value:number|null;onSelect:(day:number|null)=>void;onClose:()=>void;selectedDays?:number[];onDaysChange?:(days:number[])=>void}) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:24,backgroundColor:'#172A2370'}}>
      <Pressable accessibilityRole="button" accessibilityLabel="일차 선택 취소" onPress={onClose} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
      <View style={{width:'100%',maxWidth:360,maxHeight:'70%',backgroundColor:C.paper,borderRadius:24,padding:20}}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8}}><Text accessibilityRole="header" style={{fontSize:20,fontWeight:'700',color:C.ink}}>일차 선택</Text><Pressable accessibilityRole="button" accessibilityLabel="일차 선택 닫기" onPress={onClose} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:24,color:C.muted}}>×</Text></Pressable></View>
        <FlatList<number|null> data={[null,...days.slice().reverse()]} initialNumToRender={12} keyExtractor={day=>day===null?'all':String(day)} renderItem={({item:day})=>{
          const selected=selectedDays ? day===null ? days.length>0 && days.every(d=>selectedDays.includes(d)) : selectedDays.includes(day) : value===day;
          return <Pressable accessibilityRole={selectedDays?'checkbox':'button'} accessibilityState={selectedDays?{checked:selected}:{selected}} onPress={()=>{
            if(selectedDays && onDaysChange){onDaysChange(day===null ? selected?[]:[...days] : selected?selectedDays.filter(d=>d!==day):[...selectedDays,day]);}
            else{onSelect(day);onClose();}
          }} style={{minHeight:50,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderRadius:12,backgroundColor:selected?C.mint:'transparent'}}><Text style={{fontSize:15,fontWeight:selected?'600':'400',color:C.ink}}>{day===null?'전체 일차':`${day}일차`}</Text>{selected && <Text style={{color:C.ink,fontSize:18}}>✓</Text>}</Pressable>;
        }} />
        {!!selectedDays && <Pressable accessibilityRole="button" onPress={onClose} style={{minHeight:48,marginTop:12,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:C.ink}}><Text style={{fontSize:14,fontWeight:'600',color:C.paper}}>적용</Text></Pressable>}

      </View>
    </View>
  </Modal>;
}
