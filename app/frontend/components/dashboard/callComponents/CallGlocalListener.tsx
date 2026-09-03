'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useCallStore } from '@/app/frontend/store/callStore';

// ssr: false empêche ce chunk (et donc agora-rtc-sdk-ng) d'être
// inclus dans le rendu serveur — il ne se charge qu'au montage client.
const CallRoom = dynamic(() => import('./CallRoom'), { ssr: false });

export function CallGlobalListener() {
  const phase = useCallStore((s) => s.phase);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    ringtoneRef.current = new Audio('/sounds/ringtone.mp3');
    ringtoneRef.current.loop = true;
    return () => { ringtoneRef.current?.pause(); ringtoneRef.current = null; };
  }, []);

  useEffect(() => {
    const audio = ringtoneRef.current;
    if (!audio) return;
    if (phase === 'ringing') {
      audio.currentTime = 0;
      audio.play().catch((err) => console.warn('[Ringtone] bloqué:', err));
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [phase]);

  return phase !== 'idle' ? <CallRoom /> : null;
}