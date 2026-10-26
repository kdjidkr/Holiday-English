import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Keyboard, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect, Text as SvgText } from 'react-native-svg';
import { arrivalLines, ArrivalBeat, ArrivalDraft, nextArrivalBeat, normalizeArrivalName, validateArrivalName } from '../arrival/story';
import type { UserProfile } from '../store/gameStore';

const ink = '#263F35';
const paper = '#FAF7EF';

/** A scalable illustration: no cropped portraits or fixed screen-height assumptions. */
function CafeEntrance() {
  return <Svg width="100%" height="100%" viewBox="0 0 340 320" accessible={false}>
    <Circle cx="270" cy="54" r="31" fill="#EDC878" />
    <Path d="M19 285V104Q19 26 98 26H240Q319 26 319 104V285Z" fill="#EBE5D5" />
    <Path d="M42 279V119Q42 62 99 62H241Q298 62 298 119V279Z" fill="#F2D9BF" />
    <Rect x="59" y="93" width="222" height="33" rx="5" fill={ink} />
    <SvgText x="170" y="114" textAnchor="middle" fill={paper} fontSize="14" fontWeight="600" letterSpacing="3">SUNNY SIDE</SvgText>
    <Path d="M54 130H286L299 157H41Z" fill="#FFF9E9" />
    {[61, 108, 155, 202, 249].map(x => <Path key={x} d={`M${x} 130h20l5 27h-30z`} fill="#8E9C81" />)}
    <Path d="M41 157h258v6q-12 13-24 0-12 13-24 0-12 13-24 0-12 13-24 0-12 13-24 0-12 13-24 0-12 13-24 0-12 13-24 0-12 13-24 0-12 13-18 0z" fill="#D5DCC7" />
    <Rect x="65" y="182" width="86" height="80" rx="3" fill={ink} />
    <Rect x="71" y="188" width="74" height="68" fill="#B4C7BB" />
    <Path d="M76 243l60-50M103 255l36-29" stroke="#DFE9DD" strokeWidth="5" />
    <Path d="M108 188v68M71 223h74" stroke={ink} strokeWidth="5" />
    <Rect x="170" y="177" width="92" height="105" rx="3" fill={ink} />
    <Rect x="179" y="186" width="74" height="63" rx="2" fill="#A6BCAB" />
    <Path d="M187 224l39-31" stroke="#D6E2D4" strokeWidth="5" />
    <Rect x="199" y="209" width="36" height="20" rx="3" fill={paper} transform="rotate(-6 217 219)" />
    <SvgText x="217" y="222" textAnchor="middle" fontSize="8" fontWeight="700" fill={ink}>OPEN</SvgText>
    <Circle cx="248" cy="260" r="3" fill="#EDC878" />
    <Path d="M53 282h234l10 10H43Z" fill="#C7B69B" />
    <Ellipse cx="47" cy="294" rx="24" ry="5" fill="#E0D9C8" />
    <Path d="M32 266h30l-5 26H37Z" fill="#B87151" />
    <Path d="M47 271v-39M47 253q-29-4-21-23 23-1 21 23M47 243q0-27 19-24 9 19-19 24" fill="#70896A" />
    <Path d="M307 284v-37M307 263q-24-1-20-18 20-2 20 18M307 253q1-24 17-20 5 16-17 20" fill="#70896A" />
    <Path d="M295 274h25l-4 18h-17Z" fill="#C68C68" />
  </Svg>;
}

function Sun({ size = 30 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}><Circle cx="20" cy="20" r="8" fill="#CA774D" /><Path d="M20 2v5m0 26v5M2 20h5m26 0h5M7 7l4 4m18 18 4 4M7 33l4-4M29 11l4-4" stroke="#CA774D" strokeWidth="2" strokeLinecap="round" /></Svg>;
}

