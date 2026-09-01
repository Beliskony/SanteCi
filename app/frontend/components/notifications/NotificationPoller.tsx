// app/frontend/components/notifications/NotificationPoller.tsx
//
// Filet de sécurité : sonde le backend toutes les quelques minutes pour
// rattraper les notifications qu'un event socket manqué (déconnexion,
// user:register pas encore fait, page rechargée...) n'aurait pas livrées
// en temps réel. Complète NotificationGlobalListener, ne le remplace pas.
//
// À monter UNE SEULE FOIS à la racine, à côté des autres listeners :
//   <NotificationGlobalListener />
//   <NotificationPoller />
//
// Ne rend rien (return null). Un seul setInterval, nettoyé au démontage —
// pas de fuite mémoire tant qu'il reste monté une seule fois à la racine.
// ============================================================

'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/app/frontend/store/useAuthStore';
import { useNotificationStore } from '@/app/frontend/store/notificationStore';
import { notificationService } from '@/app/frontend/services/notificationService';

// Ajustable — 3 à 5 min est un bon compromis (assez réactif, pas trop
// de charge serveur). Le temps réel reste le chemin principal ; ceci
// n'est qu'un rattrapage périodique.
const POLL_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

export function NotificationPoller() {
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const intervalRef = useRef<number | null>(null);
  const isPollingRef = useRef(false); // évite un chevauchement si une requête traîne

  useEffect(() => {
    if (!isAuthenticated) return;

    const poll = async () => {
      if (isPollingRef.current) return; // requête précédente pas encore finie
      isPollingRef.current = true;

      try {
        const result = await notificationService.list({ limit: 20 });

        const known = new Set(
          useNotificationStore.getState().notifications.map((n) => n._id)
        );
        const fresh = result.notifications.filter((n) => !known.has(n._id));

        // Du plus ancien au plus récent parmi les nouvelles, pour que le
        // toast le plus récent soit le dernier ajouté (donc le plus visible).
        [...fresh].reverse().forEach((n) => {
          useNotificationStore.getState().addNotification(n);
        });
      } catch (err) {
        console.error('[NotificationPoller] Erreur de sondage :', err);
      } finally {
        isPollingRef.current = false;
      }
    };

    intervalRef.current = window.setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated]);

  return null;
}