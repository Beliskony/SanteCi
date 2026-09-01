// ============================================================
// hooks/useNotificationSound.ts
// - Pattern "call"  : joue public/sounds/ringtone.mp3 en boucle.
//   Si le fichier ne charge pas ou que l'autoplay est bloqué,
//   repli automatique sur une sonnerie synthétisée (Web Audio).
// - Pattern "alert" : bip court synthétisé (Web Audio), utilisé
//   pour les toasts "emergency" — pas de fichier son dédié.
//
// NOTE navigateur : la lecture automatique peut être bloquée tant
// qu'aucune interaction utilisateur n'a eu lieu sur la page. En
// pratique un appel entrant arrive après connexion/navigation de
// l'utilisateur donc c'est généralement débloqué ; le hook gère
// quand même l'échec proprement (+ vibration en repli mobile).
// ============================================================

"use client";

import { useCallback, useRef } from "react";

type RingtonePattern = "call" | "alert";

const RINGTONE_SRC = "/sounds/ringtone.mp3";

interface PatternConfig {
  freqs: number[];
  toneDuration: number; // durée d'une "sonnerie" synthétisée, en secondes
  cycle: number;        // intervalle entre deux sonneries, en secondes
}

// Utilisé uniquement pour le repli synthétisé (call) et pour "alert"
const PATTERNS: Record<RingtonePattern, PatternConfig> = {
  call: { freqs: [480, 620], toneDuration: 0.45, cycle: 1.6 },
  alert: { freqs: [880], toneDuration: 0.18, cycle: 0.4 },
};

export function useNotificationSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const isPlayingRef = useRef(false);

  const getContext = (): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      audioCtxRef.current = new AudioCtx();
    }
    return audioCtxRef.current;
  };

  const clearTimers = () => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  };

  const playTone = (ctx: AudioContext, freqs: number[], duration: number) => {
    const now = ctx.currentTime;
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.setValueAtTime(0.15, now + duration - 0.03);
      gain.gain.linearRampToValueAtTime(0, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    });
  };

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    clearTimers();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
      audioElRef.current = null;
    }
  }, []);

  const startSynthesized = useCallback(
    (pattern: RingtonePattern, loop: boolean) => {
      const ctx = getContext();
      if (!ctx) return;

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {
          /* toujours bloqué par l'autoplay — on abandonne */
        });
      }

      const { freqs, toneDuration, cycle } = PATTERNS[pattern];
      isPlayingRef.current = true;

      const tick = () => {
        if (!isPlayingRef.current) return;
        try {
          playTone(ctx, freqs, toneDuration);
        } catch {
          // le contexte a pu être fermé entre-temps, on ignore
        }
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(Math.round(toneDuration * 1000));
        }
        if (loop) {
          const id = window.setTimeout(tick, cycle * 1000);
          timeoutsRef.current.push(id);
        } else {
          isPlayingRef.current = false;
        }
      };

      tick();
    },
    []
  );

  const start = useCallback(
    (pattern: RingtonePattern = "call", loop = true) => {
      stop();

      // Pour l'appel entrant : on essaie d'abord le vrai fichier son.
      if (pattern === "call" && typeof window !== "undefined") {
        try {
          const audio = new Audio(RINGTONE_SRC);
          audio.loop = loop;
          audio.volume = 0.85;
          audioElRef.current = audio;
          isPlayingRef.current = true;

          const playPromise = audio.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {
              // fichier introuvable / autoplay bloqué → repli synthétisé
              audioElRef.current = null;
              startSynthesized(pattern, loop);
            });
          }

          if (typeof navigator !== "undefined" && navigator.vibrate && loop) {
            navigator.vibrate([400, 200, 400, 200]);
          }
          return;
        } catch {
          audioElRef.current = null;
          // on tombe dans le repli synthétisé ci-dessous
        }
      }

      startSynthesized(pattern, loop);
    },
    [stop, startSynthesized]
  );

  return { start, stop };
}