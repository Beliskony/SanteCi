// ============================================================
// store/useCallStore.ts — État des appels vidéo / audio
// ============================================================

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { callService } from "@/app/frontend/services/call.service";
import type {
  CallSession,
  CallType,
  CallerType,
  IncomingCallPayload,
  InitiatedCallPayload,
  AgoraTokens,
} from "@/app/frontend/services/call.service";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CallPhase =
  | "idle"
  | "calling"
  | "ringing"
  | "connecting"
  | "ongoing"
  | "ended"
  | "missed"
  | "declined"
  | "failed";

interface StartCallParams {
  callerId:      string;
  callerType:    CallerType;
  receiverId:    string;
  appointmentId: string;
  callType:      CallType;
}

interface CallEndedPayload {
  callSessionId: string;
  duration:      number;
  endedBy:       string;
}

interface CallDeclinedPayload {
  callSessionId: string;
  reason?:       string;
}

interface CallMissedPayload {
  callSessionId: string;
}

interface CallFailedPayload {
  message: string;
}

interface TokensRefreshedPayload {
  callerToken:   string;
  receiverToken: string;
}

interface CallState {
  // ── Phase & session ───────────────────────────────────────
  phase:           CallPhase;
  session:         CallSession | null;
  incomingPayload: IncomingCallPayload | null;

  // ── Tokens Agora ──────────────────────────────────────────
  agoraTokens:     AgoraTokens | null;
  myUid:           number | null;

  // ── Timers ────────────────────────────────────────────────
  tokenRefreshTimer: ReturnType<typeof setTimeout>  | null;
  durationTimer:     ReturnType<typeof setInterval> | null;

  // ── Durée ─────────────────────────────────────────────────
  elapsedSeconds: number;

  // ── Contrôles UI ──────────────────────────────────────────
  isMuted:     boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  error:       string | null;

  // ── Historique ────────────────────────────────────────────
  history:        CallSession[];
  historyLoading: boolean;
  historyTotal:   number;

  // ── Actions flux d'appel ──────────────────────────────────
  startCall:          (params: StartCallParams)          => void;
  onCallInitiated:    (payload: InitiatedCallPayload)    => void;
  onIncomingCall:     (payload: IncomingCallPayload)     => void;
  acceptCall:         ()                                 => Promise<void>;
  declineCall:        (reason?: string)                  => Promise<void>;
  onCallAccepted:     (payload?: { callSessionId: string }) => void;
  onCallDeclined:     (payload: CallDeclinedPayload)     => void;
  endCall:            ()                                 => Promise<void>;
  onCallEnded:        (payload: CallEndedPayload)        => void;
  onCallMissed:       (payload: CallMissedPayload)       => void;
  onCallFailed:       (payload: CallFailedPayload)       => void;
  onTokensRefreshed:  (payload: TokensRefreshedPayload)  => void;

  // ── Contrôles pendant l'appel ─────────────────────────────
  toggleMute:    () => void;
  toggleCamera:  () => void;
  toggleSpeaker: () => void;

  // ── Historique ────────────────────────────────────────────
  fetchHistory:       (page?: number)          => Promise<void>;
  fetchByAppointment: (appointmentId: string)  => Promise<CallSession[]>;

  // ── Utilitaires ───────────────────────────────────────────
  clearError:  () => void;
  resetToIdle: () => void;

  // ── Privé (dans l'interface pour que get() y accède) ──────
  _startDurationTimer:   ()                     => void;
  _clearTimers:          ()                     => void;
  _scheduleTokenRefresh: (callSessionId: string) => void;
}

// ─── État idle réutilisable ───────────────────────────────────────────────────

