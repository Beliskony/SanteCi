// app/frontend/components/notifications/NotificationGlobalListener.tsx
//
// Écoute l'event socket "notification:new" (émis par notification_service.ts
// via socketRegistry.emitToUser) et alimente le store + les toasts. Couvre
// TOUTES les notifications : messages, rendez-vous, paiements... et les
// appels, qui passent maintenant par ce même canal fiable plutôt que par
// CallGateway (dont le branchement socket est cassé — voir diagnostic).
//
// À monter UNE SEULE FOIS à la racine, à côté de CallGlobalListener :
//   <CallGlobalListener />
//   <NotificationGlobalListener />
//
// Ce composant ne rend rien (return null) — c'est un pur listener.
// ============================================================

'use client';

import { useEffect } from 'react';
import { useSocketStore } from '@/app/frontend/store/soketStore';
import { useNotificationStore } from '@/app/frontend/store/notificationStore';
import type { Notification } from '@/app/frontend/services/notificationService';

export function NotificationGlobalListener() {
  const { socket, isConnected } = useSocketStore();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewNotification = (payload: Notification) => {
      console.log('[NotificationGlobalListener] 📥 notification:new reçu :', payload);
      // Heuristique : seule notifyIncomingCall() met "entrant" dans le titre
      // ("Appel vidéo entrant" / "Appel audio entrant"). Un appel manqué ou
      // terminé ne doit pas sonner ni proposer Accepter/Refuser.
      const isLiveIncomingCall =
        payload.type === 'call' && payload.title?.includes('entrant');

      const notification: Notification = isLiveIncomingCall
        ? { ...payload, data: { ...payload.data, isLiveIncomingCall: true } }
        : payload;

      // Met à jour la liste persistante (badge du header) ET pousse le toast
      // — voir notificationStore.addNotification.
      useNotificationStore.getState().addNotification(notification);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, isConnected]);

  return null;
}