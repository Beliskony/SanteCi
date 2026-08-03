import { Server as SocketServer, Socket } from 'socket.io';
import { registerUser, unregisterUser, getOnlineUserIds } from './socketRegistry';

// ─── Chat Gateway ─────────────────────────────────────────────────────────
// Rôle : tenir le registre userId ↔ socketId à jour, ET diffuser la présence
// en ligne/hors ligne en temps réel (user:online / user:offline).
// L'émission des MESSAGES en temps réel se fait depuis chatMessage.service.ts
// via socketRegistry.emitToUser(), pas ici — le flux d'envoi reste en REST.

export class ChatGateway {
  constructor(io: SocketServer) {
    io.on('connection', (socket: Socket) => {
      socket.on('user:register', (data: { userId: string; userType: 'doctor' | 'patient' }) => {
        registerUser(data.userId, socket.id);
        socket.data.userId = data.userId;
        console.log(`[ChatGateway] Utilisateur enregistré : ${data.userId}`);

        // ── Synchroniser l'état initial pour CE client qui vient de se connecter ──
        // Sans ça, son interlocuteur peut être déjà en ligne depuis longtemps,
        // mais ce client ne le saura jamais (aucun event ne lui a été envoyé).
        const alreadyOnline = getOnlineUserIds().filter((id) => id !== data.userId);
        alreadyOnline.forEach((onlineUserId) => {
          socket.emit('user:online', { userId: onlineUserId });
        });

        // ── Prévenir tous les AUTRES clients que CET utilisateur est en ligne ──
        socket.broadcast.emit('user:online', { userId: data.userId });
      });

      socket.on('disconnect', () => {
        const userId = socket.data.userId as string | undefined;
        if (userId) {
          unregisterUser(userId);
          console.log(`[ChatGateway] Utilisateur déconnecté : ${userId}`);

          // Prévenir les autres clients que cet utilisateur vient de partir
          socket.broadcast.emit('user:offline', { userId });
        }
      });
    });
  }
}