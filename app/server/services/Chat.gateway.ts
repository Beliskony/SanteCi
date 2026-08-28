// app/server/services/Chat.gateway.ts
import { Server as SocketServer, Socket } from 'socket.io';
import { registerUser, unregisterUser, getOnlineUserIds, emitToUser } from './socketRegistry';
import { Doctor } from '../models/medcin.model';
import { Patient } from '../models/patient.model';

export class ChatGateway {
  constructor(io: SocketServer) {
    io.on('connection', (socket: Socket) => {
      // ── Enregistrement utilisateur ──────────────────────────────────────
      socket.on('user:register', async (data: { userId: string; userType: 'doctor' | 'patient' }) => {
        registerUser(data.userId, socket.id);
        socket.data.userId = data.userId;
        socket.data.userType = data.userType;
        console.log(`[ChatGateway] Utilisateur enregistré : ${data.userId}`);

        // METTRE À JOUR isOnline DANS LA BASE DE DONNÉES
        try {
          if (data.userType === 'doctor') {
            await Doctor.findByIdAndUpdate(data.userId, {
              $set: { 'status.isOnline': true, 'status.lastActive': new Date() }
            });
            console.log(`[ChatGateway]  Médecin ${data.userId} marqué en ligne`);
          } else {
            await Patient.findByIdAndUpdate(data.userId, {
              $set: { 'status.isOnline': true }
            });
            console.log(`[ChatGateway]  Patient ${data.userId} marqué en ligne`);
          }
        } catch (err) {
          console.error('[ChatGateway] Erreur mise à jour isOnline:', err);
        }

        // Synchroniser l'état initial
        const alreadyOnline = getOnlineUserIds().filter((id) => id !== data.userId);
        alreadyOnline.forEach((onlineUserId) => {
          socket.emit('user:online', { userId: onlineUserId });
        });

        // Prévenir les autres clients
        socket.broadcast.emit('user:online', { userId: data.userId });
      });

      // ── Rejoindre une room de chat ──────────────────────────────────────
      socket.on('joinRoom', ({ roomId }) => {
        socket.join(roomId);
        console.log(`[ChatGateway] Socket ${socket.id} a rejoint la room ${roomId}`);
      });

      // ── Quitter une room ──────────────────────────────────────────────────
      socket.on('leaveRoom', ({ roomId }) => {
        socket.leave(roomId);
        console.log(`[ChatGateway] Socket ${socket.id} a quitté la room ${roomId}`);
      });

      // ── ENVOI DE MESSAGE EN TEMPS RÉEL ──────────────────────────────
      socket.on('sendMessage', async (data: {
        roomId: string;
        senderId: string;
        receiverId: string;
        content: string;
        messageType: string;
        appointmentId?: string;
        timestamp: string;
        _id: string;
      }) => {
        console.log(`[ChatGateway] 📩 sendMessage reçu:`, data);

        // 1. Diffuser à la room (pour tous les participants)
        io.to(data.roomId).emit('new_message', {
          _id: data._id,
          chatRoomId: data.roomId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          content: data.content,
          messageType: data.messageType || 'text',
          file: null,
          status: { delivered: true, read: false },
          metadata: {
            createdAt: data.timestamp || new Date().toISOString(),
            updatedAt: data.timestamp || new Date().toISOString(),
          },
        });

        // 2. Émettre directement au destinataire (s'il est connecté)
        if (data.receiverId) {
          emitToUser(data.receiverId, 'new_message', {
            _id: data._id,
            chatRoomId: data.roomId,
            senderId: data.senderId,
            receiverId: data.receiverId,
            content: data.content,
            messageType: data.messageType || 'text',
            file: null,
            status: { delivered: true, read: false },
            metadata: {
              createdAt: data.timestamp || new Date().toISOString(),
              updatedAt: data.timestamp || new Date().toISOString(),
            },
          });
        }

        // 3. Confirmer à l'expéditeur que le message est bien reçu
        socket.emit('message:delivered', {
          messageId: data._id,
          chatRoomId: data.roomId,
        });
      });

      // ── Marquer un message comme lu ──────────────────────────────────────
      socket.on('message:read', (data: { messageId: string; chatRoomId: string }) => {
        // Notifier l'expéditeur que son message a été lu
        io.to(data.chatRoomId).emit('message:read', {
          messageId: data.messageId,
          chatRoomId: data.chatRoomId,
        });
      });

      // ── Déconnexion ──────────────────────────────────────────────────────
      socket.on('disconnect', () => {
        const userId = socket.data.userId as string | undefined;
        if (userId) {
          unregisterUser(userId);
          console.log(`[ChatGateway] Utilisateur déconnecté : ${userId}`);
          socket.broadcast.emit('user:offline', { userId });
        }
      });
    });
  }
}