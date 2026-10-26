import {geminiLiveSocketUrl} from './apiUrl';
import { Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
declare const __DEV__: boolean;
let nextLiveSession = 0;
export interface LiveCallbacks {
  onReady: () => void; onStart: () => void; onText: (text: string) => void;
  onComplete: () => void; onSpeechUnavailable?:()=>void; onAudioBlocked?: () => void; onError: (message: string) => void;
}
// One client belongs to one customer; all handlers and playback are invalidated on exit.
export class GeminiLiveClient {
  private sessionId = ++nextLiveSession;
  private log(event: string, details: Record<string, unknown> = {}) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[Live]', event, JSON.stringify({sessionId:this.sessionId,...details}));
  }
  private ws: WebSocket | null = null;
  private audio: AudioContext | null = null;
  private nativeAudioChunks: Uint8Array[] = [];
  private nativeSound: Audio.Sound | null = null;
  private nativeSoundFinished: (() => void) | null = null;
  private nativePlaybackRevision = 0;
  private output: GainNode | null = null;
  private soundEnabled = true;
  private sources = new Set<AudioBufferSourceNode>();
  private scheduledTime = 0;
  private ready = false;
  private active = false;
  private generating = false;
  private completionTimer: ReturnType<typeof setTimeout> | null = null;
  private setupTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: LiveCallbacks | null = null;
  private sawTranscription = false;
  private fallbackText = '';
  async connect(instruction: string, callbacks: LiveCallbacks, voiceName: string = 'Puck') {
    this.log('connect', {voiceName});
    this.callbacks = callbacks;
    this.active = true;
    try {
      if (Platform.OS === 'web') {
        if (typeof window === 'undefined' || !(window.AudioContext || (window as any).webkitAudioContext)) {
          callbacks.onError('이 브라우저에서는 실시간 음성을 지원하지 않아요.'); return;
        }
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audio = new AudioContextClass({ sampleRate: 24000 });
        this.output = this.audio!.createGain();
        this.output.gain.value = this.soundEnabled ? 1 : 0;
        this.output.connect(this.audio!.destination);
        await this.audio!.resume();
      } else {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true, playThroughEarpieceAndroid: false });
      }
      if (!this.active) return;
      const model = 'gemini-3.8-live';
      const socketUrl = await geminiLiveSocketUrl('gemini-3.8-live');
      if (!this.active) return;
      const ws = new WebSocket(socketUrl);
      this.ws = ws;
      this.setupTimer = setTimeout(() => { if (this.active && !this.ready) callbacks.onError('손님과 연결되지 않았어요. 연습 모드로 이어갈 수 있습니다.'); }, 12000);
      ws.onopen = () => {
        if (!this.active) return;
        ws.send(JSON.stringify({ setup: { model: `models/${model}`, generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } }, systemInstruction: { parts: [{ text: instruction }] }, outputAudioTranscription: {} } }));
      };
      ws.onmessage = async event => {
        try {
          const data = event.data instanceof Blob ? await event.data.text() : event.data;
          if (!this.active || this.ws !== ws) return;
          const message = JSON.parse(data);
          if (message.error) { callbacks.onError(message.error.message || '음성 연결에 실패했습니다.'); return; }
          if (message.setupComplete) { this.log('ready', {voiceName}); this.ready = true; if (this.setupTimer) clearTimeout(this.setupTimer); callbacks.onReady(); }
          const content = message.serverContent;
          if (!content) return;
          const transcription = content.outputTranscription?.text || content.outputAudioTranscription?.text;
          if ((content.modelTurn || transcription) && !this.generating) {
            this.generating = true; this.sawTranscription = false; this.fallbackText = ''; callbacks.onStart();
          }
          for (const part of content.modelTurn?.parts || []) {
            if (part.inlineData?.data) this.play(part.inlineData.data);
            if (part.text && !part.thought) this.fallbackText += part.text;
          }
          if (transcription) { this.sawTranscription = true; callbacks.onText(transcription); }
          if (content.interrupted) { this.stopAudio(); }
          if (content.turnComplete || content.interrupted) {
            if (!this.sawTranscription && this.fallbackText) callbacks.onText(this.fallbackText);
            this.generating = false;
            if (Platform.OS !== 'web') {
              if (content.interrupted) this.nativeAudioChunks = [];
              void this.playNativeTurn(callbacks);
              return;
            }
            if (this.soundEnabled && this.audio && this.audio.state !== 'running' && this.sources.size) { callbacks.onAudioBlocked?.(); return; }
            const remaining = this.audio ? Math.max(0, this.scheduledTime - this.audio.currentTime) * 1000 : 0;
            if (this.completionTimer) clearTimeout(this.completionTimer);
            this.completionTimer = setTimeout(() => { if (this.active) callbacks.onComplete(); }, remaining + 80);
          }
        } catch { if (this.active) callbacks.onError('손님의 응답을 읽지 못했습니다.'); }
      };
      ws.onerror = () => { if (this.active) callbacks.onError('음성 연결이 끊겼습니다. 연습 모드로 이어갈 수 있어요.'); };
      ws.onclose = () => { this.log('closed'); this.ready = false; if (this.active) callbacks.onError('손님과의 연결이 종료되었습니다.'); };
    } catch { if (this.active) callbacks.onError('오디오를 시작하지 못했습니다. 연습 모드를 선택해 주세요.'); }
  }
  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (this.output) this.output.gain.value = enabled ? 1 : 0;
    if (!enabled && this.audio?.state !== 'running') {
      this.stopAudio();
      if (!this.generating && this.active) {
        if (this.completionTimer) clearTimeout(this.completionTimer);
        this.completionTimer = setTimeout(() => { if (this.active) this.callbacks?.onComplete(); }, 80);
      }
    }
    if (!enabled && Platform.OS !== 'web') {
      this.nativeAudioChunks = [];
      const sound = this.nativeSound;
      const finished = this.nativeSoundFinished;
      this.nativeSound = null; this.nativeSoundFinished = null; this.nativePlaybackRevision++;
      if (sound) void sound.stopAsync().catch(() => {}).then(() => sound.unloadAsync().catch(() => {})).finally(() => finished?.());
      else if (!this.generating && this.active) this.callbacks?.onComplete();
    }
  }
  async enableAudio(): Promise<boolean> {
    if (Platform.OS !== 'web') {
      if (!this.active) return false;
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true, playThroughEarpieceAndroid: false });
        if (this.nativeSound) await this.nativeSound.playAsync();
        return true;
      } catch { return false; }
    }
    if (!this.audio || !this.active) return false;
    try {
      await this.audio.resume();
      if (this.audio.state !== 'running' || !this.active) return false;
      if (this.generating) return true;
      if (this.completionTimer) clearTimeout(this.completionTimer);
      const remaining = Math.max(0, this.scheduledTime - this.audio.currentTime) * 1000;
      this.completionTimer = setTimeout(() => { if (this.active) this.callbacks?.onComplete(); }, remaining + 80);
      return true;
    } catch { return false; }
  }
  send(text: string): boolean {
    if (!this.ready || !this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    if (this.completionTimer) clearTimeout(this.completionTimer);
    this.ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true } }));
    return true;
  }
  private play(base64: string) {
    if (Platform.OS !== 'web') {
      if (this.soundEnabled) {
        const binary = atob(base64);
        this.nativeAudioChunks.push(Uint8Array.from(binary, c => c.charCodeAt(0)));
      }
      return;
    }
    const audio = this.audio; if (!audio || (!this.soundEnabled && audio.state !== 'running')) return;
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    const count = Math.floor(bytes.length / 2);
    const buffer = audio.createBuffer(1, count, 24000);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < count; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
    const source = audio.createBufferSource(); source.buffer = buffer; source.connect(this.output || audio.destination);
    this.scheduledTime = Math.max(audio.currentTime, this.scheduledTime);
    source.start(this.scheduledTime); this.scheduledTime += buffer.duration;
    this.sources.add(source); source.onended = () => this.sources.delete(source);
  }
  private async playNativeTurn(callbacks: LiveCallbacks) {
    const chunks = this.nativeAudioChunks; this.nativeAudioChunks = [];
    if (!this.active || !this.soundEnabled || !chunks.length) { if (this.active) callbacks.onComplete(); return; }
    const directory = FileSystem.cacheDirectory;
    if (!directory) { callbacks.onSpeechUnavailable?.(); callbacks.onComplete(); return; }
    const revision = ++this.nativePlaybackRevision;
    let sound: Audio.Sound | null = null;
    try {
      const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const pcm = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { pcm.set(chunk, offset); offset += chunk.length; }
      const wav = pcmToWav(pcm, 24000);
      const uri = `${directory}live-${this.sessionId}-${revision}.wav`;
      await FileSystem.writeAsStringAsync(uri, bytesToBase64(wav), { encoding: FileSystem.EncodingType.Base64 });
      if (!this.active || revision !== this.nativePlaybackRevision) { void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}); return; }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true, playThroughEarpieceAndroid: false });
      const created = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
      sound = created.sound; this.nativeSound = sound;
      this.nativeSoundFinished = () => { if (revision === this.nativePlaybackRevision) { this.nativeSound = null; this.nativeSoundFinished = null; void sound?.unloadAsync().catch(() => {}); void FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}); callbacks.onComplete(); } };
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => { if (status.isLoaded && status.didJustFinish) this.nativeSoundFinished?.(); });
      await sound.playAsync();
    } catch {
      if (revision === this.nativePlaybackRevision) {
        if (sound) void sound.unloadAsync().catch(() => {});
        this.nativeSound = null; this.nativeSoundFinished = null;
        callbacks.onSpeechUnavailable?.(); callbacks.onComplete();
      }
    }
  }
  private stopAudio() {
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources.clear(); this.scheduledTime = 0; this.nativeAudioChunks = [];
    const sound = this.nativeSound; this.nativeSound = null; this.nativeSoundFinished = null; this.nativePlaybackRevision++;
    if (sound) void sound.stopAsync().catch(() => {}).then(() => sound.unloadAsync().catch(() => {}));
  }
  disconnect() {
    this.log('disconnect');
    this.active = false; this.ready = false;
    if (this.setupTimer) clearTimeout(this.setupTimer);
    if (this.completionTimer) clearTimeout(this.completionTimer);
    this.stopAudio();
    this.ws?.close(); this.ws = null;
    if (this.audio) void this.audio.close().catch(() => {}); this.audio = null; this.output = null;
  }
}

export function pcmToWav(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const wav = new Uint8Array(44 + pcm.length); const view = new DataView(wav.buffer);
  const write = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) wav[offset + i] = value.charCodeAt(i); };
  write(0, 'RIFF'); view.setUint32(4, 36 + pcm.length, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, 'data'); view.setUint32(40, pcm.length, true); wav.set(pcm, 44); return wav;
}

export function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], hasB = i + 1 < bytes.length, hasC = i + 2 < bytes.length;
    const b = hasB ? bytes[i + 1] : 0, c = hasC ? bytes[i + 2] : 0;
    output += alphabet[a >> 2] + alphabet[((a & 3) << 4) | (b >> 4)] + (hasB ? alphabet[((b & 15) << 2) | (c >> 6)] : '=') + (hasC ? alphabet[c & 63] : '=');
  }
  return output;
}
