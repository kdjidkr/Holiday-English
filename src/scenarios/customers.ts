import { CustomerPersona } from "./types";

export const BRISBANE_CUSTOMERS: CustomerPersona[] = [
  {
    id: "cust_1",
    name: "Jack",
    age: 28,
    gender: "MALE",
    occupation: "IT 개발자 & 서퍼",
    avatarSeed: "jack_surfer",
    portraitIndex: 0,
    preferredOrder: { menuName: "Large Flat White (Oat milk)", prepDurationSeconds: 90, description: "오트 플랫화이트" },
    personality: "햇살처럼 밝고 쾌활한 성격",
    aussieSlangTendency: ["G'day", "No worries", "Sweet as", "Reckon"],
    reviewComment: "바리스타 친구 싹싹하고 커피 완벽함! 내일 출근길에도 무조건 들른다.",
    topics: ["아침 서핑 파도", "브리즈번 날씨", "월요병"]
  },
  {
    id: "cust_2",
    name: "Chloe",
    age: 26,
    gender: "FEMALE",
    occupation: "그래픽 디자이너 & 견주",
    avatarSeed: "chloe_designer",
    portraitIndex: 1,
    preferredOrder: { menuName: "Iced Long Black (Less ice)", prepDurationSeconds: 45, description: "아이스 롱블랙" },
    personality: "트렌디하고 다정하며 리액션이 풍부함",
    aussieSlangTendency: ["Brilliant", "Love that", "Cheers lovely"],
    reviewComment: "강아지 예뻐해 줘서 기분 최고였어요. 산미 있는 원두 맛집 발견!",
    topics: ["반려견 산책", "사우스뱅크 플리마켓", "카페 음악"]
  },
  {
    id: "cust_3",
    name: "Liam",
    age: 31,
    gender: "MALE",
    occupation: "건설 현장 트레이디 (Tradie)",
    avatarSeed: "liam_tradie",
    portraitIndex: 2,
    preferredOrder: { menuName: "Double Espresso + Banana Bread", prepDurationSeconds: 120, description: "더블 에스프레소 & 토스트 바나나브레드" },
    personality: "우렁차고 시원시원하며 털털함",
    aussieSlangTendency: ["Righto", "G'day mate", "Too easy", "Ripper"],
    reviewComment: "아침 피로 싹 풀리는 묵직한 에스프레소! 바리스타 에너지 넘침.",
    topics: ["현장 작업 날씨", "주말 풋티(Footy) 경기", "새참(Smoko) 시간"]
  },
  {
    id: "cust_4",
    name: "Emma",
    age: 24,
    gender: "FEMALE",
    occupation: "UQ 대학생 (간호학)",
    avatarSeed: "emma_student",
    portraitIndex: 3,
    preferredOrder: { menuName: "Soy Chai Latte (Extra hot)", prepDurationSeconds: 90, description: "두유 차이라떼" },
    personality: "차분하지만 웃는 모습이 따뜻한 편",
    aussieSlangTendency: ["Cheers", "Awesome", "How you going?"],
    reviewComment: "과제하느라 지쳤는데 따뜻한 차이라떼랑 미소 덕에 힐링하고 가요.",
    topics: ["시험 기간", "브리즈번 도서관", "주말 알바"]
  },
  {
    id: "cust_5",
    name: "Oliver",
    age: 35,
    gender: "MALE",
    occupation: "포토그래퍼 & 바이크 라이더",
    avatarSeed: "oliver_photog",
    portraitIndex: 4,
    preferredOrder: { menuName: "Batch Brew (Filter)", prepDurationSeconds: 40, description: "배치브루 필터커피" },
    personality: "감각적이고 호기심이 많아 질문을 잘 건넴",
    aussieSlangTendency: ["G'day", "Legend", "Stoked"],
    reviewComment: "필터커피 노트가 살아있네요. 호주 온 지 얼마 안 됐다는데 영어가 금방 늘겠어요!",
    topics: ["카메라/사진", "스토리 브릿지 야경", "선샤인 코스트 드라이브"]
  },
  {
    id: "cust_6",
    name: "Sophie",
    age: 29,
    gender: "FEMALE",
    occupation: "필라테스 강사",
    avatarSeed: "sophie_pilates",
    portraitIndex: 5,
    preferredOrder: { menuName: "Skinny Latte with Honey", prepDurationSeconds: 90, description: "무지방 꿀라떼" },
    personality: "긍정적인 에너지가 넘치고 칭찬을 아끼지 않음",
    aussieSlangTendency: ["Fab", "Gorgeous", "No dramas"],
    reviewComment: "커피 거품이 너무 실키해요! 친절해서 단골 예약하고 갑니다.",
    topics: ["모닝 스트레칭", "건강식/스무디", "주말 페스티벌"]
  },
  {
    id: "cust_7",
    name: "Noah",
    age: 27,
    gender: "MALE",
    occupation: "회계 법인 주니어",
    avatarSeed: "noah_accountant",
    portraitIndex: 6,
    preferredOrder: { menuName: "Piccolo Latte", prepDurationSeconds: 60, description: "피콜로 라떼" },
    personality: "스마트하고 정중하며 경청을 잘함",
    aussieSlangTendency: ["Spot on", "Thanks a million", "Good on ya"],
    reviewComment: "피콜로 정석입니다. 출근 전 1분 대화가 하루의 활력소가 되네요.",
    topics: ["금융가 출퇴근", "점심 맛집", "주말 골프"]
  },
  {
    id: "cust_8",
    name: "Mia",
    age: 23,
    gender: "FEMALE",
    occupation: "로컬 인디 뮤지션",
    avatarSeed: "mia_musician",
    portraitIndex: 7,
    preferredOrder: { menuName: "Cold Brew with Oat milk", prepDurationSeconds: 40, description: "오트 콜드브루" },
    personality: "자유분방하고 재치 있는 농담을 잘 던짐",
    aussieSlangTendency: ["Howdy", "Sweet as", "Deadset"],
    reviewComment: "바리스타 선곡 센스 굿! 콜드브루 맛도 깔끔해서 단골 도장 찍음.",
    topics: ["버스킹", "포티튜드 밸리 라이브 펍", "빈티지 옷"]
  },
  {
    id: "cust_9",
    name: "Dave",
    age: 48,
    gender: "MALE",
    occupation: "동네 서점 주인 (브리즈번 로컬 토박이)",
    avatarSeed: "dave_bookstore",
    portraitIndex: 8,
    preferredOrder: { menuName: "Traditional Cappuccino (Lots of choc powder)", prepDurationSeconds: 90, description: "초코파우더 듬뿍 카푸치노" },
    personality: "푸근하고 아빠처럼 친근한 호주 아저씨",
    aussieSlangTendency: ["G'day mate", "Fair dinkum", "Good on ya mate"],
    reviewComment: "새로 온 한국인 친구가 참 싹싹하구먼. 카푸치노 거품이 일품이야!",
    topics: ["브리즈번 옛날 이야기", "날씨 변화", "손자 이야기"]
  },
  {
    id: "cust_10",
    name: "Zara",
    age: 32,
    gender: "FEMALE",
    occupation: "환경 NGO 코디네이터",
    avatarSeed: "zara_ngo",
    portraitIndex: 9,
    preferredOrder: { menuName: "Almond Flat White (KeepCup)", prepDurationSeconds: 90, description: "텀블러 아몬드 플랫화이트" },
    personality: "지적이고 환경 보호에 진심인 친화적 손님",
    aussieSlangTendency: ["Brilliant", "Cheers", "Heaps good"],
    reviewComment: "텀블러 챙겨오길 잘했네요. 친절하게 맞아줘서 기분 좋은 아침!",
    topics: ["리유저블 컵", "모턴 아일랜드 해변", "유기농 마켓"]
  }
];

