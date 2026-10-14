import type { UserProfile } from '../store/gameStore';

export type ArrivalBeat = 'BOARDING' | 'WELCOME' | 'STORY' | 'REFLECTION' | 'ARRIVED' | 'NAME' | 'FIRST_SHIFT';
export interface ArrivalDraft {
  englishNameAlphabet: string;
  koreanName: string;
  englishNameKorean: string;
  gender: UserProfile['gender'];
  situation: UserProfile['situation'];
}

export const arrivalLines: Record<ArrivalBeat, {speaker: 'driver' | 'manager'; line: string; location: string}> = {
  BOARDING: {speaker:'driver', line:'짐은 뒤에 실어드릴게요. 카페까지 모셔다드리겠습니다.', location:'BRISBANE AIRPORT · AM 7:10'},
  WELCOME: {speaker:'driver', line:'브리즈번은 처음이세요?', location:'AIRPORT → WEST END'},
  STORY: {speaker:'driver', line:'호주에는 일하러 오셨어요, 아니면 다른 계획이 있으세요?', location:'BRISBANE RIVER · AM 7:18'},
  REFLECTION: {speaker:'driver', line:'곧 카페에 도착해요. 일 시작하기 전에 원하는 모습을 골라보세요.', location:'BRISBANE RIVER · AM 7:18'},
  ARRIVED: {speaker:'driver', line:'다 왔어요. 저 초록색 문이 카페예요. 여기서 내리시면 돼요.', location:'SUNNY SIDE CAFE · AM 7:25'},
  NAME: {speaker:'manager', line:'어서 와요. 손님들이 뭐라고 부르면 될까요?', location:'SUNNY SIDE CAFE · FIRST SHIFT'},
  FIRST_SHIFT: {speaker:'manager', line:'좋아요. 앞치마는 저쪽에 있어요. 첫 손님이 오면 제가 옆에서 도와드릴게요.', location:'SUNNY SIDE CAFE · FIRST SHIFT'},
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
  const sequence: ArrivalBeat[] = ['BOARDING','WELCOME','STORY','REFLECTION','ARRIVED','NAME','FIRST_SHIFT'];
  return sequence[Math.min(sequence.indexOf(beat)+1,sequence.length-1)];
}
