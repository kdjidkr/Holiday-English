import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { CustomerPersona, DailyEvent } from '../scenarios/types';
import { SessionPhase } from '../core/gameRules';

const portraitImages: ImageSourcePropType[] = [
  require('../../assets/customer-portraits/jack.png'),
  require('../../assets/customer-portraits/chloe.png'),
  require('../../assets/customer-portraits/liam.png'),
  require('../../assets/customer-portraits/emma.png'),
  require('../../assets/customer-portraits/oliver.png'),
  require('../../assets/customer-portraits/sophie.png'),
  require('../../assets/customer-portraits/noah.png'),
  require('../../assets/customer-portraits/mia.png'),
  require('../../assets/customer-portraits/dave.png'),
  require('../../assets/customer-portraits/zara.png'),
  require('../../assets/customer-portraits/ethan.png'),
  require('../../assets/customer-portraits/riley.png'),
  require('../../assets/customer-portraits/kai.png'),
  require('../../assets/customer-portraits/daniel.png'),
];
const ownerPortraits: Record<string, ImageSourcePropType> = {
  npc_maggie: require('../../assets/cafe-owner/maggie.png'),
};
const homePortraits: Record<'MALE' | 'FEMALE', ImageSourcePropType> = {
  FEMALE: require('../../assets/player-portraits/female.png'),
  MALE: require('../../assets/player-portraits/male.png'),
};
function portraitFor(customer?: CustomerPersona): ImageSourcePropType | undefined {
  if (customer && ownerPortraits[customer.id]) return ownerPortraits[customer.id];
  return customer?.portraitIndex === undefined ? undefined : portraitImages[customer.portraitIndex];
}
export function CustomerPortrait({ customer, size = 70 }: { customer: CustomerPersona; size?: number }) {
  const portrait = portraitFor(customer);
  const initials = customer.name.trim().slice(0, 1).toUpperCase();
  return <View style={{width:size,height:size,borderRadius:size/2,overflow:'hidden',backgroundColor:'#E8DEC6',alignItems:'center',justifyContent:'center'}}>
    {portrait ? <Image source={portrait} resizeMode="contain" style={{width:size,height:size}} /> : <Text style={{fontSize:size*0.4,fontWeight:'700',color:'#6E776E'}}>{initials}</Text>}
  </View>;
}
export function PlayerPortrait({ gender, size = 80 }: { gender: 'MALE' | 'FEMALE'; size?: number }) {
  return <View style={{width:size,height:size,borderRadius:size/2,overflow:'hidden',backgroundColor:'#C9D5B8'}}><Image source={gender==='FEMALE'?homePortraits.FEMALE:homePortraits.MALE} resizeMode="contain" style={{width:'100%',height:'100%'}} /></View>;
}
function Plant({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <G transform={`translate(${x},${y}) scale(${scale})`}>
    <Path d="M0 0 Q-8 -60 4 -118 M0 -15 Q-35 -55 -46 -73 M0 -40 Q28 -69 43 -87" stroke="#536951" strokeWidth="5" fill="none" />
    <Ellipse cx="-29" cy="-69" rx="12" ry="33" transform="rotate(-42 -29 -69)" fill="#779269" />
    <Ellipse cx="26" cy="-81" rx="13" ry="35" transform="rotate(42 26 -81)" fill="#68885D" />
    <Ellipse cx="5" cy="-117" rx="14" ry="35" transform="rotate(10 5 -117)" fill="#8BA277" />
    <Path d="M-28 -3 L29 -3 L20 43 Q0 52 -20 43Z" fill="#C98164" /><Ellipse cx="0" cy="-3" rx="29" ry="8" fill="#DF9D7C" />
  </G>;
}
export function CafeScene({ customer, phase = 'CHATTING', talking = false, ready = false, home = false, weather = 'sunny', gender = 'FEMALE' }: { customer?: CustomerPersona; phase?: SessionPhase; talking?: boolean; ready?: boolean; home?: boolean; weather?: DailyEvent['weather']; gender?: string }) {
  const [bounds,setBounds] = useState({width:480,height:300});
  const sceneScale = Math.min(bounds.width/480,bounds.height/300);
  const position = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const cup = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (phase === 'ARRIVING') { position.setValue(230); Animated.timing(position, { toValue: 0, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }
    else if (phase === 'DEPARTING') Animated.timing(position, { toValue: 480, duration: 1300, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
    else if (phase !== 'DONE') position.setValue(0);
  }, [phase, customer?.id]);
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([Animated.timing(bob, { toValue: talking ? -3 : -1, duration: talking ? 240 : 1300, useNativeDriver: true }), Animated.timing(bob, { toValue: 0, duration: talking ? 240 : 1300, useNativeDriver: true })]));
    animation.start(); return () => animation.stop();
  }, [talking]);
  useEffect(() => { const animation = Animated.loop(Animated.sequence([Animated.timing(cup, { toValue: -5, duration: 1000, useNativeDriver: true }), Animated.timing(cup, { toValue: 0, duration: 1000, useNativeDriver: true })])); animation.start(); return () => animation.stop(); }, []);
  return <View style={styles.world} onLayout={({nativeEvent:{layout}})=>setBounds({width:layout.width,height:layout.height})}>
    <View style={{position:'absolute',width:480,height:300,left:(bounds.width-480)/2,top:(bounds.height-300)/2,transform:[{scale:sceneScale}]}}>
    <Svg width="100%" height="100%" viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice">
      <Rect width="480" height="300" fill="#FFE4CF" />
      <Path d="M0 0H480V26H0Z" fill="#F9C7AB" />
      <Rect x="-28" y="39" width="192" height="222" rx="80" fill="#FFFCF7" />
      <Rect x="-16" y="50" width="168" height="204" rx="70" fill={weather === 'rainy' || weather === 'overcast' ? '#B8C9C9' : weather === 'smoky' ? '#D6C4A8' : weather === 'humid' ? '#D8D8B7' : '#BFDAD4'} />
      {weather !== 'rainy' && weather !== 'overcast' && <Circle cx="70" cy="100" r="29" fill={weather === 'smoky' ? '#DABF8B' : weather === 'humid' ? '#F0D18A' : '#FFDB79'} opacity={weather === 'smoky' || weather === 'humid' ? 0.82 : 1} />}
      {(weather === 'rainy' || weather === 'overcast' || weather === 'breezy') && <G fill={weather === 'rainy' ? '#839A9A' : '#F1F0E7'} opacity={weather === 'rainy' ? 0.95 : 0.92}><Ellipse cx="53" cy="98" rx="23" ry="12"/><Ellipse cx="73" cy="91" rx="21" ry="16"/><Ellipse cx="94" cy="99" rx="20" ry="11"/></G>}
      {weather === 'humid' && <G fill="#FFF1C2" opacity=".24"><Path d="M-10 119H150V143H-10Z"/><Path d="M-10 157H150V174H-10Z"/></G>}
      {weather === 'smoky' && <G fill="#E8D7B9" opacity=".48"><Path d="M-10 116Q40 104 160 121V145Q60 132 -10 150Z"/><Path d="M-10 161Q66 143 160 162V183Q70 172 -10 190Z"/></G>}
      {weather === 'rainy' && <G stroke="#E8F2F1" strokeWidth="2.2" opacity=".9" strokeLinecap="round">{[12,35,59,83,107,131].map((x,i)=><Path key={x} d={`M${x} ${124+(i%2)*19}l-5 13 M${x+8} ${164+(i%2)*16}l-5 13`}/>)}</G>}
      {weather === 'breezy' && <G stroke="#F6F0DF" strokeWidth="2.3" fill="none" opacity=".8" strokeLinecap="round"><Path d="M9 138Q36 129 56 138M29 154Q61 144 91 153M4 170Q34 162 48 169"/></G>}
      <Path d="M-16 213 Q36 163 83 196 Q123 160 152 183 V254 H-16Z" fill="#80ADA1" />
      <Path d="M-16 238 Q67 197 152 221 V254 H-16Z" fill="#4E8477" />
      <Path d="M70 50V254 M-16 179H152" stroke="#FFFCF7" strokeWidth="9" />
      <Rect x="193" y="24" width="160" height="68" rx="20" fill="#FFFCF7" />
      <Circle cx="226" cy="58" r="14" fill="#F6C45D" />
      <Path d="M226 38V34 M226 82V78 M206 58H202 M250 58H246" stroke="#D39A37" strokeWidth="3" strokeLinecap="round" />
      <SvgText x="290" y="55" fontSize="14" fontWeight="800" fill="#28352F" textAnchor="middle">sunny</SvgText>
      <SvgText x="290" y="73" fontSize="14" fontWeight="800" fill="#28352F" textAnchor="middle">side</SvgText>
      <Rect x="379" y="70" width="122" height="183" rx="58" fill="#F6F2E6" />
      <Rect x="391" y="81" width="98" height="172" rx="48" fill="#A9C4A1" />
      <Path d="M391 207 Q430 169 489 193V253H391Z" fill="#6D987C" />
      <Rect x="179" y="181" width="178" height="10" rx="5" fill="#B97858" />
      <G transform="translate(334,174) scale(.37)"><Plant x={0} y={0} /></G>
      <Rect x="197" y="153" width="23" height="28" rx="7" fill="#FFF9F0" /><Path d="M220 158Q237 156 230 172H220" fill="none" stroke="#FFF9F0" strokeWidth="5" />
      <Rect y="263" width="480" height="37" fill="#E6B590" />
    </Svg>
    {home && <View pointerEvents="none" style={{position:'absolute',left:'26%',top:0,width:'48%',height:'82%'}}><Image source={gender === 'FEMALE' ? homePortraits.FEMALE : homePortraits.MALE} resizeMode="contain" style={{width:'100%',height:'100%'}} /></View>}
    {customer && phase !== 'DONE' && <Animated.View pointerEvents="none" style={[styles.person, { left: portraitFor(customer) ? '26%' : '29%', width: portraitFor(customer) ? '48%' : '42%', top: '0%', height: '82%' }, { transform: [{ translateX: position }, { translateY: bob }] }]}>
      {portraitFor(customer) ? <Image source={portraitFor(customer)} resizeMode="contain" style={{width:'100%',height:'100%'}} /> : <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:56,fontWeight:'700',color:'#6E776E'}}>{customer.name.slice(0,1)}</Text></View>}
    </Animated.View>}
    <Svg pointerEvents="none" width="100%" height="23%" viewBox="0 0 480 70" preserveAspectRatio="none" style={{position:'absolute',bottom:0}}>
      <Rect x="-5" y="17" width="490" height="60" rx="10" fill="#C98C6B" />
      <Rect x="-5" y="10" width="490" height="14" rx="7" fill="#F4CBA7" />
      <Path d="M0 27H480" stroke="#A86E51" strokeWidth="3" />
      <G transform="translate(60,2)"><Rect x="-25" y="-27" width="58" height="40" rx="8" fill="#57786B" /><Rect x="-18" y="-20" width="44" height="15" rx="4" fill="#A9C4A1" /><Circle cx="-9" cy="-13" r="3" fill="#FFFCF7" /><Path d="M-9 0H16" stroke="#FFFCF7" strokeWidth="3" /></G>
      {ready && <G transform="translate(357,0)"><Ellipse cx="0" cy="12" rx="24" ry="4" fill="#B77F61"/><Path d="M-16 -19H16L12 12H-12Z" fill="#FFFCF7"/><Rect x="-19" y="-24" width="38" height="6" rx="3" fill="#28352F"/><Path d="M-14 -5H14" stroke="#F3B291" strokeWidth="9"/></G>}
    </Svg>
    </View>
  </View>;
}
const styles = StyleSheet.create({ world: { flex: 1, overflow: 'hidden', backgroundColor: '#FFE4CF' }, person: { position: 'absolute', left: '44%', top: '10%', width: '28%', height: '88%' }, ready: { position: 'absolute', left: '58%', top: '65%' } });
