// app/frontend/components/layouts/SocketConnectionManager.tsx
//
// Connecte le socket dès que l'utilisateur est authentifié, peu importe
// la page sur laquelle il se trouve — pas seulement sur le dashboard.
// Avant ce composant, connect() n'était probablement appelé que dans un
// composant monté uniquement sur les routes dashboard, d'où le patient
// "hors ligne" tant qu'il n'y était pas allé alors qu'il était bien connecté.
//
// À monter UNE SEULE FOIS à la racine, avant les autres listeners socket :
//   <SocketConnectionManager />
//   <CallGlobalListener />
//   <NotificationGlobalListener />
//   <NotificationPoller />
//
// Ne rend rien (return null).
// ============================================================

'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/app/frontend/store/useAuthStore';
import { useSocketStore } from '@/app/frontend/store/soketStore';

export function SocketConnectionManager() {
  // _hasHydrated : attendre que zustand-persist ait fini de relire le
  // localStorage avant de juger si l'utilisateur est authentifié ou non —
  // sinon on risque un faux "non connecté" au tout premier rendu.
  const hasHydrated     = useAuthStore((s) => s._hasHydrated);
  const isAuthenticated = useAuthStore((s) => !!s.user);

  useEffect(() => {
    if (!hasHydrated) return;

    if (isAuthenticated) {
      useSocketStore.getState().connect();
    } else {
      useSocketStore.getState().disconnect();
    }
  }, [hasHydrated, isAuthenticated]);

  return null;
}