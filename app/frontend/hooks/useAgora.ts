// app/frontend/hooks/useAgora.ts
import { useEffect, useRef, useState } from 'react';
import AgoraRTC, { 
  IAgoraRTCClient, 
  ILocalAudioTrack, 
  ILocalVideoTrack,
} from 'agora-rtc-sdk-ng';

interface UseAgoraProps {
  appId: string;
  channelName: string;
  token: string;
  uid: number;
}

export function useAgora({ appId, channelName, token, uid }: UseAgoraProps) {
  const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const joinedRef = useRef(false);
  const tracksPublishedRef = useRef(false);
  //  Refs pour les tracks locales : lues au moment du cleanup, elles
  // reflètent toujours la dernière valeur réelle (contrairement au state
  // capturé dans la closure de l'effect au moment de sa création).
  const localAudioTrackRef = useRef<ILocalAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ILocalVideoTrack | null>(null);

  useEffect(() => {
    // Vérifier les paramètres
    if (!appId || !channelName || !token) {
      console.warn('[Agora] Paramètres manquants:', { appId, channelName, token: !!token });
      return;
    }

    // Éviter les doubles connexions
    if (joinedRef.current) {
      console.log('[Agora] Déjà connecté');
      return;
    }

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;
    setIsJoining(true);

    //  Empêche la boucle de reconnexion (retry setTimeout) de recréer des
    // tracks après que le composant se soit démonté / que l'effect ait été nettoyé.
    let isActive = true;
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

    // ── Événements ──────────────────────────────────────────────────────────
    client.on('user-published', async (user, mediaType) => {
      console.log('[Agora] user-published:', user.uid, mediaType);
      try {
        await client.subscribe(user, mediaType);
        
        if (mediaType === 'audio') {
          const audioTrack = user.audioTrack;
          audioTrack?.play();
          console.log('[Agora] Audio distant connecté');
        }
        
        if (mediaType === 'video') {
          const videoTrack = user.videoTrack;
          const remoteDiv = document.getElementById('remote-video');
          if (remoteDiv) {
            videoTrack?.play('remote-video');
            console.log('[Agora] Vidéo distante connectée');
          }
        }
        
        setRemoteUsers(prev => {
          if (prev.find(u => u.uid === user.uid)) return prev;
          return [...prev, user];
        });
      } catch (error) {
        console.error('[Agora] Erreur subscription:', error);
      }
    });

    client.on('user-unpublished', (user) => {
      console.log('[Agora] user-unpublished:', user.uid);
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    client.on('user-left', (user) => {
      console.log('[Agora] user-left:', user.uid);
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    client.on('connection-state-change', (curState, prevState) => {
      console.log('[Agora] Connection state:', prevState, '→', curState);
      if (curState === 'CONNECTED') {
        setIsConnected(true);
        setIsJoining(false);
        joinedRef.current = true;
      }
      if (curState === 'DISCONNECTED' || curState === 'RECONNECTING') {
        setIsConnected(false);
      }
    });

    // ── Joindre le channel ──────────────────────────────────────────────────
    const joinChannel = async () => {
      try {
        console.log('[Agora] Connexion au channel:', channelName);
        
        // 1. Joindre
        await client.join(appId, channelName, token, uid);
        console.log('[Agora]  Channel rejoint');

        // 2. Créer les tracks
        console.log('[Agora] Création des tracks...');
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        
        // Activer les tracks par défaut
        await audioTrack.setEnabled(true);
        await videoTrack.setEnabled(true);
        
        //  Refs d'abord (source de vérité pour le cleanup), puis state (pour l'UI)
        localAudioTrackRef.current = audioTrack;
        localVideoTrackRef.current = videoTrack;
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);

        // 3. Publier les tracks
        console.log('[Agora] Publication des tracks...');
        await client.publish([audioTrack, videoTrack]);
        tracksPublishedRef.current = true;
        console.log('[Agora]  Tracks publiées');

        // 4. Afficher la vidéo locale
        const localDiv = document.getElementById('local-video');
        if (localDiv) {
          videoTrack.play('local-video');
          console.log('[Agora]  Vidéo locale affichée');
        }

        setIsConnected(true);
        setIsJoining(false);
        joinedRef.current = true;

      } catch (error) {
        console.error('[Agora] ❌ Erreur de connexion:', error);
        setIsJoining(false);
        // Réessayer après 3s (seulement si le composant est toujours monté)
        if (!isActive) return;
        retryTimeoutId = setTimeout(() => {
          if (isActive && !joinedRef.current && clientRef.current) {
            console.log('[Agora] Tentative de reconnexion...');
            joinChannel();
          }
        }, 3000);
      }
    };

    joinChannel();

    // ── Nettoyage amélioré ──────────────────────────────────────────────────
    return () => {
      console.log('[Agora] 🧹 Nettoyage des ressources...');
      isActive = false;
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      joinedRef.current = false;
      tracksPublishedRef.current = false;
      
      // 1. Fermer les tracks audio/vidéo
      //  On lit les refs (toujours à jour), pas le state `localAudioTrack`
      // qui serait figé sur la valeur `null` capturée à la création de l'effect.
      if (localAudioTrackRef.current) {
        try {
          localAudioTrackRef.current.close();
          console.log('[Agora]  Track audio fermée (accès micro relâché)');
        } catch (e) {
          console.warn('[Agora] Erreur fermeture audio:', e);
        }
        localAudioTrackRef.current = null;
        setLocalAudioTrack(null);
      }
      
      if (localVideoTrackRef.current) {
        try {
          localVideoTrackRef.current.close();
          console.log('[Agora]  Track vidéo fermée (accès caméra relâché)');
        } catch (e) {
          console.warn('[Agora] Erreur fermeture vidéo:', e);
        }
        localVideoTrackRef.current = null;
        setLocalVideoTrack(null);
      }
      
      // 2. Quitter le channel
      if (clientRef.current) {
        try {
          clientRef.current.leave();
          console.log('[Agora]  Channel quitté');
        } catch (e) {
          console.warn('[Agora] Erreur leave:', e);
        }
        clientRef.current.removeAllListeners();
        clientRef.current = null;
      }
      
      // 3. Réinitialiser l'état
      setIsConnected(false);
      setIsJoining(false);
      setRemoteUsers([]);
      
      console.log('[Agora]  Nettoyage terminé');
    };
  }, [appId, channelName, token, uid]);

  // ── Contrôles ──────────────────────────────────────────────────────────────
  const toggleMute = () => {
    if (localAudioTrack) {
      const enabled = localAudioTrack.enabled;
      localAudioTrack.setEnabled(!enabled);
      console.log('[Agora] Micro:', !enabled ? 'activé' : 'coupé');
    }
  };

  const toggleCamera = () => {
    if (localVideoTrack) {
      const enabled = localVideoTrack.enabled;
      localVideoTrack.setEnabled(!enabled);
      console.log('[Agora] Caméra:', !enabled ? 'activée' : 'coupée');
    }
  };

  return {
    localAudioTrack,
    localVideoTrack,
    remoteUsers,
    isConnected: isConnected && !isJoining,
    isJoining,
    toggleMute,
    toggleCamera,
    client: clientRef.current,
  };
}