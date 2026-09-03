// app/frontend/components/notifications/NotificationGlobalListener.tsx
//
// Écoute l'event socket "notification:new" (émis par notification_service.ts
// via socketRegistry.emitToUser) et alimente le store + les toasts. Couvre
// TOUTES les notifications : messages, rendez-vous, paiements... et les
// appels, qui passent maintenant par ce même canal fiable plutôt que par
// CallGateway (dont le branchement socket "call:incoming" est cassé côté
// backend — le receiver n'est apparemment plus notifié par ce canal).
//
// ⚠️ Comme call:incoming n'arrive plus, callStore.incomingPayload restait
// `null` en permanence : acceptCall()/declineCall() du callStore faisaient
// un no-op silencieux ("if (!incomingPayload) return;"). Ce listener peuple
// donc directement callStore dès qu'une notification d'appel entrant en
// direct arrive, pour que phase / incomingPayload existent — même si
// l'action d'accepter/refuser elle-même repasse ensuite par le socket
// (voir NotificationToast.tsx, qui utilise useSocketStore, pas callStore,
// pour l'accept/decline réels).
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
import { useCallStore } from '@/app/frontend/store/callStore';
import type { Notification } from '@/app/frontend/services/notificationService';
import type { IncomingCallPayload } from '@/app/frontend/services/call.service';

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

      if (isLiveIncomingCall && payload.data) {
        // ⚠️ À VÉRIFIER : les noms exacts des champs ci-dessous dépendent de
        // ce que notification.service.ts met dans `data` pour un appel
        // entrant. Si un champ manque (ex: pas de token/uid/appId dans la
        // notif), ce payload sera incomplet et onIncomingCall posera des
        // agoraTokens invalides — dans ce cas il faudra soit enrichir le
        // payload backend, soit re-fetch la session via callService.getById()
        // ici avant d'appeler onIncomingCall.
        const data = payload.data as Partial<IncomingCallPayload>;

        if (data.callSessionId && data.channelName && data.token && data.appId) {
          useCallStore.getState().onIncomingCall({
            callSessionId: data.callSessionId,
            callerId:      data.callerId ?? '',
            callerType:    data.callerType ?? 'doctor',
            callType:      data.callType ?? 'audio',
            channelName:   data.channelName,
            token:         data.token,
            uid:           data.uid ?? 0,
            appId:         data.appId,
            appointmentId: data.appointmentId,
          });
        } else {
          console.warn(
            '[NotificationGlobalListener] Notification d\'appel entrant incomplète — ' +
            'callStore non peuplé, l\'écran plein écran CallRoom ne pourra pas fonctionner :',
            data
          );
        }
      }

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