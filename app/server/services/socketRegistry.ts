import { Server as SocketServer } from 'socket.io';

// ─── Registre partagé userId ↔ socketId ───────────────────────────────────
// Utilisé par les gateways (Call, Chat) ET par les services (hors contexte
// socket) pour pouvoir émettre vers un utilisateur précis.

let ioInstance: SocketServer | null = null;
const userSockets = new Map<string, string>();

export function setIO(io: SocketServer): void {
  ioInstance = io;
}

export function registerUser(userId: string, socketId: string): void {
  userSockets.set(userId, socketId);
}

export function unregisterUser(userId: string): void {
  userSockets.delete(userId);
}

export function getSocketId(userId: string): string | undefined {
  return userSockets.get(userId);
}

// ── Liste des userId actuellement connectés en temps réel ────────────────
// Utile pour synchroniser l'état "en ligne" d'un client qui vient tout juste
// de se connecter, sans attendre qu'un event 'user:online' arrive plus tard.
export function getOnlineUserIds(): string[] {
  return Array.from(userSockets.keys());
}

export function emitToUser(userId: string, event: string, payload: any): boolean {
  if (!ioInstance) {
    console.warn('[socketRegistry] io non initialisé — emit ignoré.');
    return false;
  }
  const socketId = userSockets.get(userId);
  if (!socketId) return false; // utilisateur non connecté en temps réel

  ioInstance.to(socketId).emit(event, payload);
  return true;
}