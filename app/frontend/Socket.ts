// ============================================================
// pages/api/socket.ts — Point de montage Socket.IO
// Pages Router uniquement — accessible depuis l'App Router
// À appeler une fois au démarrage : fetch('/api/socket')
// ============================================================

import type { NextApiRequest, NextApiResponse } from "next";
import { Server as SocketServer }               from "socket.io";
import type { Server as HttpServer }            from "http";
import type { Socket as NetSocket }             from "net";
import { CallGateway } from "@/app/server/services/Call.gateway";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocketServer2 extends HttpServer {
  io?: SocketServer;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer2;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  // Guard : n'initialise qu'une seule fois
  if (res.socket.server.io) {
    console.log("[Socket] Déjà initialisé");
    res.end();
    return;
  }

  console.log("[Socket] Initialisation Socket.IO...");

  const io = new SocketServer(res.socket.server, {
    path:       "/api/socket_io", // path custom pour éviter les conflits Next.js
    addTrailingSlash: false,
    cors: {
      origin:      process.env.NEXT_PUBLIC_APP_URL ?? "*",
      methods:     ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // ── Monter les gateways ───────────────────────────────────
  // CallGateway gère les appels audio/vidéo
  new CallGateway(res.socket.server as any);

  // Stocker l'instance pour le guard
  res.socket.server.io = io;

  console.log("[Socket] ✅ Socket.IO initialisé");
  res.end();
}

// Désactiver le body parser — inutile pour les WebSockets
export const config = {
  api: { bodyParser: false },
};