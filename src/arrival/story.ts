import type { UserProfile } from '../store/gameStore';

export type ArrivalBeat = 'WELCOME' | 'NAME' | 'FIRST_SHIFT';
export interface ArrivalDraft {
  englishNameAlphabet: string;
  koreanName: string;
  englishNameKorean: string;
  gender: UserProfile['gender'];
  situation: UserProfile['situation'];
}

export const arrivalLines: Record<ArrivalBeat, {speaker: 'manager'; line: string}> = {
  WELCOME: {speaker: 'manager', line: '카페의 첫 아침.\n이제, 당신 차례예요.'},
  NAME: {speaker: 'manager', line: '어떻게\n불러드릴까요?'},
  FIRST_SHIFT: {speaker: 'manager', line: '반가워요.\n함께 시작해요.'},
};

export function normalizeArrivalName(value: string): string {
  return value.trim().replace(/(?:이?라고|으로)\s*불러\s*주세요[.!。]?$/u, '').replace(/^please\s+call\s+me\s+/i, '').replace(/[.!。]$/, '').trim();
}

export function validateArrivalName(value: string): string | null {
  const name = normalizeArrivalName(value);
  if (!name) return '손님에게 알려줄 영어 이름을 적어주세요.';
  if (!/^[A-Za-z][A-Za-z '\-]{0,29}$/.test(name)) return '영어 이름만 적어주세요. 예: Jun';
  return null;
}

export function nextArrivalBeat(beat: ArrivalBeat): ArrivalBeat {
  const sequence: ArrivalBeat[] = ['WELCOME','NAME','FIRST_SHIFT'];
  return sequence[Math.min(sequence.indexOf(beat)+1,sequence.length-1)];
}
