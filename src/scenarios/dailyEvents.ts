import { DailyEvent } from "./types";

export const DAILY_EVENTS_POOL: DailyEvent[] = [
  {
    id: "event_1",
    title: "근처 작은 산불 연기 (Bushfire Smoke)",
    category: "LOCAL_ISSUE",
    weather: "smoky",
    hintKorean: "💡 스몰토크 힌트: '근처 골목에서 작은 불이 나서 연기 냄새가 나요'라고 말을 건네보세요!",
    suggestedOpening: "Smells like smoke outside today, did you notice that?"
  },
  {
    id: "event_2",
    title: "크리스마스 & 박싱데이 연휴 임박 (Christmas Season)",
    category: "HOLIDAY",
    weather: "sunny",
    hintKorean: "💡 스몰토크 힌트: '다음 주 크리스마스 연휴에 어디 놀러 가시나요?'라고 물어보세요!",
    suggestedOpening: "Got any fun plans for the upcoming Christmas holidays?"
  },
  {
    id: "event_3",
    title: "브리즈번 폭염 & 습도 85% (Crazy Humidity)",
    category: "WEATHER",
    weather: "humid",
    hintKorean: "💡 스몰토크 힌트: '오늘 날씨 진짜 덥고 습하네요!'라며 아이스 음료를 권해보세요!",
    suggestedOpening: "Crazy humidity today, isn't it? Definitely an iced coffee day!"
  },
  {
    id: "event_4",
    title: "주말 브리즈번 리버사이드 페스티벌 불꽃놀이 (Riverfire Festival)",
    category: "LOCAL_ISSUE",
    weather: "breezy",
    hintKorean: "💡 스몰토크 힌트: '이번 주말 불꽃놀이 보러 가시나요?'라고 질문해보세요!",
    suggestedOpening: "Are you heading into South Bank for the fireworks this weekend?"
  },
  {
    id: "event_5",
    title: "아침부터 내리는 촉촉한 봄비 (Gentle Spring Rain)",
    category: "WEATHER",
    weather: "rainy",
    hintKorean: "💡 스몰토크 힌트: '비가 와서 출근길 젖으셨겠어요, 따뜻한 커피 준비해 드릴게요!' 해보세요!",
    suggestedOpening: "Bit wet out there today! Nothing beats a warm coffee on a rainy morning."
  },
  {
    id: "event_6",
    title: "로컬 럭비팀 브롱코스(Broncos) 대승 (NRL Footy Win)",
    category: "SPORTS",
    weather: "overcast",
    hintKorean: "💡 스몰토크 힌트: '어제 브롱코스 경기 보셨어요? 대박이었어요!'라고 띄워보세요!",
    suggestedOpening: "Did you catch the Broncos game yesterday? What a ripper!"
  },
  {
    id: "event_7",
    title: "월요병 출근길 (Monday Morning Rush)",
    category: "LOCAL_ISSUE",
    weather: "sunny",
    hintKorean: "💡 스몰토크 힌트: '월요일 아침엔 진한 카페인이 필수죠!'라고 공감대를 형성해보세요!",
    suggestedOpening: "Tough Monday morning, aye? Extra shot of coffee should help!"
  },
  {
    id: "event_8",
    title: "선샤인 코스트 완벽한 서핑 파도 (Epic Swell)",
    category: "WEATHER",
    weather: "breezy",
    hintKorean: "💡 스몰토크 힌트: '오늘 아침 골드코스트/선샤인코스트 파도가 대박이래요!'라고 말해보세요!",
    suggestedOpening: "Heard the swell was massive down the coast this morning!"
  }
];

export function getRandomDailyEvent(): DailyEvent {
  const index = Math.floor(Math.random() * DAILY_EVENTS_POOL.length);
  return DAILY_EVENTS_POOL[index];
}

// One coherent fictional shift context, shared by the briefing and customer prompts.
export function createShiftBriefing(day: number, now = new Date()): DailyEvent {
  const date=new Date(now);date.setDate(date.getDate()+Math.max(0,day-1));
  const weatherEvents=DAILY_EVENTS_POOL.filter(event=>['event_3','event_5','event_8'].includes(event.id));
  const event={...weatherEvents[Math.floor(Math.random()*weatherEvents.length)]};
  const weather=event.weather==='rainy'?'아침부터 비가 내리고 있어요.':event.weather==='humid'?'덥고 습한 날이에요.':'바람이 선선한 날이에요.';
  const holidays=[{month:0,day:1,name:'새해 공휴일'},{month:0,day:26,name:'Australia Day'},{month:11,day:25,name:'크리스마스'},{month:11,day:26,name:'Boxing Day'}];
  const nearby=holidays.flatMap(h=>[date.getFullYear(),date.getFullYear()+1].map(year=>({name:h.name,diff:Math.round((new Date(year,h.month,h.day).getTime()-new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime())/86400000)}))).filter(h=>h.diff>=0 && h.diff<=21).sort((a,b)=>a.diff-b.diff)[0];
  const topic=nearby?`${nearby.name}${nearby.diff===0?' 당일이에요.':`까지 ${nearby.diff}일 남았어요.`}`:date.getDay()===0 || date.getDay()===6?'주말 아침이에요.':'평일 아침이에요.';
  const localNews=['어제 브롱코스의 럭비 경기가 있었어요.','이번 주말 사우스뱅크에서 마켓이 열려요.','근처 도로가 공사 중이에요.','이번 주말 강변에서 야외 공연이 있어요.'];
  return {...event,title:weather,hintKorean:topic,suggestedOpening:event.weather==='rainy'?"Bit wet out there today, isn't it?":event.weather==='humid'?"It's pretty humid today, isn't it?":"Lovely breeze today, isn't it?",briefing:[weather,topic,localNews[Math.floor(Math.random()*localNews.length)]],simulatedDate:date.toISOString().slice(0,10)};
}
