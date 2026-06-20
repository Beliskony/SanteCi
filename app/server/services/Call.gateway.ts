import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { callService } from '../services/Call.service';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocketUser {
  userId:   string;
  userType: 'doctor' | 'patient';
  socketId: string;
}

// ─── Événements entrants (client → serveur) ───────────────────────────────────
// call:initiate      → démarrer un appel
// call:accept        → accepter un appel entrant
// call:decline       → refuser un appel
// call:end           → raccrocher
// call:ice-candidate → relayer un candidat ICE WebRTC
// call:token-refresh → demander de nouveaux tokens Agora
// user:register      → enregistrer le socket de l'utilisateur connecté

// ─── Événements sortants (serveur → client) ───────────────────────────────────
// call:incoming      → appel entrant (envoyé au receiver)
// call:accepted      → appel accepté (envoyé au caller)
// call:declined      → appel refusé (envoyé au caller)
// call:ended         → appel terminé (envoyé aux deux)
// call:missed        → appel manqué (timeout)
// call:failed        → erreur technique
// call:tokens        → nouveaux tokens Agora rafraîchis
// call:ice-candidate → candidat ICE relayé à l'autre pair

// ─── Durée max de sonnerie avant "manqué" ─────────────────────────────────────
const RING_TIMEOUT_MS = 45000; // 45 secondes

// ─── Call Gateway ─────────────────────────────────────────────────────────────

export class CallGateway {
  private io: SocketServer;

  // Map userId → socketId pour router les événements
  private userSockets = new Map<string, string>();

  // Map callSessionId → timeout handle (sonnerie)
  private ringTimers  = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(io: SocketServer) {
  this.io = io

    this.io.on('connection', (socket: Socket) => {
      console.log(`[CallGateway] Socket connecté : ${socket.id}`);
      this.registerHandlers(socket);

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });

  }

  // ── Enregistrement des handlers par socket ────────────────────────────────

  private registerHandlers(socket: Socket): void {

    // ── Enregistrer l'utilisateur ──────────────────────────────────────────
    socket.on('user:register', (data: { userId: string; userType: 'doctor' | 'patient' }) => {
      this.userSockets.set(data.userId, socket.id);
      socket.data.userId   = data.userId;
      socket.data.userType = data.userType;
      console.log(`[CallGateway] Utilisateur enregistré : ${data.userId} (${data.userType})`);
    });

    // ── Initier un appel ───────────────────────────────────────────────────
    socket.on('call:initiate', async (data: {
      callerId:      string;
      callerType:    'doctor' | 'patient';
      receiverId:    string;
      appointmentId: string;
      callType:      'audio' | 'video';
    }) => {
      try {
        const callSession = await callService.initiateCall(data);

        // Confirmer au caller que l'appel est initié
        socket.emit('call:initiated', {
          callSessionId: String(callSession._id),
          channelName:   callSession.agora.channelName,
          token:         callSession.agora.callerToken,
          uid:           callSession.agora.callerUid,
          appId:         callSession.agora.appId,
        });

        // Notifier le receiver via socket (s'il est connecté)
        const receiverSocketId = this.userSockets.get(data.receiverId);
        if (receiverSocketId) {
          this.io.to(receiverSocketId).emit('call:incoming', {
            callSessionId: String(callSession._id),
            callerId:      data.callerId,
            callerType:    data.callerType,
            callType:      data.callType,
            channelName:   callSession.agora.channelName,
            token:         callSession.agora.receiverToken,
            uid:           callSession.agora.receiverUid,
            appId:         callSession.agora.appId,
          });

          // Marquer comme "en train de sonner"
          await callService.markAsRinging(String(callSession._id));

          // Démarrer le timer de sonnerie → manqué si pas de réponse
          this.startRingTimer(String(callSession._id), socket);

        } else {
          // Le receiver n'est pas connecté en temps réel
          // La notification push (déjà envoyée dans callService.initiateCall) prend le relais
          console.log(`[CallGateway] Receiver ${data.receiverId} non connecté — notif push envoyée.`);
        }

      } catch (err: any) {
        socket.emit('call:failed', { message: err.message });
      }
    });

    // ── Accepter un appel ──────────────────────────────────────────────────
    socket.on('call:accept', async (data: { callSessionId: string; receiverId: string }) => {
      try {
        const callSession = await callService.acceptCall(data.callSessionId, data.receiverId);

        // Annuler le timer de sonnerie
        this.clearRingTimer(data.callSessionId);

        // Confirmer au receiver
        socket.emit('call:accepted', {
          callSessionId: data.callSessionId,
          channelName:   callSession.agora.channelName,
          token:         callSession.agora.receiverToken,
          uid:           callSession.agora.receiverUid,
          appId:         callSession.agora.appId,
        });

        // Notifier le caller que l'appel est accepté
        const callerSocketId = this.userSockets.get(String(callSession.callerId));
        if (callerSocketId) {
          this.io.to(callerSocketId).emit('call:accepted', {
            callSessionId: data.callSessionId,
          });
        }

      } catch (err: any) {
        socket.emit('call:failed', { message: err.message });
      }
    });

    // ── Refuser un appel ───────────────────────────────────────────────────
    socket.on('call:decline', async (data: {
      callSessionId: string;
      receiverId:    string;
      reason?:       string;
    }) => {
      try {
        const callSession = await callService.declineCall(
          data.callSessionId,
          data.receiverId,
          data.reason
        );

        // Annuler le timer de sonnerie
        this.clearRingTimer(data.callSessionId);

        // Notifier le caller du refus
        const callerSocketId = this.userSockets.get(String(callSession.callerId));
        if (callerSocketId) {
          this.io.to(callerSocketId).emit('call:declined', {
            callSessionId: data.callSessionId,
            reason:        data.reason,
          });
        }

        socket.emit('call:declined', { callSessionId: data.callSessionId });

      } catch (err: any) {
        socket.emit('call:failed', { message: err.message });
      }
    });

    // ── Terminer un appel ──────────────────────────────────────────────────
    socket.on('call:end', async (data: {
      callSessionId: string;
      requesterId:   string;
      endedBy:       'caller' | 'receiver';
    }) => {
      try {
        const callSession = await callService.endCall(
          data.callSessionId,
          data.requesterId,
          data.endedBy
        );

        // Annuler le timer de sonnerie si encore actif
        this.clearRingTimer(data.callSessionId);

        const endPayload = {
          callSessionId: data.callSessionId,
          duration:      callSession.timing.duration ?? 0,
          endedBy:       data.endedBy,
        };

        // Notifier les deux participants
        const callerSocketId   = this.userSockets.get(String(callSession.callerId));
        const receiverSocketId = this.userSockets.get(String(callSession.receiverId));

        if (callerSocketId)   this.io.to(callerSocketId).emit('call:ended', endPayload);
        if (receiverSocketId) this.io.to(receiverSocketId).emit('call:ended', endPayload);

      } catch (err: any) {
        socket.emit('call:failed', { message: err.message });
      }
    });

    // ── Relayer les candidats ICE WebRTC ───────────────────────────────────
    // Nécessaire si Agora SDK web ne gère pas tout en interne
    socket.on('call:ice-candidate', (data: {
      targetUserId: string;
      candidate:    RTCIceCandidate;
    }) => {
      const targetSocketId = this.userSockets.get(data.targetUserId);
      if (targetSocketId) {
        this.io.to(targetSocketId).emit('call:ice-candidate', {
          candidate: data.candidate,
        });
      }
    });

    // ── Rafraîchir les tokens Agora ────────────────────────────────────────
    socket.on('call:token-refresh', async (data: { callSessionId: string }) => {
      try {
        const tokens = await callService.refreshTokens(data.callSessionId);
        socket.emit('call:tokens', tokens);
      } catch (err: any) {
        socket.emit('call:failed', { message: err.message });
      }
    });
  }

