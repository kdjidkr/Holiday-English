import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { LearnedPattern, ShiftReviewCard } from '../scenarios/types';
import { CustomerRelationship, ShiftRecord, visitRelationship } from '../core/gameRules';

export interface UserProfile { koreanName: string; englishNameKorean: string; englishNameAlphabet: string; gender: 'MALE' | 'FEMALE'; situation: 'JOB_SEEKER_GRADUATE' | 'BURNOUT_CAREER'; isOnboarded: boolean; }
const savePath = `${FileSystem.documentDirectory}sunny-side-save.json`;
let pendingWrite = Promise.resolve();
const storage: StateStorage = {
  getItem: async name => {
    if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(name);
    return (await FileSystem.getInfoAsync(savePath)).exists ? FileSystem.readAsStringAsync(savePath) : null;
  },
  setItem: (name, value) => {
    if (Platform.OS === 'web') { localStorage.setItem(name, value); return; }
    pendingWrite = pendingWrite.catch(() => {}).then(() => FileSystem.writeAsStringAsync(savePath, value));
    return pendingWrite;
  },
  removeItem: async name => { if (Platform.OS === 'web') localStorage.removeItem(name); else await FileSystem.deleteAsync(savePath, { idempotent: true }); },
};
interface GameState {
  voiceMode:'tts'|'live'; prepTimeSeconds:number; setVoiceMode:(mode:'tts'|'live')=>void; setPrepTimeSeconds:(seconds:number)=>void;
  soundEnabled: boolean; translationEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void; setTranslationEnabled: (enabled: boolean) => void;
  userProfile: UserProfile; currentShiftDay: number; relationships: Record<string, CustomerRelationship>;
  arrivalSeen: boolean; shiftHistory: ShiftRecord[]; vaultPatterns: LearnedPattern[]; hydrated: boolean; saveError: string | null;
  completeOnboarding: (profile: Omit<UserProfile, 'isOnboarded'>) => void;
  completeShift: (record: ShiftRecord) => void;
  togglePatternStar: (id:string) => void;
  savePatternToVault: (pattern: LearnedPattern) => void;
  saveShiftReview: (recordId: string, review: ShiftReviewCard[]) => void;
}
export const useGameStore = create<GameState>()(persist((set) => ({
  userProfile: { koreanName: '', englishNameKorean: '', englishNameAlphabet: '', gender: 'FEMALE', situation: 'BURNOUT_CAREER', isOnboarded: false },
  voiceMode:'live',prepTimeSeconds:0,setVoiceMode:voiceMode=>set({voiceMode}),setPrepTimeSeconds:prepTimeSeconds=>set({prepTimeSeconds}),
  soundEnabled: true, translationEnabled: false,
  setSoundEnabled: soundEnabled => set({ soundEnabled }),
  setTranslationEnabled: translationEnabled => set({ translationEnabled }),
  arrivalSeen: false, currentShiftDay: 1, relationships: {}, shiftHistory: [], vaultPatterns: [], hydrated: false, saveError: null,
  completeOnboarding: profile => set({ userProfile: { ...profile, isOnboarded: true }, arrivalSeen: true }),
  completeShift: record => set(state => {
    if (state.shiftHistory.some(s => s.id === record.id)) return state;
    const relationships = { ...state.relationships };
    const newRegularIds: string[] = [];
    for (const session of record.sessions) {
      const previous = relationships[session.customer.id];
      const next = visitRelationship(previous, session);
      relationships[session.customer.id] = next;
      if (next.status === 'REGULAR' && previous?.status !== 'REGULAR') newRegularIds.push(session.customer.id);
    }
    return { relationships, shiftHistory: [{ ...record, newRegularIds }, ...state.shiftHistory], currentShiftDay: state.currentShiftDay + 1 };
  }),
  togglePatternStar: id => set(state=>({vaultPatterns:state.vaultPatterns.map(p=>p.id===id?{...p,starred:!p.starred}:p)})),
  savePatternToVault: pattern => set(state => state.vaultPatterns.some(p => p.id === pattern.id) ? state : { vaultPatterns: [pattern, ...state.vaultPatterns] }),
  saveShiftReview: (recordId, review) => set(state => ({shiftHistory:state.shiftHistory.map(record => record.id === recordId && (record.review === undefined || review.length > record.review.length) ? {...record,review} : record)})),
}), {
  version:1,
  migrate:(persisted:any)=>({...persisted,voiceMode:'live'}),
  name: 'sunny-side-v2', storage: createJSONStorage(() => ({
    ...storage,
    setItem: async (name, value) => {
      try { await storage.setItem(name, value); } catch { if (!useGameStore.getState().saveError) useGameStore.setState({ saveError: '저장 공간을 확인해 주세요. 이번 진행을 저장하지 못했습니다.' }); }
    },
  })),
  partialize: ({ voiceMode, prepTimeSeconds, userProfile, arrivalSeen, currentShiftDay, relationships, shiftHistory, vaultPatterns, soundEnabled, translationEnabled }) => ({ voiceMode, prepTimeSeconds, userProfile, arrivalSeen, currentShiftDay, relationships, shiftHistory, vaultPatterns, soundEnabled, translationEnabled }),
  onRehydrateStorage: () => (_state, error) => { setTimeout(() => useGameStore.setState({ hydrated: true, saveError: error ? '기존 저장을 읽지 못했습니다.' : null }), 0); },
}));