const IDLE_STATE = {
  phase:           "idle"  as CallPhase,
  session:         null,
  incomingPayload: null,
  agoraTokens:     null,
  myUid:           null,
  isMuted:         false,
  isCameraOff:     false,
  isSpeakerOn:     true,
  elapsedSeconds:  0,
  error:           null,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Une erreur inattendue s'est produite.";
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCallStore = create<CallState>()(
  devtools(
    (set, get) => ({
      ...IDLE_STATE,
      tokenRefreshTimer: null,
      durationTimer:     null,
      history:           [],
      historyLoading:    false,
      historyTotal:      0,

      // ── startCall ─────────────────────────────────────────────────────────
      // Met à jour la phase — l'émission socket se fait dans le composant
      startCall: (_params: StartCallParams) => {
        set({ phase: "calling", error: null });
      },

      // ── onCallInitiated ───────────────────────────────────────────────────
      // Reçu par le CALLER via socket call:initiated
      onCallInitiated: (payload: InitiatedCallPayload) => {
        set({
          phase: "calling",
          agoraTokens: {
            channelName:   payload.channelName,
            callerToken:   payload.token,
            receiverToken: "",
            callerUid:     payload.uid,
            receiverUid:   0,
            appId:         payload.appId,
          },
          myUid: payload.uid,
          error: null,
        });
        get()._scheduleTokenRefresh(payload.callSessionId);
      },

      // ── onIncomingCall ────────────────────────────────────────────────────
      // Reçu par le RECEIVER via socket call:incoming
      onIncomingCall: (payload: IncomingCallPayload) => {
        set({
          phase:           "ringing",
          incomingPayload: payload,
          agoraTokens: {
            channelName:   payload.channelName,
            callerToken:   "",
            receiverToken: payload.token,
            callerUid:     0,
            receiverUid:   payload.uid,
            appId:         payload.appId,
          },
          myUid: payload.uid,
          error: null,
        });
      },

      // ── acceptCall ────────────────────────────────────────────────────────
      acceptCall: async () => {
        const { incomingPayload } = get();
        if (!incomingPayload) return;
        try {
          set({ phase: "connecting" });
          const session = await callService.accept(incomingPayload.callSessionId);
          set({ session });
        } catch (err) {
          set({ error: toMessage(err), phase: "failed" });
        }
      },

      // ── declineCall ───────────────────────────────────────────────────────
      declineCall: async (reason?: string) => {
        const { incomingPayload } = get();
        if (!incomingPayload) return;
        try {
          await callService.decline(incomingPayload.callSessionId, reason);
        } catch {
          // silencieux
        } finally {
          set({ ...IDLE_STATE });
        }
      },

      // ── onCallAccepted ────────────────────────────────────────────────────
      // Reçu par les DEUX via socket call:accepted
      onCallAccepted: (_payload?: { callSessionId: string }) => {
        set({ phase: "connecting" });
        setTimeout(() => {
          set({ phase: "ongoing" });
          get()._startDurationTimer();
        }, 1500);
      },

      // ── onCallDeclined ────────────────────────────────────────────────────
      onCallDeclined: (_payload: CallDeclinedPayload) => {
        get()._clearTimers();
        set({ ...IDLE_STATE, phase: "declined" });
        setTimeout(() => set({ phase: "idle" }), 3000);
      },

      // ── endCall ───────────────────────────────────────────────────────────
      endCall: async () => {
        const { session, phase } = get();
        get()._clearTimers();
        if (!session) { set({ ...IDLE_STATE }); return; }
        const endedBy = phase === "calling" ? "caller" : "receiver";
        try {
          await callService.end(session._id, endedBy);
        } catch {
          // silencieux
        } finally {
          set({ ...IDLE_STATE });
        }
      },

      // ── onCallEnded ───────────────────────────────────────────────────────
      onCallEnded: (payload: CallEndedPayload) => {
        get()._clearTimers();
        set({ ...IDLE_STATE, phase: "ended", elapsedSeconds: payload.duration });
        setTimeout(() => set({ phase: "idle", elapsedSeconds: 0 }), 4000);
      },

      // ── onCallMissed ──────────────────────────────────────────────────────
      onCallMissed: (_payload: CallMissedPayload) => {
        get()._clearTimers();
        set({ ...IDLE_STATE, phase: "missed" });
        setTimeout(() => set({ phase: "idle" }), 3000);
      },

      // ── onCallFailed ──────────────────────────────────────────────────────
      onCallFailed: (payload: CallFailedPayload) => {
        get()._clearTimers();
        set({ ...IDLE_STATE, phase: "failed", error: payload.message });
        setTimeout(() => set({ phase: "idle", error: null }), 4000);
      },

      // ── onTokensRefreshed ─────────────────────────────────────────────────
      onTokensRefreshed: (payload: TokensRefreshedPayload) => {
        const { agoraTokens } = get();
        if (!agoraTokens) return;
        set({
          agoraTokens: {
            ...agoraTokens,
            callerToken:   payload.callerToken,
            receiverToken: payload.receiverToken,
          },
        });
      },

      // ── Contrôles ─────────────────────────────────────────────────────────
      toggleMute:    () => set((s) => ({ isMuted:     !s.isMuted     })),
      toggleCamera:  () => set((s) => ({ isCameraOff: !s.isCameraOff })),
      toggleSpeaker: () => set((s) => ({ isSpeakerOn: !s.isSpeakerOn })),

      // ── Historique ────────────────────────────────────────────────────────
      fetchHistory: async (page = 1) => {
        set({ historyLoading: true });
        try {
          const res = await callService.getHistory({ page, limit: 20 });
          set((s) => ({
            history:      page === 1 ? res.calls : [...s.history, ...res.calls],
            historyTotal: res.total,
          }));
        } catch (err) {
          set({ error: toMessage(err) });
        } finally {
          set({ historyLoading: false });
        }
      },

      fetchByAppointment: async (appointmentId: string) => {
        try {
          return await callService.getByAppointment(appointmentId);
        } catch {
          return [];
        }
      },

      // ── Utilitaires ───────────────────────────────────────────────────────
      clearError:  () => set({ error: null }),
      resetToIdle: () => { get()._clearTimers(); set({ ...IDLE_STATE }); },

      // ── Privé ─────────────────────────────────────────────────────────────

      _startDurationTimer: () => {
        const timer = setInterval(() => {
          set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 }));
        }, 1000);
        set({ durationTimer: timer });
      },

      _clearTimers: () => {
        const { durationTimer, tokenRefreshTimer } = get();
        if (durationTimer)     clearInterval(durationTimer);
        if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
        set({ durationTimer: null, tokenRefreshTimer: null, elapsedSeconds: 0 });
      },

      _scheduleTokenRefresh: (callSessionId: string) => {
        const timer = setTimeout(async () => {
          try {
            const tokens = await callService.refreshToken(callSessionId);
            get().onTokensRefreshed(tokens);
            get()._scheduleTokenRefresh(callSessionId);
          } catch {
            console.warn("[CallStore] Rafraîchissement token échoué");
          }
        }, 50 * 60 * 1000); // 50 minutes
        set({ tokenRefreshTimer: timer });
      },
    }),
    { name: "CallStore" }
  )
);

// ─── Sélecteurs ───────────────────────────────────────────────────────────────

export const selectIsInCall    = (s: CallState) => s.phase === "ongoing" || s.phase === "connecting";
export const selectIsRinging   = (s: CallState) => s.phase === "ringing";
export const selectIsCalling   = (s: CallState) => s.phase === "calling";
export const selectCallPhase   = (s: CallState) => s.phase;
export const selectAgoraTokens = (s: CallState) => s.agoraTokens;
export const selectElapsed     = (s: CallState) => s.elapsedSeconds;

export function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}