import crypto from 'crypto';
import { Types } from 'mongoose';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { CallSession } from '../models/CallSession.model';
import { Appointment } from '../models/appointement.model';
import { Doctor } from '../models/medcin.model';
import { Patient } from '../models/patient.model';
import { ICallSession } from '../interfaces/callSession.interface';
import { notificationService } from './notification.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type CallType    = 'audio' | 'video';
type CallerType  = 'doctor' | 'patient';
type EndedBy     = 'caller' | 'receiver' | 'system';

interface InitiateCallDTO {
  callerId:      string;
  callerType:    CallerType;
  receiverId:    string;
  appointmentId: string;
  callType:      CallType;
}

// ─── Constantes Agora ─────────────────────────────────────────────────────────

const AGORA_APP_ID          = process.env.AGORA_APP_ID!;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;
const TOKEN_EXPIRY_SECONDS  = 3600; // 1 heure

// ─── Call Service ─────────────────────────────────────────────────────────────

class CallService {

  // ── Générer un token Agora RTC ────────────────────────────────────────────

  private generateAgoraToken(channelName: string, uid: number): string {
    const expirationTime = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
    return RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expirationTime
    );
  }

  // ── Résoudre le nom d'un participant ─────────────────────────────────────

  private async resolveName(userId: string, userType: CallerType): Promise<string> {
    if (userType === 'doctor') {
      const doctor = await Doctor.findById(userId)
        .select('profile.title profile.firstName profile.lastName')
        .lean();
      return doctor
        ? `${doctor.profile.title} ${doctor.profile.firstName} ${doctor.profile.lastName}`
        : 'Votre médecin';
    }

    const patient = await Patient.findById(userId)
      .select('profile.firstName profile.lastName')
      .lean();
    return patient
      ? `${patient.profile.firstName} ${patient.profile.lastName}`
      : 'Un patient';
  }

  // ── Initier un appel ──────────────────────────────────────────────────────
  // Crée la session, génère les tokens Agora, notifie le destinataire

  async initiateCall(dto: InitiateCallDTO): Promise<ICallSession> {
    // Vérifier que le RDV existe et est confirmé ou en cours
    const appointment = await Appointment.findById(dto.appointmentId)
      .select('communication.chatRoomId status.current patientId doctorId details.type');
    if (!appointment) throw new Error('Rendez-vous introuvable.');

    const allowedStatuses = ['confirmed', 'ongoing'];
    if (!allowedStatuses.includes(appointment.status.current)) {
      throw new Error('Les appels ne sont autorisés que pour les rendez-vous confirmés ou en cours.');
    }

    // Vérifier qu'il n'y a pas déjà un appel actif sur ce RDV
    const activeCall = await CallSession.findOne({
      appointmentId: new Types.ObjectId(dto.appointmentId),
      status: { $in: ['initiated', 'ringing', 'accepted'] },
    });
    if (activeCall) throw new Error('Un appel est déjà en cours pour ce rendez-vous.');

    // Déterminer le type du receiver (opposé du caller)
    const receiverType: CallerType = dto.callerType === 'doctor' ? 'patient' : 'doctor';

    // Générer les identifiants Agora
    const channelName   = `CALL-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const callerUid     = Math.floor(Math.random() * 100000) + 1;
    const receiverUid   = Math.floor(Math.random() * 100000) + 100001;
    const callerToken   = this.generateAgoraToken(channelName, callerUid);
    const receiverToken = this.generateAgoraToken(channelName, receiverUid);

    // Créer la session en base
    const callSession = await CallSession.create({
      callerId:      new Types.ObjectId(dto.callerId),
      callerType:    dto.callerType,
      receiverId:    new Types.ObjectId(dto.receiverId),
      receiverType,
      appointmentId: new Types.ObjectId(dto.appointmentId),
      chatRoomId:    appointment.communication.chatRoomId,
      callType:      dto.callType,
      status:        'initiated',
      agora: {
        channelName,
        callerToken,
        receiverToken,
        callerUid,
        receiverUid,
        appId: AGORA_APP_ID,
      },
      timing: {
        initiatedAt: new Date(),
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // ── Notifier le destinataire de l'appel entrant ───────────────────────
    try {
      const callerName = await this.resolveName(dto.callerId, dto.callerType);
      const callLabel  = dto.callType === 'video' ? '📹 Appel vidéo' : '📞 Appel audio';

      await notificationService.notifySystem(
        dto.receiverId,
        receiverType,
        `${callLabel} entrant`,
        `${callerName} vous appelle. Décrochez dès que possible.`,
        'high'
      );
    } catch (err) {
      console.error('[CallService.initiateCall] Notification échec :', err);
    }

    return callSession;
  }

  // ── Accepter un appel ─────────────────────────────────────────────────────
  // Retourne les tokens pour que le receiver rejoigne le channel Agora

  async acceptCall(callSessionId: string, receiverId: string): Promise<ICallSession> {
    const callSession = await CallSession.findById(callSessionId);
    if (!callSession) throw new Error('Session d\'appel introuvable.');

    if (String(callSession.receiverId) !== receiverId) {
      throw new Error('Action non autorisée.');
    }

    if (callSession.status !== 'ringing' && callSession.status !== 'initiated') {
      throw new Error(`Impossible d'accepter un appel en statut "${callSession.status}".`);
    }

    callSession.status           = 'accepted';
    callSession.timing.acceptedAt = new Date();
    callSession.metadata.updatedAt = new Date();
    await callSession.save();

    return callSession;
  }

  // ── Refuser un appel ──────────────────────────────────────────────────────

  async declineCall(
    callSessionId: string,
    receiverId: string,
    reason?: string
  ): Promise<ICallSession> {
    const callSession = await CallSession.findById(callSessionId);
    if (!callSession) throw new Error('Session d\'appel introuvable.');

    if (String(callSession.receiverId) !== receiverId) {
      throw new Error('Action non autorisée.');
    }

    if (!['initiated', 'ringing'].includes(callSession.status)) {
      throw new Error(`Impossible de refuser un appel en statut "${callSession.status}".`);
    }

    callSession.status           = 'declined';
    callSession.declineReason    = reason;
    callSession.timing.endedAt   = new Date();
    callSession.endedBy          = 'receiver';
    callSession.metadata.updatedAt = new Date();
    await callSession.save();

    // ── Notifier le caller que l'appel a été refusé ───────────────────────
    try {
      const receiverName = await this.resolveName(
        String(callSession.receiverId),
        callSession.receiverType
      );
      await notificationService.notifySystem(
        String(callSession.callerId),
        callSession.callerType,
        'Appel refusé',
        `${receiverName} n'est pas disponible pour le moment.`,
        'normal' as any
      );
    } catch (err) {
      console.error('[CallService.declineCall] Notification échec :', err);
    }

    return callSession;
  }

  // ── Terminer un appel ─────────────────────────────────────────────────────

  async endCall(
    callSessionId: string,
    requesterId: string,
    endedBy: EndedBy = 'caller'
  ): Promise<ICallSession> {
    const callSession = await CallSession.findById(callSessionId);
    if (!callSession) throw new Error('Session d\'appel introuvable.');

    const isParticipant =
      String(callSession.callerId) === requesterId ||
      String(callSession.receiverId) === requesterId;

    if (!isParticipant && endedBy !== 'system') {
      throw new Error('Action non autorisée.');
    }

    if (!['initiated', 'ringing', 'accepted'].includes(callSession.status)) {
      throw new Error(`Impossible de terminer un appel en statut "${callSession.status}".`);
    }

    const endedAt = new Date();
    let duration  = 0;

    if (callSession.timing.acceptedAt) {
      duration = Math.round(
        (endedAt.getTime() - callSession.timing.acceptedAt.getTime()) / 1000
      );
    }

    callSession.status           = 'ended';
    callSession.endedBy          = endedBy;
    callSession.timing.endedAt   = endedAt;
    callSession.timing.duration  = duration;
    callSession.metadata.updatedAt = new Date();
    await callSession.save();

    return callSession;
  }

  // ── Marquer comme manqué (appelé par le cron ou le gateway) ──────────────
  // Si le receiver ne répond pas après X secondes

  async markAsMissed(callSessionId: string): Promise<ICallSession> {
    const callSession = await CallSession.findById(callSessionId);
    if (!callSession) throw new Error('Session d\'appel introuvable.');

    if (!['initiated', 'ringing'].includes(callSession.status)) {
      throw new Error(`Impossible de marquer comme manqué un appel en statut "${callSession.status}".`);
    }

    callSession.status            = 'missed';
    callSession.timing.endedAt    = new Date();
    callSession.endedBy           = 'system';
    callSession.metadata.updatedAt = new Date();
    await callSession.save();

    // ── Notifier le receiver qu'il a manqué un appel ─────────────────────
    try {
      const callerName = await this.resolveName(
        String(callSession.callerId),
        callSession.callerType
      );
      const callLabel = callSession.callType === 'video' ? 'vidéo' : 'audio';

      await notificationService.notifySystem(
        String(callSession.receiverId),
        callSession.receiverType,
        'Appel manqué',
        `Vous avez manqué un appel ${callLabel} de ${callerName}.`,
        'normal' as any
      );
    } catch (err) {
      console.error('[CallService.markAsMissed] Notification échec :', err);
    }

    return callSession;
  }

  // ── Marquer comme échoué (erreur réseau, Agora, etc.) ────────────────────

  async markAsFailed(callSessionId: string, reason: string): Promise<ICallSession> {
    const callSession = await CallSession.findByIdAndUpdate(
      callSessionId,
      {
        $set: {
          status:             'failed',
          failureReason:      reason,
          endedBy:            'system',
          'timing.endedAt':   new Date(),
          'metadata.updatedAt': new Date(),
        },
      },
      { new: true }
    );

    if (!callSession) throw new Error('Session d\'appel introuvable.');
    return callSession;
  }

  // ── Mettre à jour le statut "ringing" ────────────────────────────────────
  // Appelé par le gateway quand le receiver a bien reçu la notif socket

  async markAsRinging(callSessionId: string): Promise<ICallSession> {
    const callSession = await CallSession.findByIdAndUpdate(
      callSessionId,
      {
        $set: {
          status:              'ringing',
          'timing.ringingAt':  new Date(),
          'metadata.updatedAt': new Date(),
        },
      },
      { new: true }
    );

    if (!callSession) throw new Error('Session d\'appel introuvable.');
    return callSession;
  }

  // ── Rafraîchir les tokens Agora (si proches d'expiration) ────────────────

  async refreshTokens(callSessionId: string): Promise<{
    callerToken: string;
    receiverToken: string;
  }> {
    const callSession = await CallSession.findById(callSessionId);
    if (!callSession) throw new Error('Session d\'appel introuvable.');

    if (callSession.status !== 'accepted') {
      throw new Error('Impossible de rafraîchir les tokens d\'un appel non actif.');
    }

    const { channelName, callerUid, receiverUid } = callSession.agora;
    const callerToken   = this.generateAgoraToken(channelName, callerUid);
    const receiverToken = this.generateAgoraToken(channelName, receiverUid);

    callSession.agora.callerToken   = callerToken;
    callSession.agora.receiverToken = receiverToken;
    callSession.metadata.updatedAt  = new Date();
    await callSession.save();

    return { callerToken, receiverToken };
  }

  // ── Récupérer une session par ID ──────────────────────────────────────────

  async getById(callSessionId: string): Promise<ICallSession> {
    const callSession = await CallSession.findById(callSessionId);
    if (!callSession) throw new Error('Session d\'appel introuvable.');
    return callSession;
  }

  // ── Historique des appels d'un utilisateur ────────────────────────────────

  async getHistory(
    userId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{
    calls: ICallSession[];
    total: number;
    page: number;
    pages: number;
  }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { callerId:   new Types.ObjectId(userId) },
        { receiverId: new Types.ObjectId(userId) },
      ],
    };

    const total = await CallSession.countDocuments(query);
    const calls = await CallSession.find(query)
      .sort({ 'timing.initiatedAt': -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return { calls, total, page, pages: Math.ceil(total / limit) };
  }

  // ── Récupérer les appels d'un RDV ─────────────────────────────────────────

  async getByAppointment(appointmentId: string): Promise<ICallSession[]> {
    return CallSession.find({
      appointmentId: new Types.ObjectId(appointmentId),
    })
      .sort({ 'timing.initiatedAt': -1 })
      .lean();
  }
}

export const callService = new CallService();