BRISBANE_CUSTOMERS.push(
  {
    id: "cust_fitness_male",
    name: "Ethan",
    age: 29,
    gender: "MALE",
    occupation: "퍼스널 트레이너",
    avatarSeed: "fit_male_ethan",
    portraitIndex: 10,
    preferredOrder: { menuName: "Iced Long Black (Extra shot)", prepDurationSeconds: 50, description: "샷 추가 아이스 롱블랙" },
    personality: "활기차고 건강한 생활을 즐기지만, 운동 이야기를 강요하지 않는 편안한 성격",
    aussieSlangTendency: ["Feeling good", "No worries", "Too easy"],
    reviewComment: "운동 끝나고 들르기 좋은 카페를 찾았어요.",
    topics: ["아침 운동", "브리즈번 강변 러닝", "운동 후 아침 식사"]
  },
  {
    id: "cust_fitness_female",
    name: "Riley",
    age: 28,
    gender: "FEMALE",
    occupation: "수영 강사 & 스트렝스 코치",
    avatarSeed: "fit_female_riley",
    portraitIndex: 11,
    preferredOrder: { menuName: "Iced Latte (Almond milk)", prepDurationSeconds: 55, description: "아몬드밀크 아이스 라떼" },
    personality: "자신감 있고 다정하며, 바쁜 아침에도 주변을 잘 살피는 성격",
    aussieSlangTendency: ["Good on ya", "Lovely", "No dramas"],
    reviewComment: "수영장 가기 전 기분 좋게 커피 한 잔 했어요.",
    topics: ["수영 강습", "모닝 트레이닝", "주말 해변 산책"]
  },
  {
    id: "cust_surfer_kai",
    name: "Kai",
    age: 24,
    gender: "MALE",
    occupation: "선샤인 코스트 서핑 강사",
    avatarSeed: "surfer_kai",
    portraitIndex: 12,
    preferredOrder: { menuName: "Flat White (Extra shot)", prepDurationSeconds: 95, description: "샷 추가 플랫화이트" },
    personality: "느긋하고 친근하며 바다와 파도 이야기를 좋아하는 서퍼 청년",
    aussieSlangTendency: ["Stoked", "Mate", "Sweet as"],
    reviewComment: "파도 타기 전 커피와 대화 모두 최고였어요.",
    topics: ["오늘 파도와 바람", "서핑 보드", "선샤인 코스트 해변"]
  },
  {
    id: "cust_finance_daniel",
    name: "Daniel",
    age: 34,
    gender: "MALE",
    occupation: "브리즈번 금융회사 애널리스트",
    avatarSeed: "finance_daniel",
    portraitIndex: 13,
    preferredOrder: { menuName: "Long Black (Takeaway)", prepDurationSeconds: 45, description: "테이크어웨이 롱블랙" },
    personality: "정갈하고 예의 바르며 차분하지만, 익숙해지면 건조한 농담도 하는 성격",
    aussieSlangTendency: ["Fair enough", "Cheers", "Busy morning"],
    reviewComment: "출근길에 들러 빠르게 주문하기 편하고 커피도 좋았어요.",
    topics: ["금융가 출근길", "주말 계획", "브리즈번 점심 장소"]
  }
);

