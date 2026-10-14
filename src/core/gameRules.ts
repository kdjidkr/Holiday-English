import { CustomerPersona, LearnedPattern, ShiftReviewCard } from '../scenarios/types';

export type SessionPhase = 'ARRIVING' | 'ORDERING' | 'AWAITING_ORDER' | 'CHATTING' | 'SERVE_QUEUED' | 'FAREWELL' | 'DEPARTING' | 'DONE';
export interface DialogueTurn { speaker: 'user' | 'customer'; text: string; rescue?: boolean; assisted?: boolean; kind: 'conversation' | 'greeting' | 'farewell'; }
export interface CustomerSessionResult { customer: CustomerPersona; dialogue: DialogueTurn[]; served: boolean; mode: 'practice' | 'live' | 'tts'; }
export interface CustomerRelationship { visits: number; warmVisits: number; status: 'NEW' | 'FRIEND' | 'REGULAR'; }
export interface ShiftRecord { id: string; day: number; date: string; eventTitle: string; sessions: CustomerSessionResult[]; newRegularIds: string[]; patterns: LearnedPattern[]; review?: ShiftReviewCard[]; briefing?: string[]; }

// A reply, rather than elapsed time or grammar, completes one exchange.
export function exchangeCount(dialogue: DialogueTurn[]): number {
  let waiting = false, count = 0;
  for (const turn of dialogue) {
    if (turn.kind !== 'conversation') continue;
    if (turn.speaker === 'user' && turn.text.trim() && !turn.rescue && !turn.assisted) waiting = true;
    if (turn.speaker === 'customer' && turn.text.trim() && waiting) { count++; waiting = false; }
  }
  return count;
}
export function visitRelationship(previous: CustomerRelationship | undefined, session: CustomerSessionResult): CustomerRelationship {
  const warmVisits = (previous?.warmVisits ?? 0) + (session.served && exchangeCount(session.dialogue) >= 2 ? 1 : 0);
  return { visits: (previous?.visits ?? 0) + 1, warmVisits, status: warmVisits >= 2 ? 'REGULAR' : warmVisits === 1 ? 'FRIEND' : 'NEW' };
}
export function queueServe(phase: SessionPhase, ready: boolean, busy: boolean): SessionPhase {
  if (phase !== 'CHATTING' || !ready) return phase;
  return busy ? 'SERVE_QUEUED' : 'FAREWELL';
}

// Coaching is anchored to words actually spoken; unmatched lines stay in the transcript.
const patterns = [
  { test: /(?:how.*going|how are you|good.*morning|g'day|hello|hi\b)/i, koreanMeaning: '손님에게 가볍게 안부를 물어보기', englishTemplate: "How's your [day] going?", slotExamples: ["How's your morning going? — 아침은 어때요?", "How's your week going? — 이번 주는 어때요?", "How's your day going? — 오늘은 어때요?"] },
  { test: /(?:weather|humid|hot|rain|wet|cold|sunny)/i, koreanMeaning: '오늘 날씨에 대해 말하기', englishTemplate: "It's a bit [adjective] today, isn't it?", slotExamples: ["It's a bit humid today, isn't it? — 오늘 좀 습하죠?", "It's a bit wet today, isn't it? — 오늘 비가 좀 오죠?", "It's a bit chilly today, isn't it? — 오늘 좀 쌀쌀하죠?"] },
  { test: /(?:plan|weekend|holiday|surf|beach)/i, koreanMeaning: '주말 계획 물어보기', englishTemplate: 'Got any plans for [occasion]?', slotExamples: ['Got any plans for the weekend? — 주말 계획 있어요?', 'Got any plans for tonight? — 오늘 밤 계획 있어요?', 'Got any plans for your holiday? — 휴가 계획 있어요?'] },
  { test: /(?:thanks|cheers|see you|bye|here.*coffee|here.*your)/i, koreanMeaning: '커피를 건네며 인사하기', englishTemplate: 'Here you go. Have a [adjective] day!', slotExamples: ['Here you go. Have a lovely day! — 여기 있어요. 좋은 하루 보내세요!', 'Here you go. Have a great day! — 멋진 하루 보내세요!', 'Cheers, see you next time! — 고마워요. 다음에 봐요!'] },
];
export function buildCoaching(day: number, sessions: CustomerSessionResult[]): LearnedPattern[] {
  const sentences = sessions.flatMap(s => s.dialogue.filter(t => t.speaker === 'user' && !t.rescue && !t.assisted).map(t => t.text));
  return patterns.filter(p => sentences.some(s => p.test.test(s))).slice(0, 3).map((p, i) => ({ id: `day_${day}_pattern_${i}`, shiftDay: day, sourceQuote: sentences.find(s => p.test.test(s)), koreanMeaning: p.koreanMeaning, englishTemplate: p.englishTemplate, slotExamples: p.slotExamples }));
}
export function practiceReply(customer: CustomerPersona, text: string, exchanges: number, rescue = false): string {
  if (rescue) return "No rush, mate. We could chat about your morning. How's your day going?";
  if (/rain|wet/i.test(text)) return "Yeah, got a bit soaked on the way! A warm coffee will sort me out. Did you walk here too?";
  if (/hot|humid|weather/i.test(text)) return "Tell me about it! Brisbane really turns up the heat. How are you finding the weather here?";
  if (/weekend|plans|holiday/i.test(text)) return customer.name === 'Jack' ? "Might head down the coast for a surf. Have you been to the beach here yet?" : "Thinking of a wander around South Bank. Got a favourite spot in Brisbane yet?";
  if (/coffee|flat white|long black/i.test(text)) return "Lovely, that's just what I needed. Have you been working here long?";
  if (/korea|first|new|learning/i.test(text)) return "Good on ya for giving it a go! You're doing fine. What's been your favourite thing about Brisbane?";
  if (/thanks|cheers/i.test(text)) return "No worries at all! It's nice having a friendly face here. How's your morning been?";
  return exchanges % 2 === 0 ? "Pretty good, cheers! Just grabbing a coffee before heading out. How's your morning going?" : "Sounds nice, mate. I always enjoy a little chat with my coffee. What are you up to after work?";
}

// Conservative explicit handover detection: questions, future promises and negations are not delivery.
export function isDrinkHandover(text: string): boolean {
  const normalized=text.toLowerCase().replace(/[’‘]/g,"'").trim();
  return normalized.split(/(?<=[.!?])\s+|[\n]/).some(sentence=>{
    if(/[?？]/.test(sentence) || /\b(?:not|isn't|isnt|aren't|arent|wasn't|wasnt|will|soon|almost|nearly|when|if|once|until|said|says|say|told|asked|would|could|should|might)\b/.test(sentence))return false;
    if(/아직|곧|않|안\s|면|나요|까요|겠/.test(sentence))return false;
    return /\bhere(?:'s| is| are) (?:your|the) (?:[a-z]+[ -]){0,4}(?:coffee|drink|order|latte|espresso|cappuccino|flat white|long black|tea|chai|mocha)\b/.test(sentence)
      || /\byour (?:[a-z]+[ -]){0,4}(?:coffee|drink|order|latte|espresso|cappuccino|flat white|long black|tea|chai|mocha)(?:'s| is| are)? (?:ready|done)\b/.test(sentence)
      || /(?:커피|음료|주문하신.*)(?:가|는|이)?\s*(?:나왔|준비됐|준비되었|준비가 됐)/.test(sentence);
  });
}
