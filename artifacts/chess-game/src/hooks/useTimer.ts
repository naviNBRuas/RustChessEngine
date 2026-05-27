import { useState, useEffect, useRef, useCallback } from 'react';

export interface TimerState {
  white: number;
  black: number;
}

export function useTimer(initialSeconds: number, activeColor: 'white' | 'black' | null) {
  const [times, setTimes] = useState<TimerState>({
    white: initialSeconds,
    black: initialSeconds,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeColorRef = useRef(activeColor);
  activeColorRef.current = activeColor;

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimer();
    if (activeColor === null) return;

    intervalRef.current = setInterval(() => {
      setTimes((prev) => {
        const color = activeColorRef.current;
        if (!color) return prev;
        const next = Math.max(0, prev[color] - 1);
        return { ...prev, [color]: next };
      });
    }, 1000);

    return clearTimer;
  }, [activeColor, clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setTimes({ white: initialSeconds, black: initialSeconds });
  }, [initialSeconds, clearTimer]);

  const formatTime = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  return { times, reset, formatTime };
}
