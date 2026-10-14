import { useEffect, useRef, useState } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import type { ArrivalBeat } from './story';
const clips: Partial<Record<ArrivalBeat, number>> = {
  // Driver and manager dialogue is shown as subtitles with background music only.
};
export function useArrivalVoice(beat: ArrivalBeat, enabled: boolean) {
  const sound = useRef<Audio.Sound | null>(null);
  const revision = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stop = () => {
    revision.current++;
    const previous = sound.current; sound.current = null;
    if (previous) void previous.unloadAsync().catch(() => {});
  };
  const play = async () => {
    stop(); setPlaying(false); setError(null);
    const asset = clips[beat]; if (!asset || !enabled) return;
    const request = revision.current;
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });
      if (revision.current !== request) return;
      const result = await Audio.Sound.createAsync(asset, { shouldPlay: false, volume: .85 });
      if (revision.current !== request) { await result.sound.unloadAsync(); return; }
      sound.current = result.sound;
      result.sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (revision.current !== request) return;
        if (status.isLoaded) setPlaying(status.isPlaying && !status.didJustFinish);
        else if (status.error) { setPlaying(false); setError('소리를 시작하지 못했어요. 대사 다시 듣기를 눌러주세요.'); }
      });
      await result.sound.playAsync();
    } catch {
      if (revision.current === request) { setPlaying(false); setError('브라우저가 소리 재생을 막았어요. 대사 다시 듣기를 눌러주세요.'); }
    }
  };
  useEffect(() => {
    if (enabled && beat !== 'BOARDING') void play(); else { stop(); setPlaying(false); }
    return stop;
  }, [beat, enabled]);
  return { playing, error, replay: play };
}