// 설정 손님 외 로컬 손님 40명 자동 생성
const namesM = ["Lucas", "Ethan", "Henry", "Mason", "Leo", "Charlie", "Max", "Archie", "Harry", "Thomas", "Oscar", "Sam", "Cooper", "George", "Flynn", "Lachlan", "Angus", "Darcy", "Mitch", "Brodie"];
const namesF = ["Isabella", "Grace", "Ava", "Ruby", "Harper", "Evie", "Willow", "Ella", "Freya", "Matilda", "Phoebe", "Sienna", "Penelope", "Hannah", "Layla", "Imogen", "Georgia", "Tess", "Summer", "Poppy"];
const jobs = ["부동산 에이전트", "피트니스 코치", "셰프", "스타트업 마케터", "수의사", "플로리스트", "조경사", "물리치료사", "초등교사", "조종사"];
const coffees = [
  { menuName: "Regular Flat White", prepDurationSeconds: 80, desc: "플랫화이트" },
  { menuName: "Large Latte with Caramel", prepDurationSeconds: 90, desc: "카라멜 라떼" },
  { menuName: "Long Black", prepDurationSeconds: 45, desc: "롱블랙" },
  { menuName: "Mocha with Marshmallow", prepDurationSeconds: 100, desc: "마시멜로 모카" },
  { menuName: "Magic (Double Ristretto Flat White)", prepDurationSeconds: 85, desc: "매직 커피" }
];

