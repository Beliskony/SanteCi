// app/frontend/components/dashboard/callComponents/IncomingCallModal.tsx
'use client';

import { useState } from 'react';
import { Phone, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { useCallStore } from '@/app/frontend/store/callStore';
import { useSocketStore } from '@/app/frontend/store/soketStore';
import { useAuthStore } from '@/app/frontend/store/useAuthStore';

export default function IncomingCallModal() {
  const { 
    incomingCallNotification, 
    isIncomingVisible, 
    hideIncomingCall 
  } = useCallStore();
  
  const { acceptCall, declineCall } = useSocketStore();
  const user = useAuthStore((s) => s.user);
  const [isMuted, setIsMuted] = useState(false);

  //  Log pour debug
  console.log('[IncomingCallModal] isIncomingVisible:', isIncomingVisible);
  console.log('[IncomingCallModal] incomingCallNotification:', incomingCallNotification);

  // Ne rien afficher si pas visible
  if (!isIncomingVisible || !incomingCallNotification) {
    return null;
  }

  const handleAccept = () => {
    const userId = typeof user?._id === 'string' ? user._id : String(user?._id || '');
    console.log('[IncomingCallModal]  Accepter l\'appel:', incomingCallNotification.callSessionId);
    acceptCall(incomingCallNotification.callSessionId, userId);
    hideIncomingCall();
  };

  const handleDecline = () => {
    const userId = typeof user?._id === 'string' ? user._id : String(user?._id || '');
    console.log('[IncomingCallModal] ❌ Refuser l\'appel:', incomingCallNotification.callSessionId);
    declineCall(incomingCallNotification.callSessionId, userId, 'declined');
    hideIncomingCall();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const callLabel = incomingCallNotification.callType === 'video' ? '📹 Appel vidéo' : '📞 Appel audio';
  const callerName = incomingCallNotification.callerName || 'Appelant';

  return (
    <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 text-center animate-in zoom-in-95 duration-300">
        
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Phone className="w-10 h-10 text-[#1e3a8a]" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white animate-ping" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900">
          {callerName}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {callLabel}
        </p>
        
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-gray-400">Sonnerie en cours...</span>
        </div>

        <div className="flex items-center justify-center gap-6 mt-8">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleDecline}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all duration-200 shadow-lg shadow-red-500/40 hover:scale-105 active:scale-95"
            >
              <PhoneOff size={28} />
            </button>
            <span className="text-xs text-gray-400 font-medium">Refuser</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-all duration-200 shadow-lg shadow-green-500/40 hover:scale-105 active:scale-95 animate-pulse"
            >
              <Phone size={28} />
            </button>
            <span className="text-xs text-gray-400 font-medium">Accepter</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleMute}
              className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all duration-200"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <span className="text-xs text-gray-400 font-medium">
              {isMuted ? 'Activer' : 'Muet'}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          L'appel expirera dans 30 secondes
        </p>
      </div>
    </div>
  );
}