export function ArrivalConversation({ profile, onComplete, onCancel }: { profile: UserProfile; onComplete: (draft: ArrivalDraft) => void; onCancel?: () => void }) {
  const [beat, setBeat] = useState<ArrivalBeat>('WELCOME');
  const [input, setInput] = useState(profile.englishNameAlphabet || '');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<UserProfile['gender'] | null>(profile.englishNameAlphabet ? profile.gender : null);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const { height } = useWindowDimensions();
  const fade = useRef(new Animated.Value(1)).current;
  const reducedMotion = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const completed = useRef(false);
  const welcome = beat === 'WELCOME';
  const naming = beat === 'NAME';

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { reducedMotion.current = value; });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reducedMotion.current = value; });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    fade.setValue(reducedMotion.current ? 1 : 0);
    const animation = Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [beat, fade]);

  const continueIntro = () => {
    if (welcome) { setBeat(nextArrivalBeat(beat)); return; }
    if (naming) {
      const problem = validateArrivalName(input);
      if (problem) { setError(problem); return; }
      if (!gender) { setError('성별을 선택해 주세요.'); return; }
      setName(normalizeArrivalName(input));
      Keyboard.dismiss();
      setFocused(false);
      setBeat(nextArrivalBeat(beat));
      return;
    }
    if (completed.current) return;
    completed.current = true;
    onComplete({ englishNameAlphabet: name, englishNameKorean: profile.englishNameKorean, koreanName: profile.koreanName, gender: gender || profile.gender, situation: profile.situation });
  };

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content" />
    <KeyboardAvoidingView style={styles.frame} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View style={styles.brand}><Sun size={22} /><Text style={styles.brandText}>sunny side</Text></View>
        {(!welcome || onCancel) && <Pressable accessibilityRole="button" accessibilityLabel={welcome ? '인트로 닫기' : '이전 화면'} hitSlop={8} style={styles.back} onPress={() => { Keyboard.dismiss(); setError(''); setFocused(false); if (welcome) onCancel?.(); else setBeat(naming ? 'WELCOME' : 'NAME'); }}><Text style={styles.backText}>{welcome ? '닫기' : '뒤로'}</Text></Pressable>}
      </View>
      <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Animated.View style={[styles.body, { opacity: fade }]}>
          {welcome ? <>
            <View style={styles.welcomeCopy}><Text style={styles.eyebrow}>BRISBANE, AUSTRALIA</Text><Text accessibilityRole="header" style={styles.title}>{arrivalLines.WELCOME.line}</Text></View>
            <View style={[styles.illustration, { height: Math.min(350, Math.max(200, height * .4)) }]}><CafeEntrance /></View>
          </> : naming ? <View style={[styles.nameSection, focused && styles.nameFocused]}>
            {!focused && <View style={styles.sunSpace}><Sun size={44} /></View>}
            <Text accessibilityRole="header" style={styles.title}>{arrivalLines.NAME.line}</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>영어 이름</Text>
              <TextInput accessibilityLabel="영어 이름" style={[styles.input, focused && styles.inputFocused, !!error && styles.inputError]} value={input} onChangeText={value => { setInput(value); setError(''); }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onSubmitEditing={continueIntro} placeholder="Your name" placeholderTextColor="#A4AA9C" autoCapitalize="words" autoCorrect={false} spellCheck={false} maxLength={30} returnKeyType="done" />
              {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            </View>
            <View style={styles.genderGroup}>
              <Text style={styles.inputLabel}>성별</Text>
              <View style={styles.genderOptions}>
                {(['FEMALE', 'MALE'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: gender === value }} onPress={() => { setGender(value); setError(''); }} style={({ pressed }) => [styles.genderOption, gender === value && styles.genderSelected, pressed && styles.pressed]}><Text style={[styles.genderText, gender === value && styles.genderTextSelected]}>{value === 'FEMALE' ? '여성' : '남성'}</Text></Pressable>)}
              </View>
            </View>
          </View> : <View style={styles.readySection}>
            <Text accessibilityRole="header" style={styles.title}>{arrivalLines.FIRST_SHIFT.line}</Text>
            <View style={styles.badgeWrap}>
              <View style={styles.clip} />
              <View style={styles.badge}>
                <View style={styles.badgeTop}><Text style={styles.badgeBrand}>SUNNY SIDE CAFE</Text><Sun size={24} /></View>
                <Text style={styles.badgeName} adjustsFontSizeToFit numberOfLines={2} minimumFontScale={.5}>{name}</Text>
                <View style={styles.badgeBottom}><View style={styles.badgeRule} /><Text style={styles.badgeRole}>CREW</Text></View>
              </View>
            </View>
          </View>}
        </Animated.View>
        <View style={styles.footer}>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: naming && (!input.trim() || !gender) }} disabled={naming && (!input.trim() || !gender)} onPress={continueIntro} style={({ pressed }) => [styles.button, naming && (!input.trim() || !gender) && styles.disabled, pressed && styles.pressed]}><Text style={styles.buttonText}>{welcome ? '문 열기' : naming ? '다음' : '시작하기'}</Text><Text accessible={false} style={styles.arrow}>↗</Text></Pressable>
          <View accessible={false} style={styles.steps}>{(['WELCOME', 'NAME', 'FIRST_SHIFT'] as const).map(step => <View key={step} style={[styles.dot, step === beat && styles.activeDot]} />)}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: paper, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: 480 },
  header: { minHeight: 68, paddingHorizontal: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandText: { color: ink, fontSize: 19, fontWeight: '700', letterSpacing: -.7 },
  back: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#747E72', fontSize: 14 },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 28 },
  body: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  welcomeCopy: { gap: 16 },
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 2.5, color: '#838C7E' },
  title: { color: ink, fontSize: 33, lineHeight: 45, fontWeight: '700', letterSpacing: -1.4 },
  illustration: { width: '100%', marginTop: 20 },
  nameSection: { paddingBottom: 36 },
  nameFocused: { paddingBottom: 12 },
  sunSpace: { marginBottom: 32 },
  inputGroup: { marginTop: 28 },
  genderGroup: { marginTop: 24 },
  genderOptions: { flexDirection: 'row', gap: 10 },
  genderOption: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#D5DBCF', alignItems: 'center', justifyContent: 'center' },
  genderSelected: { borderColor: ink, backgroundColor: '#E9EDE2' },
  genderText: { fontSize: 15, color: '#747E72' },
  genderTextSelected: { color: ink, fontWeight: '600' },
  inputLabel: { color: '#747E72', fontSize: 13, marginBottom: 10 },
  input: { color: ink, fontSize: 28, fontWeight: '500', paddingVertical: 14, paddingHorizontal: 0, minHeight: 64, borderBottomWidth: 1.5, borderBottomColor: '#C6CEBF', borderRadius: 0 },
  inputFocused: { borderBottomColor: ink },
  inputError: { borderBottomColor: '#B85135' },
  error: { color: '#B85135', fontSize: 13, lineHeight: 20, marginTop: 12 },
  readySection: { paddingBottom: 32 },
  badgeWrap: { marginTop: 52, paddingTop: 8, transform: [{ rotate: '-3deg' }] },
  clip: { width: 36, height: 25, borderRadius: 6, backgroundColor: '#B6BCAD', position: 'absolute', zIndex: 1, top: 0, alignSelf: 'center' },
  badge: { backgroundColor: '#FFFDF7', borderWidth: 1, borderColor: '#DDDCCD', borderRadius: 14, padding: 26, shadowColor: '#263F35', shadowOffset: { width: 0, height: 8 }, shadowOpacity: .08, shadowRadius: 16, elevation: 3 },
  badgeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  badgeBrand: { color: '#73806E', fontSize: 10, letterSpacing: 1.7, fontWeight: '600' },
  badgeName: { color: ink, fontSize: 44, fontWeight: '600', letterSpacing: -1.5, marginVertical: 26 },
  badgeBottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badgeRule: { flex: 1, height: 1, backgroundColor: '#E1E4D7' },
  badgeRole: { color: '#838C7E', fontSize: 10, letterSpacing: 2 },
  footer: { paddingTop: 12, paddingBottom: 16 },
  button: { minHeight: 58, backgroundColor: ink, borderRadius: 18, paddingVertical: 17, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttonText: { color: paper, fontSize: 17, fontWeight: '600' },
  arrow: { color: '#E8D8AA', fontSize: 23, lineHeight: 25 },
  disabled: { opacity: .35 },
  pressed: { opacity: .85, transform: [{ scale: .99 }] },
  steps: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 21, height: 6 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#D4D9CC' },
  activeDot: { width: 17, backgroundColor: '#667D63' },
});
