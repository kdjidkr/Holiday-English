import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { CustomerPersona, DailyEvent } from '../scenarios/types';
import { SessionPhase } from '../core/gameRules';

const looks = [
  { gender:'MALE', skin: '#CE956F', hair: '#503A2D', shirt: '#548C86', face: 'M-57 -73 Q-55 -95 0 -96 Q55 -95 57 -73 L57 -18 Q56 16 39 21 L-39 21 Q-56 16 -57 -18Z', fringe: 'M-49 -53 Q-48 -109 9 -98 Q55 -98 51 -44 L31 -62 L7 -55 L-21 -68 Z', brow: 'M-32 -42 Q-23 -49 -14 -42 M14 -42 Q23 -49 32 -42', eyeY: -27, eyeRx: 4, eyeRy: 6, nose: 'M-1 -17 L-5 -7 L3 -6', smile: 'M-10 1 Q0 12 11 1' },
  { gender:'FEMALE', skin: '#EDBA98', hair: '#543D35', shirt: '#CC7859', face: 'M-55 -75 Q-49 -101 0 -101 Q49 -101 55 -75 Q61 -17 46 10 Q29 27 0 23 Q-29 27 -46 10 Q-61 -17 -55 -75Z', fringe: 'M-58 -29 Q-75 -110 1 -109 Q74 -108 60 -20 L46 -54 Q12 -48 -22 -74 L-46 -46 Z', brow: 'M-33 -42 Q-24 -48 -15 -41 M15 -41 Q24 -48 33 -42', eyeY: -27, eyeRx: 4, eyeRy: 5, nose: 'M-2 -17 Q-5 -5 3 -6', smile: 'M-11 0 Q0 14 12 0', longHair: true },
  { gender:'MALE', skin: '#CF9F81', hair: '#B59769', shirt: '#67778F', face: 'M-58 -76 Q-55 -96 0 -98 Q55 -96 58 -76 L54 -15 Q50 16 37 21 L-37 21 Q-50 16 -54 -15Z', fringe: 'M-51 -56 Q-58 -99 0 -100 Q57 -94 51 -51 L25 -71 L-4 -70 L-28 -64 Z', brow: 'M-33 -43 Q-23 -47 -14 -41 M14 -41 Q24 -47 33 -43', eyeY: -27, eyeRx: 4, eyeRy: 6, nose: 'M0 -17 L2 -5 L-4 -4', smile: 'M-10 2 Q0 9 11 2' },
  { gender:'FEMALE', skin: '#E9B594', hair: '#312F32', shirt: '#C69C60', face: 'M-55 -76 Q-52 -103 0 -101 Q52 -103 55 -76 L47 -20 Q41 20 0 23 Q-41 20 -47 -20Z', fringe: 'M-57 -30 Q-68 -117 7 -106 Q69 -100 56 -29 L47 -52 L0 -83 L-45 -50 Z', brow: 'M-32 -41 Q-22 -52 -12 -43 M12 -43 Q23 -52 33 -41', eyeY: -27, eyeRx: 4.5, eyeRy: 6, nose: 'M-3 -17 Q-10 -4 1 -5', smile: 'M-12 0 Q0 13 13 0', longHair: true },
  { gender:'MALE', skin: '#AF7F62', hair: '#352C28', shirt: '#6A8057', face: 'M-58 -73 Q-54 -96 0 -97 Q54 -96 58 -73 L56 -17 Q54 16 38 22 L-38 22 Q-54 16 -56 -17Z', fringe: 'M-52 -46 Q-60 -103 0 -103 Q59 -102 54 -46 L23 -67 L-4 -69 L-36 -56 Z', brow: 'M-34 -41 Q-22 -48 -11 -42 M11 -42 Q23 -48 34 -41', eyeY: -27, eyeRx: 4, eyeRy: 6, nose: 'M1 -17 L-3 -8 L5 -4', smile: 'M-10 1 Q0 10 11 1' },
  { gender:'FEMALE', skin: '#D99D78', hair: '#49352C', shirt: '#D77958', face: 'M-54 -75 Q-50 -101 0 -100 Q50 -101 54 -75 L46 -13 Q39 20 0 23 Q-39 20 -46 -13Z', fringe: 'M-58 -53 Q-66 -111 -12 -105 Q43 -118 58 -74 L44 -64 Q28 -81 13 -68 Q-12 -45 -49 -54Z', brow: 'M-33 -43 Q-23 -48 -13 -42 M13 -42 Q24 -48 33 -43', eyeY: -27, eyeRx: 4, eyeRy: 5, nose: 'M-2 -17 L-7 -5 L2 -4', smile: 'M-13 0 Q0 15 14 0', longHair: true, ponytail: true },
  { gender:'MALE', skin: '#E5B58E', hair: '#342923', shirt: '#6D8990', face: 'M-58 -75 Q-55 -97 -27 -99 L27 -99 Q55 -97 58 -75 L56 -14 Q54 16 38 22 L-38 22 Q-54 16 -56 -14Z', fringe: 'M-57 -55 Q-62 -111 0 -109 Q60 -108 57 -52 L39 -65 Q28 -48 11 -63 L-8 -55 L-27 -67 L-48 -48Z', brow: 'M-34 -41 Q-23 -47 -12 -41 M12 -41 Q23 -47 34 -41', eyeY: -27, eyeRx: 5, eyeRy: 6, nose: 'M0 -17 L0 -6 L8 -4', smile: 'M-10 2 Q0 12 11 2', curls: true },
  { gender:'FEMALE', skin: '#C98970', hair: '#251F28', shirt: '#86729A', face: 'M-51 -77 Q-45 -101 0 -101 Q45 -101 51 -77 L47 -19 Q42 18 0 23 Q-42 18 -47 -19Z', fringe: 'M-57 -48 Q-66 -112 -5 -106 Q57 -107 58 -54 L43 -59 Q36 -42 19 -56 Q0 -40 -14 -56 Q-32 -40 -44 -55Z', brow: 'M-32 -42 Q-24 -52 -14 -43 M14 -43 Q24 -52 32 -42', eyeY: -27, eyeRx: 4, eyeRy: 7, nose: 'M-1 -17 Q-5 -1 4 -4', smile: 'M-12 0 Q0 16 13 0', longHair: true, curls: true },
  { gender:'MALE', skin: '#D6A17F', hair: '#77706A', shirt: '#638174', face: 'M-59 -73 Q-55 -96 -30 -98 L30 -98 Q55 -96 59 -73 L57 -10 Q55 17 38 22 L-38 22 Q-55 17 -57 -10Z', fringe: 'M-57 -53 Q-60 -108 -3 -105 Q58 -108 57 -48 L41 -64 Q23 -70 12 -62 L-3 -68 L-19 -61 L-43 -47Z', brow: 'M-34 -43 Q-22 -51 -11 -43 M11 -43 Q23 -51 34 -43', eyeY: -27, eyeRx: 4, eyeRy: 6, nose: 'M0 -17 L-4 -3 L5 -2', smile: 'M-9 2 Q0 8 10 2', glasses: 'round', moustache: true },
  { gender:'FEMALE', skin: '#AD765C', hair: '#25252D', shirt: '#C18B48', face: 'M-54 -76 Q-50 -102 0 -101 Q50 -102 54 -76 L48 -17 Q42 20 0 23 Q-42 20 -48 -17Z', fringe: 'M-59 -53 Q-67 -115 -12 -108 Q39 -117 59 -75 L47 -67 L26 -77 L4 -61 L-15 -72 L-42 -58Z', brow: 'M-33 -43 Q-23 -49 -13 -42 M13 -42 Q23 -49 33 -43', eyeY: -27, eyeRx: 4.5, eyeRy: 6, nose: 'M-1 -17 L-5 -4 L3 -3', smile: 'M-12 0 Q0 13 13 0', longHair: true, earrings: true },
];
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
const homePortraits: Record<'MALE' | 'FEMALE', ImageSourcePropType> = {
  FEMALE: require('../../assets/player-portraits/female.png'),
  MALE: require('../../assets/player-portraits/male.png'),
};
function portraitFor(customer?: CustomerPersona): ImageSourcePropType | undefined {
  return customer?.portraitIndex === undefined ? undefined : portraitImages[customer.portraitIndex];
}
function Character({ seed, gender, talking = false, happy = false, cup = false }: { seed: string; gender?: CustomerPersona['gender']; talking?: boolean; happy?: boolean; cup?: boolean }) {
  const n = seed.split('').reduce((sum, c) => (sum * 31 + c.charCodeAt(0)) >>> 0, 0);
  const identity: Record<string, number> = { jack_surfer: 0, chloe_designer: 1, liam_tradie: 2, emma_student: 3, oliver_photog: 4, sophie_pilates: 5, noah_accountant: 6, mia_musician: 7, dave_bookstore: 8, zara_ngo: 9, player_female: 1, player_male: 0, maggie_owner: 3 };
  const pool = gender === 'FEMALE' ? [1,3,5,7,9] : gender === 'MALE' ? [0,2,4,6,8] : [0,1,2,3,4,5,6,7,8,9];
  const requestedLook=identity[seed];
  const index=requestedLook!==undefined && (!gender || looks[requestedLook].gender===gender) ? requestedLook : pool[n % pool.length];
  const look = looks[index];
  return <G>
    <Ellipse cx="0" cy="164" rx="83" ry="15" fill="#5E4939" opacity=".14" />
    <Path d="M-48 91 L-45 157 Q-30 170 -15 157 L-7 115 L8 115 L18 159 Q35 168 46 155 L49 91Z" fill="#414F4B" />
    <Path d="M-36 154 L-47 162 Q-49 171 -18 169 L-14 158 M19 157 L19 168 Q51 173 54 163 L43 155" fill="#303C37" />
    <Path d="M-34 18 Q-67 18 -77 56 L-64 83 L-45 68 L-47 110 Q0 132 48 110 L45 67 L61 82 L76 55 Q66 18 34 18Z" fill={look.shirt} />
    <Path d="M-64 66 Q-86 100 -62 109 Q-48 106 -49 93 L-43 74 M64 68 Q84 100 61 109 Q46 105 49 90 L44 74" fill={look.skin} />
    {look.gender==='FEMALE' && look.longHair && <Path d="M-58 -69 Q-69 -109 0 -109 Q69 -109 58 -67 L66 35 Q43 69 45 5 L39 -49 L-40 -49 L-45 5 Q-43 69 -66 35Z" fill={look.hair} />}
    {look.ponytail && <G fill={look.hair}><Ellipse cx="54" cy="-60" rx="15" ry="37" transform="rotate(-25 54 -60)"/><Circle cx="51" cy="-90" r="8" fill="#E5B34D"/></G>}
    {look.curls && <G fill={look.hair}>{[-42,-26,-10,8,26,42].map((x,i)=><Circle key={x} cx={x} cy={-91+(i%2)*5} r={15+(i%3)*2}/>)}</G>}
    <Path d="M-15 6 L-16 29 Q0 39 18 27 L16 5Z" fill={look.skin} />
    <Circle cx="-54" cy="-32" r="13" fill={look.skin} /><Circle cx="54" cy="-32" r="13" fill={look.skin} />
    <Path d={look.face} fill={look.skin} />
    <Path d={look.fringe} fill={look.hair} />
    {index === 1 && <Path d="M-55 -63 L-57 26 L-45 9 L-46 -49 M55 -58 L59 24 L46 10 L46 -44" fill={look.hair} />}
    {seed === "liam_tradie" && <G><Path d="M-58 -66 Q-53 -115 0 -115 Q54 -115 59 -66Z" fill="#E0B94E" /><Rect x="-64" y="-72" width="128" height="12" rx="6" fill="#CFA343" /><Path d="M0 -111 L0 -76" stroke="#EDCF6D" strokeWidth="7" /></G>}
    <Path d={look.brow} stroke={look.hair} strokeWidth="4.5" strokeLinecap="round" fill="none" />
    {happy ? <G stroke="#44352D" strokeWidth="3.5" strokeLinecap="round" fill="none"><Path d={`M-30 ${look.eyeY} Q-23 ${look.eyeY-8} -16 ${look.eyeY}`} /><Path d={`M16 ${look.eyeY} Q23 ${look.eyeY-8} 30 ${look.eyeY}`} /></G> : <G fill="#44352D"><Ellipse cx="-23" cy={look.eyeY} rx={look.eyeRx} ry={look.eyeRy} /><Ellipse cx="23" cy={look.eyeY} rx={look.eyeRx} ry={look.eyeRy} /></G>}
    {look.glasses==='round' && <G stroke="#4B514A" strokeWidth="2.7" fill="none"><Circle cx="-23" cy={look.eyeY} r="13"/><Circle cx="23" cy={look.eyeY} r="13"/><Path d={`M-10 ${look.eyeY}H10 M-36 ${look.eyeY-2}L-45 ${look.eyeY-5} M36 ${look.eyeY-2}L45 ${look.eyeY-5}`}/></G>}
    {look.earrings && <G fill="#E6B84E"><Circle cx="-53" cy="-4" r="4"/><Circle cx="53" cy="-4" r="4"/></G>}
    <Ellipse cx="-34" cy="-9" rx="11" ry="5" fill="#CD7D71" opacity=".5" /><Ellipse cx="34" cy="-9" rx="11" ry="5" fill="#CD7D71" opacity=".5" />
    <Path d={look.nose} fill="none" stroke="#B47C5B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    {look.moustache && !talking && <Path d="M-19 0 Q-10 -7 -1 0 Q8 -7 19 0 Q10 11 1 4 Q-9 11 -19 0Z" fill={look.hair}/>}
    {talking ? <Ellipse cx="0" cy="3" rx={look.smile.includes('13')?9:7} ry="7" fill="#744A3D" /> : <Path d={look.smile} fill="none" stroke="#744A3D" strokeWidth="3.5" strokeLinecap="round" />}
    <Rect x="13" y="44" width="25" height="14" rx="3" fill="#F7EBD0" /><Line x1="18" y1="51" x2="32" y2="51" stroke="#86755A" strokeWidth="2" />
    {cup && <G transform="translate(60,75)"><Path d="M-15 -20 L15 -20 L11 15 Q0 20 -11 15Z" fill="#F9F1DA" /><Rect x="-18" y="-24" width="36" height="7" rx="3" fill="#394C40" /><Path d="M-12 -1 L12 -1" stroke="#C97858" strokeWidth="12" /></G>}
  </G>;
}
export function CustomerPortrait({ customer, size = 70 }: { customer: CustomerPersona; size?: number }) {
  const portrait = portraitFor(customer);
  if (portrait) return <View style={{ width:size, height:size, borderRadius:size/2, overflow:'hidden', backgroundColor:'#E8DEC6' }}><Image source={portrait} resizeMode="contain" style={{ width:size, height:size }} /></View>;
  return <Svg width={size} height={size} viewBox="-80 -120 160 160"><Circle cx="0" cy="-40" r="78" fill="#E8DEC6" /><Character seed={customer.avatarSeed} gender={customer.gender} happy /></Svg>;
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
  const { width } = useWindowDimensions();
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
  return <View style={styles.world}>
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
    {home && <View pointerEvents="none" style={{position:'absolute',left:'34%',bottom:'0%',width:'32%',height:'70%'}}><Image source={gender === 'FEMALE' ? homePortraits.FEMALE : homePortraits.MALE} resizeMode="contain" style={{width:'100%',height:'100%'}} /></View>}
    {customer && phase !== 'DONE' && <Animated.View pointerEvents="none" style={[styles.person, { left: '29%', width: '42%', top: '0%', height: '82%' }, { transform: [{ translateX: position }, { translateY: bob }] }]}>
      {portraitFor(customer) ? <Image source={portraitFor(customer)} resizeMode="contain" style={{width:'100%',height:'100%'}} /> : <Svg width="100%" height="100%" viewBox="-110 -125 220 250"><Character seed={customer.avatarSeed} gender={customer.gender} talking={talking} happy={phase === 'FAREWELL' || phase === 'DEPARTING'} cup={phase === 'FAREWELL' || phase === 'DEPARTING'} /></Svg>}
    </Animated.View>}
    <Svg pointerEvents="none" width="100%" height="23%" viewBox="0 0 480 70" preserveAspectRatio="none" style={{position:'absolute',bottom:0}}>
      <Rect x="-5" y="17" width="490" height="60" rx="10" fill="#C98C6B" />
      <Rect x="-5" y="10" width="490" height="14" rx="7" fill="#F4CBA7" />
      <Path d="M0 27H480" stroke="#A86E51" strokeWidth="3" />
      <G transform="translate(60,2)"><Rect x="-25" y="-27" width="58" height="40" rx="8" fill="#57786B" /><Rect x="-18" y="-20" width="44" height="15" rx="4" fill="#A9C4A1" /><Circle cx="-9" cy="-13" r="3" fill="#FFFCF7" /><Path d="M-9 0H16" stroke="#FFFCF7" strokeWidth="3" /></G>
      {ready && <G transform="translate(357,0)"><Ellipse cx="0" cy="12" rx="24" ry="4" fill="#B77F61"/><Path d="M-16 -19H16L12 12H-12Z" fill="#FFFCF7"/><Rect x="-19" y="-24" width="38" height="6" rx="3" fill="#28352F"/><Path d="M-14 -5H14" stroke="#F3B291" strokeWidth="9"/></G>}
    </Svg>
  </View>;
}
const styles = StyleSheet.create({ world: { flex: 1, overflow: 'hidden', backgroundColor: '#EDDFC6' }, person: { position: 'absolute', left: '44%', top: '10%', width: '28%', height: '88%' }, ready: { position: 'absolute', left: '58%', top: '65%' } });