const craftedOrderAlternatives: Record<string, CustomerPersona['preferredOrder'][]> = {
  cust_1: [
    {menuName:'Long Black',prepDurationSeconds:45,description:'롱블랙'},
    {menuName:'Iced Latte (Oat milk)',prepDurationSeconds:55,description:'오트밀크 아이스 라떼'},
  ],
  cust_2: [
    {menuName:'Oat Flat White',prepDurationSeconds:85,description:'오트 플랫화이트'},
    {menuName:'Iced Chai Latte',prepDurationSeconds:55,description:'아이스 차이라떼'},
  ],
  cust_3: [
    {menuName:'Long Black',prepDurationSeconds:45,description:'롱블랙'},
    {menuName:'Flat White (Extra shot)',prepDurationSeconds:95,description:'샷 추가 플랫화이트'},
  ],
  cust_4: [
    {menuName:'Soy Latte',prepDurationSeconds:85,description:'두유 라떼'},
    {menuName:'Chai Latte (Oat milk)',prepDurationSeconds:90,description:'오트밀크 차이라떼'},
  ],
  cust_5: [
    {menuName:'Long Black',prepDurationSeconds:45,description:'롱블랙'},
    {menuName:'Iced Long Black',prepDurationSeconds:45,description:'아이스 롱블랙'},
  ],
  cust_6: [
    {menuName:'Flat White with Honey',prepDurationSeconds:90,description:'꿀 플랫화이트'},
    {menuName:'Iced Latte (Oat milk)',prepDurationSeconds:55,description:'오트밀크 아이스 라떼'},
  ],
  cust_7: [
    {menuName:'Long Black',prepDurationSeconds:45,description:'롱블랙'},
    {menuName:'Flat White (Extra shot)',prepDurationSeconds:95,description:'샷 추가 플랫화이트'},
  ],
  cust_8: [
    {menuName:'Iced Long Black',prepDurationSeconds:45,description:'아이스 롱블랙'},
    {menuName:'Batch Brew (Filter)',prepDurationSeconds:40,description:'배치브루 필터커피'},
  ],
  cust_9: [
    {menuName:'Flat White',prepDurationSeconds:85,description:'플랫화이트'},
    {menuName:'Long Black',prepDurationSeconds:45,description:'롱블랙'},
  ],
  cust_10: [
    {menuName:'Oat Flat White (KeepCup)',prepDurationSeconds:85,description:'텀블러 오트 플랫화이트'},
    {menuName:'Almond Iced Latte (KeepCup)',prepDurationSeconds:55,description:'텀블러 아몬드 아이스 라떼'},
  ],
};

for (let i = 11; i <= 50; i++) {
  const isMale = i % 2 === 1;
  const name = isMale ? namesM[(i * 3) % namesM.length] : namesF[(i * 3) % namesF.length];
  const job = jobs[i % jobs.length];
  const coffee = coffees[i % coffees.length];
  const age = 22 + (i % 25);

  BRISBANE_CUSTOMERS.push({
    id: `cust_${i}`,
    name: name,
    age: age,
    gender: isMale ? "MALE" : "FEMALE",
    occupation: job,
    avatarSeed: `cust_avatar_${i}`,
    preferredOrder: {
      menuName: coffee.menuName,
      prepDurationSeconds: coffee.prepDurationSeconds,
      description: coffee.desc
    },
    personality: isMale ? "유쾌하고 털털한 호주 로컬" : "친절하고 호응이 좋은 호주 로컬",
    aussieSlangTendency: ["No worries", "G'day", "Cheers", "Sweet as", "Too easy"],
    reviewComment: `${name} 손님: "바리스타가 너무 친절해서 단골 찜했어요! 커피도 최고."`,
    topics: ["오늘 날씨", "주말 계획", "호주 브리즈번 라이프"]
  });
}

export function orderForVisit(customer: CustomerPersona, previousVisits: number, random: () => number = Math.random): CustomerPersona {
  if (previousVisits <= 0 || random() >= 0.3) return customer;
  const alternatives = craftedOrderAlternatives[customer.id]
    ?? coffees.filter(coffee => coffee.menuName !== customer.preferredOrder.menuName).map(coffee => ({
      menuName:coffee.menuName,
      prepDurationSeconds:coffee.prepDurationSeconds,
      description:coffee.desc,
    }));
  if (!alternatives.length) return customer;
  const index = Math.min(alternatives.length - 1, Math.floor(random() * alternatives.length));
  return {...customer,preferredOrder:{...alternatives[index]}};
}
