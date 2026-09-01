// ============================================================
// components/notifications/NotificationToastContainer.tsx
//
// À monter UNE SEULE FOIS à la racine du site, par ex. dans
// app/frontend/layouts/RootLayout.tsx (ou app/layout.tsx) :
//
//   import NotificationToastContainer from "@/app/frontend/components/notifications/NotificationToastContainer";
//   ...
//   <body>
//     {children}
//     <NotificationToastContainer />
//     <IncomingCallModal />
//   </body>
//
// Une fois monté, n'importe quel composant/page peut faire apparaître
// un toast, où qu'on soit sur le site :
//   useToastStore.getState().push(notification)
//
// C'est aussi automatique : useNotificationStore().addNotification(notif)
// (utilisé par le listener socket temps réel) pousse désormais un toast
// en plus de mettre à jour la liste persistante — voir notificationStore.ts.
// ============================================================

"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useToastStore } from "@/app/frontend/store/toastStore";
import NotificationToast from "./NotificationToast";

export default function NotificationToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const [mounted, setMounted] = useState(false);

  // createPortal a besoin de document.body → seulement côté client
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-9998 flex flex-col-reverse gap-3 sm:inset-x-auto sm:right-4 sm:w-96"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <NotificationToast
          key={toast.id}
          id={toast.id}
          notification={toast.notification}
        />
      ))}
    </div>,
    document.body
  );
}