// ============================================================
// services/callService.ts — Appels vidéo / audio
// Aligné sur Call.service backend + CallGateway (Socket.IO)
// Routes : /api/calls/* et /api/appointments/[id]/calls
// ============================================================

import * as api from "@/app/frontend/lib/apiClient";
import type { ApiResponse } from "@/app/frontend/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CallType    = "audio" | "video";
export type CallerType  = "doctor" | "patient";
export type CallStatus  =
  | "initiated" | "ringing" | "accepted"
  | "ended"     | "declined" | "missed" | "failed";

export interface AgoraTokens {
  channelName:  string;
  callerToken:  string;
  receiverToken:string;
  callerUid:    number;
  receiverUid:  number;
  appId:        string;
}

export interface CallTiming {
  initiatedAt:  string;
  ringingAt?:   string;
  acceptedAt?:  string;
  endedAt?:     string;
  duration?:    number; // secondes
}

export interface CallSession {
  _id:           string;
  callerId:      string;
  callerType:    CallerType;
  receiverId:    string;
  receiverType:  CallerType;
  appointmentId: string;
  chatRoomId?:   string;
  callType:      CallType;
  status:        CallStatus;
  agora:         AgoraTokens;
  timing:        CallTiming;
  declineReason?: string;
  failureReason?: string;
  endedBy?:      "caller" | "receiver" | "system";
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}

// Payload reçu par le caller après call:initiate via socket
export interface InitiatedCallPayload {
  callSessionId: string;
  channelName:   string;
  token:         string;
  uid:           number;
  appId:         string;
}

// Payload reçu par le receiver via call:incoming
export interface IncomingCallPayload {
  callSessionId: string;
  callerId:      string;
  callerType:    CallerType;
  callType:      CallType;
  channelName:   string;
  token:         string;
  uid:           number;
  appId:         string;
}

export interface PaginatedCalls {
  calls:  CallSession[];
  total:  number;
  page:   number;
  pages:  number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const callService = {

  // ── Récupérer une session par ID ──────────────────────────────────────────
  // GET /api/calls/[id]

  async getById(callSessionId: string): Promise<CallSession> {
    const res = await api.get<ApiResponse<CallSession>>(
      `/calls/${callSessionId}`
    );
    return res.data;
  },

  // ── Accepter un appel entrant ─────────────────────────────────────────────
  // POST /api/calls/[id]/accept
  // Utiliser en complément de l'event socket call:accept
  // (pour les cas où le socket n'est pas dispo — ex: push notification)

  async accept(callSessionId: string): Promise<CallSession> {
    const res = await api.post<ApiResponse<CallSession>>(
      `/calls/${callSessionId}/accept`,
      {}
    );
    return res.data;
  },

  // ── Refuser un appel ──────────────────────────────────────────────────────
  // POST /api/calls/[id]/decline

  async decline(callSessionId: string, reason?: string): Promise<CallSession> {
    const res = await api.post<ApiResponse<CallSession>>(
      `/calls/${callSessionId}/decline`,
      { reason }
    );
    return res.data;
  },

  // ── Terminer un appel ─────────────────────────────────────────────────────
  // POST /api/calls/[id]/end

  async end(
    callSessionId: string,
    endedBy: "caller" | "receiver"
  ): Promise<CallSession> {
    const res = await api.post<ApiResponse<CallSession>>(
      `/calls/${callSessionId}/end`,
      { endedBy }
    );
    return res.data;
  },

  // ── Rafraîchir les tokens Agora ───────────────────────────────────────────
  // POST /api/calls/[id]/refresh-token
  // À appeler ~10 min avant l'expiration (tokens valides 1h)

  async refreshToken(callSessionId: string): Promise<{
    callerToken:  string;
    receiverToken: string;
  }> {
    const res = await api.post<ApiResponse<{
      callerToken:  string;
      receiverToken: string;
    }>>(
      `/calls/${callSessionId}/refresh-token`,
      {}
    );
    return res.data;
  },

  // ── Historique des appels ─────────────────────────────────────────────────
  // GET /api/calls?page=1&limit=20

  async getHistory(params?: {
    page?:  number;
    limit?: number;
  }): Promise<PaginatedCalls> {
    const qs = new URLSearchParams();
    if (params?.page)  qs.append("page",  String(params.page));
    if (params?.limit) qs.append("limit", String(params.limit));

    const query = qs.toString();
    // Backend retourne { success, calls, total, page, pages } sans enveloppe data
    const res = await api.get<PaginatedCalls & { success: boolean }>(
      `/calls${query ? `?${query}` : ""}`
    );
    return {
      calls: res.calls  ?? [],
      total: res.total  ?? 0,
      page:  res.page   ?? 1,
      pages: res.pages  ?? 0,
    };
  },

  // ── Appels liés à un rendez-vous ──────────────────────────────────────────
  // GET /api/appointments/[id]/calls

  async getByAppointment(appointmentId: string): Promise<CallSession[]> {
    const res = await api.get<ApiResponse<CallSession[]>>(
      `/appointments/${appointmentId}/calls`
    );
    return res.data ?? [];
  },
};