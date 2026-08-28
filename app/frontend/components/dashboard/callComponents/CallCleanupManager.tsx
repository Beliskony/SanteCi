// app/frontend/components/dashboard/callComponents/CallCleanupManager.tsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCallStore } from '@/app/frontend/store/callStore';

export function CallCleanupManager() {
  const pathname = usePathname();
  
  useEffect(() => {
    // Nettoyer à chaque changement de route
    const cleanup = () => {
      const { phase, endCall, resetToIdle, _clearTimers } = useCallStore.getState();
      
      if (phase === 'ongoing' || phase === 'connecting' || phase === 'calling') {
        console.log('[CallCleanupManager] 🧹 Nettoyage de l\'appel en cours (route:',
 pathname, ')');
        endCall();
        resetToIdle();
        _clearTimers();
      }
    };
    
    cleanup();
    
    // Nettoyer aussi quand le composant se démonte
    return () => {
      const { phase, endCall, resetToIdle, _clearTimers } = useCallStore.getState();
      if (phase === 'ongoing' || phase === 'connecting' || phase === 'calling') {
        console.log('[CallCleanupManager] 🧹 Nettoyage de l\'appel en cours (démontage)');
        endCall();
        resetToIdle();
        _clearTimers();
      }
    };
  }, [pathname]);
  
  return null;
}