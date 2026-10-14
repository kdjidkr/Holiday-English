export type AvatarExpression = 
  | "NEUTRAL"    // 기본 경청
  | "LISTENING"  // 고개 끄덕이며 귀 기울임 (침묵 대기 중)
  | "HAPPY"      // 환한 미소, 호감
  | "AMUSED"     // 빵 터짐, 유쾌함
  | "CONFUSED"   // 갸우뚱, 어리둥절 ("What do you mean?")
  | "RESCUE";    // 따뜻한 눈빛으로 도와주는 표정 ("Take your time mate!")

export interface CustomerPersona {
  id: string;
  name: string;
  age: number;
  gender: "MALE" | "FEMALE";
  occupation: string;
  avatarSeed: string; // 아바타 그래픽 키
  portraitIndex?: number; // 고유 초상화가 있는 첫 손님 묶음의 이미지 번호
  preferredOrder: {
    menuName: string;
    prepDurationSeconds: number; // 커피 제조 시간 (40초 ~ 150초)
    description: string;
  };
  personality: string;
  aussieSlangTendency: string[]; // 자주 쓰는 호주 슬랭 (G'day, Sweet as, etc.)
  reviewComment: string;         // 단골 등록 시 남기는 한 줄 후기
  topics: string[];              // 주로 나누는 스몰토크 화제
}

export interface DailyEvent {
  briefing?: string[];
  simulatedDate?: string;
  id: string;
  title: string;
  category: "WEATHER" | "LOCAL_ISSUE" | "HOLIDAY" | "SPORTS";
  weather: "sunny" | "humid" | "rainy" | "smoky" | "overcast" | "breezy";
  hintKorean: string;      // 바리스타 화면에 뜰 한국어 힌트
  suggestedOpening: string; // 예시 영어 오프닝 문장
}

export interface LearnedPattern {
  starred?: boolean;
  id: string;
  shiftDay: number;
  sourceQuote?: string;
  selectedText?: string;
  expressionKind?: 'word' | 'phrase';
  explanation?: string;
  sourceSpeaker?: string;
  koreanMeaning: string;      // "지난주 여행 어디 다녀왔어요?"
  englishTemplate: string;    // "Where did you go for [purpose]?"
  slotExamples: string[];     // ["Where did you go for a picnic?", ...]
  pastRelatedPatternId?: string; // 과거 연결 패턴 id
  pastRelatedNote?: string;      // "Whereabouts did you head to for [purpose]?"로도 바꿀 수 있어요!
}

export interface ShiftReviewCard {
  sessionIndex: number;
  turnIndex: number;
  koreanSentence: string;
  kind: 'polish' | 'alternative' | 'good';
  note: string;
  expressions: { english: string; koreanMeaning: string; explanation: string }[];
}

