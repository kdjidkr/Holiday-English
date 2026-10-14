import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

export function useArrivalMusic(active: boolean, enabled: boolean) {
  const sound = useRef<Audio.Sound | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!active || !enabled) return;
    let cancelled = false;
    let loaded: Audio.Sound | null = null;
    setError(null);
    void (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });
        if (cancelled) return;
        const result = await Audio.Sound.createAsync(require('../../assets/arrival/quiet-morning.wav'), {
          shouldPlay: false, isLooping: true, volume: .3,
        });
        loaded = result.sound;
        if (cancelled) { await loaded.unloadAsync(); return; }
        sound.current = loaded;
        await loaded.playAsync();
      } catch {
        if (!cancelled) setError('배경음을 시작하려면 아래 버튼을 눌러 주세요.');
      }
    })();
    return () => {
      cancelled = true;
      if (sound.current === loaded) sound.current = null;
      if (loaded) void loaded.unloadAsync().catch(() => {});
    };
  }, [active, enabled, retry]);
  const resume = () => {
    if (!sound.current) { setRetry(value => value + 1); return; }
    void sound.current.playAsync().then(() => setError(null)).catch(() => setError('브라우저 소리 설정을 확인해 주세요.'));
  };
  return { error, resume };
}
