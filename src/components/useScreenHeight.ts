import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

// Mobile browsers resize the visual viewport when the keyboard opens.
export function useScreenHeight() {
  const { height } = useWindowDimensions();
  const [visibleHeight, setVisibleHeight] = useState<number | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setVisibleHeight(viewport.height);
    update();
    viewport.addEventListener('resize', update);
    return () => viewport.removeEventListener('resize', update);
  }, []);
  return Math.min(height, visibleHeight ?? height);
}
