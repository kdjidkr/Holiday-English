import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export const palette = {
  ink: '#28352F', paper: '#FFFCF7', cream: '#F4F0E8', muted: '#727970',
  coral: '#B7472B', peach: '#FFD4BB', gold: '#F6C45D', line: '#E6E5DD', mint: '#E5EEDD',
};
export const spacing = { page: 20, gap: 12, control: 48 };
export function ActionButton({ children, onPress, secondary = false, disabled = false, small = false }: {
  children: React.ReactNode; onPress: () => void; secondary?: boolean; disabled?: boolean; small?: boolean;
}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={({pressed}) => [styles.button, secondary && styles.secondary, small && styles.small, disabled && {opacity:.45}, pressed && {opacity:.8, transform:[{translateY:1}]}]}>
    <Text style={[styles.label, secondary && {color:palette.ink}]}>{children}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button:{minHeight:56,borderRadius:20,paddingHorizontal:20,paddingVertical:16,backgroundColor:palette.ink,alignItems:'center',justifyContent:'center'},
  secondary:{backgroundColor:palette.mint}, small:{minHeight:48,paddingVertical:12},
  label:{fontSize:16,lineHeight:22,fontWeight:'700',color:palette.paper},
});
