// app/frontend/components/dashboard/callComponents/CallGlocalListener.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useSocketStore } from '@/app/frontend/store/soketStore';
import { useCallStore } from '@/app/frontend/store/callStore';
import IncomingCallModal from './CallRoom';

export function CallGlobalListener() {
  const { socket, isConnected} = useSocketStore();
  const { onIncomingCall, showIncomingCall, hideIncomingCall } = useCallStore();
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // Charger la sonnerie
  useEffect(() => {
    ringtoneRef.current = new Audio('/sounds/ringtone.mp3');
    ringtoneRef.current.loop = true;
    
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('[CallGlobalListener] Socket non connecté');
      return;
    }

    console.log('[CallGlobalListener]  Écoute des appels entrants activée');

    // ── Appel entrant ──────────────────────────────────────────────────────
    const handleIncomingCall = (payload: any) => {
      console.log('[CallGlobalListener] 📞 Appel entrant reçu GLOBALEMENT:', payload);
      
      // 1. Mettre à jour le store
      onIncomingCall(payload);
      
      // 2. Afficher la modale
      showIncomingCall(true);
      
      // 3. Jouer la sonnerie
      if (ringtoneRef.current) {
        ringtoneRef.current.currentTime = 0;
        ringtoneRef.current.play().catch(err => {
          console.warn('[CallGlobalListener] Impossible de jouer la sonnerie:', err);
        });
      }

      // 4. Notification browser
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('📞 Appel entrant', {
          body: `${payload.callerName || 'Quelqu\'un'} vous appelle`,
          icon: '/icon/favicon.svg',
          requireInteraction: true,
        });
      }
    };

    // ── Appel accepté ──────────────────────────────────────────────────────
    const handleCallAccepted = (payload: any) => {
      console.log('[CallGlobalListener]  Appel accepté:', payload);
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    };

    // ── Appel refusé ──────────────────────────────────────────────────────
    const handleCallDeclined = (payload: any) => {
      console.log('[CallGlobalListener] ❌ Appel refusé:', payload);
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    };

    // ── Appel manqué ──────────────────────────────────────────────────────
    const handleCallMissed = (payload: any) => {
      console.log('[CallGlobalListener] ⏰ Appel manqué:', payload);
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    };

    // ── Appel terminé ──────────────────────────────────────────────────────
    const handleCallEnded = (payload: any) => {
      console.log('[CallGlobalListener] 📞 Appel terminé:', payload);
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    };

    // ── Appel échoué ──────────────────────────────────────────────────────
    const handleCallFailed = (payload: any) => {
      console.log('[CallGlobalListener] ❌ Appel échoué:', payload);
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    };

    // Écouter les événements
    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:declined', handleCallDeclined);
    socket.on('call:missed', handleCallMissed);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:failed', handleCallFailed);

    // Demander la permission de notification
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:declined', handleCallDeclined);
      socket.off('call:missed', handleCallMissed);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:failed', handleCallFailed);
      
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    };
  }, [socket, isConnected, onIncomingCall, showIncomingCall]);

  //  NE PAS NETTOYER ICI - garder la modale affichée
  // useEffect(() => {
  //   return () => {
  //     hideIncomingCall(); // ← Supprimer ou commenter
  //   };
  // }, [hideIncomingCall]);

  return <IncomingCallModal />;
}