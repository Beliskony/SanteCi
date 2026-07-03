import { Server as SocketServer, Socket } from 'socket.io';
import { registerUser, unregisterUser } from './socketRegistry';

// ─── Chat Gateway ─────────────────────────────────────────────────────────
// Rôle volontairement minimal : tenir le registre userId ↔ socketId à jour.
// L'émission des messages en temps réel se fait depuis chatMessage.service.ts
// via socketRegistry.emitToUser(), pas ici — le flux d'envoi reste en REST.

export class ChatGateway {
  constructor(io: SocketServer) {
    io.on('connection', (socket: Socket) => {
      socket.on('user:register', (data: { userId: string; userType: 'doctor' | 'patient' }) => {
        registerUser(data.userId, socket.id);
        socket.data.userId = data.userId;
        console.log(`[ChatGateway] Utilisateur enregistré : ${data.userId}`);
      });

      socket.on('disconnect', () => {
        const userId = socket.data.userId as string | undefined;
        if (userId) {
          unregisterUser(userId);
          console.log(`[ChatGateway] Utilisateur déconnecté : ${userId}`);
        }
      });
    });
  }
}