  // ── Timer de sonnerie → marquer comme manqué après 45s ───────────────────

  private startRingTimer(callSessionId: string, callerSocket: Socket): void {
    const timer = setTimeout(async () => {
      try {
        const callSession = await callService.markAsMissed(callSessionId);

        // Notifier le caller de l'appel manqué
        callerSocket.emit('call:missed', {
          callSessionId,
          message: 'Pas de réponse.',
        });

        // Notifier le receiver via socket s'il est connecté
        const receiverSocketId = this.userSockets.get(String(callSession.receiverId));
        if (receiverSocketId) {
          this.io.to(receiverSocketId).emit('call:missed', { callSessionId });
        }

      } catch (err) {
        console.error('[CallGateway] Erreur markAsMissed :', err);
      }

      this.ringTimers.delete(callSessionId);
    }, RING_TIMEOUT_MS);

    this.ringTimers.set(callSessionId, timer);
  }

  private clearRingTimer(callSessionId: string): void {
    const timer = this.ringTimers.get(callSessionId);
    if (timer) {
      clearTimeout(timer);
      this.ringTimers.delete(callSessionId);
    }
  }

  // ── Gérer la déconnexion d'un socket ──────────────────────────────────────
  // Si un participant se déconnecte en plein appel → terminer l'appel

  private async handleDisconnect(socket: Socket): Promise<void> {
    const userId = socket.data.userId as string | undefined;

    if (userId) {
      this.userSockets.delete(userId);
      console.log(`[CallGateway] Utilisateur déconnecté : ${userId}`);

      // Chercher un appel actif pour cet utilisateur
      try {
        const { calls } = await callService.getHistory(userId, { limit: 1 });
        const activeCall = calls.find((c: any) =>
          ['initiated', 'ringing', 'accepted'].includes(c.status)
        );

        if (activeCall) {
          const callSessionId = String(activeCall._id);
          this.clearRingTimer(callSessionId);

          await callService.endCall(callSessionId, userId, 'system' as any);

          // Notifier l'autre participant
          const otherId = String(activeCall.callerId) === userId
            ? String(activeCall.receiverId)
            : String(activeCall.callerId);

          const otherSocketId = this.userSockets.get(otherId);
          if (otherSocketId) {
            this.io.to(otherSocketId).emit('call:ended', {
              callSessionId,
              duration: activeCall.timing.duration ?? 0,
              endedBy:  'system',
              reason:   'L\'autre participant s\'est déconnecté.',
            });
          }
        }
      } catch (err) {
        console.error('[CallGateway] Erreur handleDisconnect :', err);
      }
    }
  }

  // ── Getter de l'instance io (utile pour d'autres gateways) ───────────────

  public getIO(): SocketServer {
    return this.io;
  }
}