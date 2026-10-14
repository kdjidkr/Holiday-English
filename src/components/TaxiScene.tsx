import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Line, Text as SvgText } from 'react-native-svg';
import { PlayerPortrait } from './CafeScene';

function Streets() {
  return <Svg width="100%" height="100%" viewBox="0 0 2000 600" preserveAspectRatio="xMidYMid slice">
    <Rect width="2000" height="600" fill="#BFDAD4" /><Circle cx="300" cy="110" r="46" fill="#FFDB79" />
    {[200,590,1080,1630].map((x,i) => <G key={x}><Ellipse cx={x} cy={90+i*13} rx="60" ry="15" fill="#E8F0E2" /><Ellipse cx={x+40} cy={83+i*13} rx="31" ry="21" fill="#E8F0E2" /></G>)}
    <Path d="M0 265 Q170 160 330 255 Q510 150 660 252 Q850 130 1070 245 Q1300 140 1530 253 Q1740 150 2000 258 L2000 400 L0 400Z" fill="#98B89F" />
    {[0,360,840,1350,1850].map(x => <G key={x}><Rect x={x+10} y="174" width="51" height="149" rx="3" fill="#B9C6AF" /><Rect x={x+69} y="212" width="56" height="110" rx="3" fill="#90A897" /><Rect x={x+131} y="188" width="45" height="137" rx="3" fill="#A3BBA7" /><Path d={`M${x+31} 192 v100 M${x+94} 228 v78 M${x+151} 204 v100`} stroke="#D8E3CC" strokeWidth="4" strokeDasharray="8 12" /></G>)}
    <Rect x="0" y="310" width="2000" height="62" fill="#9BBEB7" /><Path d="M0 341 Q220 322 500 347 T1000 342 T1500 345 T2000 333" stroke="#CBE0CF" strokeWidth="4" fill="none" />
    <Rect x="0" y="373" width="2000" height="55" fill="#9FB587" />
    {[100,420,800,1250,1630,1950].map(x => <G key={x}><Rect x={x-4} y="285" width="8" height="122" fill="#8D8263" /><Path d={`M${x} 270 q-90 -12 -15 -70 q-8 -58 51 -13 q74 10 18 69 q-7 56 -54 14`} fill="#668F77" /></G>)}
    <Rect x="0" y="428" width="2000" height="180" fill="#888E79" /><Line x1="0" y1="489" x2="2000" y2="489" stroke="#E5DDAB" strokeWidth="5" strokeDasharray="75 65" />
  </Svg>;
}
function Driver({ talking }: { talking: boolean }) {
  return <Svg width="100%" height="100%" viewBox="-120 -135 240 330">
    <Path d="M-75 92 Q-73 8 0 13 Q73 8 75 92 L67 170 L-67 170Z" fill="#698E78" />
    <Path d="M-28 16 L-13 78 L0 54 L15 77 L28 16" fill="#FFFCF7" /><Path d="M-28 17 L0 38 L28 17" fill="none" stroke="#475F4C" strokeWidth="4" />
    <Path d="M-18 -8 L-18 23 Q0 38 18 23 L18 -8Z" fill="#D3A77E" />
    <Circle cx="-59" cy="-39" r="12" fill="#DFA17D" /><Circle cx="59" cy="-39" r="12" fill="#DFA17D" />
    <Rect x="-58" y="-107" width="116" height="128" rx="54" fill="#E0B38D" />
    <Path d="M-59 -64 Q-80 -127 1 -127 Q82 -125 59 -62 L47 -79 Q0 -85 -47 -78Z" fill="#3C6354" /><Path d="M-69 -84 Q0 -104 73 -82 Q54 -63 -9 -72 L-67 -71Z" fill="#2F5145" />
    <Path d="M-33 -48 Q-24 -52 -16 -47 M16 -47 Q24 -52 33 -48" stroke="#746043" strokeWidth="4" strokeLinecap="round" fill="none" />
    <Circle cx="-24" cy="-33" r="5" fill="#4E4538" /><Circle cx="24" cy="-33" r="5" fill="#4E4538" />
    <Path d="M-4 -28 L-8 -10 L5 -9" stroke="#B98A64" strokeWidth="3" fill="none" strokeLinecap="round" />
    <Path d="M-22 -1 Q-12 -12 0 -4 Q12 -12 24 -1 Q12 9 0 2 Q-13 10 -22 -1Z" fill="#7B6B51" />
    {talking ? <Ellipse cx="0" cy="13" rx="9" ry="7" fill="#86503E" /> : <Path d="M-11 12 Q0 24 12 12" stroke="#86503E" strokeWidth="3" fill="none" strokeLinecap="round" />}
    <Rect x="26" y="61" width="33" height="15" rx="3" fill="#E9DFC2" /><SvgText x="42" y="71" fontSize="6" textAnchor="middle" fill="#47604F">CHARLIE</SvgText>
  </Svg>;
}
export function TaxiScene({ gender, talking, moving, mirror }: { gender: 'MALE' | 'FEMALE'; talking: boolean; moving: boolean; mirror: boolean }) {
  const { width } = useWindowDimensions(); const compact = true;
  const travel = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!moving) return;
    const animation = Animated.loop(Animated.timing(travel, { toValue: -width, duration: 22000, easing: Easing.linear, useNativeDriver: true }));
    animation.start(); return () => animation.stop();
  }, [moving, width]);
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([Animated.timing(bob,{toValue:-3,duration:talking?250:1000,useNativeDriver:true}),Animated.timing(bob,{toValue:0,duration:talking?250:1000,useNativeDriver:true})]));
    animation.start(); return () => animation.stop();
  }, [talking]);
  return <View style={styles.world}>
    <Animated.View style={{ width:'200%',height:'100%',transform:[{translateX:travel}] }}><Streets /></Animated.View>
    <Svg width="100%" height="100%" viewBox={compact ? '250 0 620 600' : '0 0 1000 600'} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
      <Path d="M0 0 H1000 V82 Q950 64 928 85 H70 Q36 66 0 80Z" fill="#D2BD8C" />
      <Path d="M0 64 L70 85 L170 360 L104 400 L0 186Z M1000 64 L928 85 L828 360 L896 400 L1000 186Z" fill="#D2BD8C" />
      <Path d="M0 347 Q500 280 1000 347 V600 H0Z" fill="#3F5B50" />
      <Path d="M0 369 Q500 306 1000 369 L1000 423 Q500 370 0 423Z" fill="#758A70" />
      <Rect x="450" y="46" width="100" height="20" rx="8" fill="#C1A77B" /><Path d="M501 58 V98" stroke="#73674E" strokeWidth="7" />
      <Rect x="405" y="88" width="194" height="71" rx="22" fill="#625E4B" /><Rect x="413" y="96" width="178" height="55" rx="16" fill="#BAD1B6" />
      <Path d="M449 118 Q465 103 481 114 M520 122 Q534 112 547 121" stroke="#90AA93" strokeWidth="4" fill="none" />
      <Rect x="128" y="286" width="180" height="165" rx="45" fill="#B7AE88" /><Rect x="109" y="378" width="220" height="244" rx="59" fill="#BFB792" /><Path d="M147 416 Q212 440 292 416" stroke="#9B987A" strokeWidth="4" fill="none" />
      <Rect x="692" y="292" width="160" height="147" rx="40" fill="#B7AE88" /><Rect x="661" y="401" width="225" height="223" rx="57" fill="#BFB792" />
      <Circle cx="774" cy="380" r="65" fill="none" stroke="#263C34" strokeWidth="15" /><Circle cx="774" cy="380" r="19" fill="#263C34" /><Path d="M774 380 L716 354 M774 380 L829 348 M774 380 V437" stroke="#263C34" strokeWidth="12" />
      <G transform="translate(423,383)"><Rect width="153" height="59" rx="9" fill="#29493D" /><SvgText x="76" y="25" fontSize="12" letterSpacing="2" textAnchor="middle" fill="#E9D995">CITY TAXI</SvgText><SvgText x="76" y="43" fontSize="10" textAnchor="middle" fill="#AFC7A7">BNE → WEST END</SvgText></G>
      <G transform="translate(349,438)"><Path d="M0 0 Q10 -25 20 0" fill="none" stroke="#B59160" strokeWidth="5" /><Path d="M0 3 H24 L20 34 L3 34Z" fill="#E0B978" /><Path d="M5 13 H19" stroke="#F1D5A0" strokeWidth="3" /></G>
      <Rect x="365" y="484" width="240" height="130" rx="15" fill="#C9795C" /><Path d="M409 484 V614 M558 484 V614" stroke="#E7A37D" strokeWidth="13" /><Path d="M447 484 V465 Q482 450 517 465 V484" stroke="#8D5949" strokeWidth="8" fill="none" /><Rect x="453" y="523" width="67" height="36" rx="3" fill="#F2E6C8" /><SvgText x="486" y="546" textAnchor="middle" fontSize="11" fill="#4B6754">NEW START</SvgText>
    </Svg>
    <Animated.View pointerEvents="none" style={[styles.driver,compact && {right:'-5%',width:'61%',top:'20%',height:'85%'},{transform:[{translateY:bob}]}]}><Driver talking={talking} /></Animated.View>
    {mirror && <View style={[styles.mirror,compact && {top:'8%',left:'34%'}]}><PlayerPortrait gender={gender} size={compact?82:105} /></View>}
  </View>;
}
const styles=StyleSheet.create({world:{flex:1,backgroundColor:'#BFDAD4',overflow:'hidden'},driver:{position:'absolute',right:'13%',top:'27%',width:'28%',height:'75%'},mirror:{position:'absolute',top:'9%',left:'45%',borderRadius:15,borderWidth:4,borderColor:'#625E4B',backgroundColor:'#C8D7BB',overflow:'hidden'}});
