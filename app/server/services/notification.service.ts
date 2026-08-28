import { Types } from 'mongoose';
import { Notification } from '../models/notification.model';
import { INotification } from '../interfaces/notification.interface';
import type { TNotificationData } from '../schemas/notification.schema';
import { mailService } from '../services/mail.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType = INotification['type'];
type UserType         = INotification['userType'];
type Priority         = INotification['metadata']['priority'];

interface CreateNotificationDTO {
  userId:   string | Types.ObjectId;
  userType: UserType;
  type:     NotificationType;
  title:    string;
  body:     string;
  data?:    TNotificationData;
  channels?: Partial<INotification['channels']>;
  priority?: Priority;
  expiresAt?: Date;
  recipientEmail?: string; // email réel du destinataire, pour l'envoi mail
}

interface ListFilters {
  userType?: UserType;
  type?:     NotificationType;
  read?:     boolean;
  page?:     number;
  limit?:    number;
}

// ─── Notification Service ─────────────────────────────────────────────────────

class NotificationService {

  // ── Créer une notification ─────────────────────────────────────────────────

  async create(dto: CreateNotificationDTO): Promise<INotification> {
    const notification = await Notification.create({
      userId:   new Types.ObjectId(String(dto.userId)),
      userType: dto.userType,
      type:     dto.type,
      title:    dto.title,
      body:     dto.body,
      data:     dto.data ?? {},
      channels: {
        push:  dto.channels?.push  ?? true,
        email: dto.channels?.email ?? false,
        sms:   dto.channels?.sms   ?? false,
        inApp: dto.channels?.inApp ?? true,
      },
      statut: {
        sent:      false,
        delivered: false,
        read:      false,
      },
      metadata: {
        createdAt: new Date(),
        expiresAt: dto.expiresAt,
        priority:  dto.priority ?? 'normal',
      },
    });

   {/*  // ── Envoyer l'email si le canal email est activé ──────────────────────
    if (notification.channels.email && dto.recipientEmail) {
      try {
        await mailService.sendAppointmentConfirmation({
          to:      dto.recipientEmail,
          subject: dto.title,
          html:    `<p>${dto.body}</p>`,
        });
        await this.markAsSent(String(notification._id));
      } catch (err) {
        console.error('[NotificationService] Email échec :', err);
        // On ne bloque pas si l'email échoue
      }
    } */}

    return notification;
  }

  // ── Lire les préférences de notification du patient ───────────────────────

  private async resolveChannels(
    userId: string,
    userType: UserType
  ): Promise<Partial<INotification['channels']>> {
    // Les médecins n'ont pas de préférences de notification → défauts
    if (userType !== 'patient') return {};

    const { Patient } = await import('../models/patient.model');
    const patient = await Patient.findById(userId)
      .select('preferences.notifications')
      .lean();

    return {
      push:  patient?.preferences?.notifications?.push  ?? true,
      email: patient?.preferences?.notifications?.email ?? false,
      sms:   patient?.preferences?.notifications?.sms   ?? false,
      inApp: true, // toujours actif peu importe la préférence
    };
  }

  // ── Helpers de création rapide ─────────────────────────────────────────────
  // Utilisés par les autres services (appointmentService, etc.)

  async notifyAppointmentConfirmed(
    userId: string,
    userType: UserType,
    appointmentId: string,
    doctorName: string,
    scheduledFor: Date,
    recipientEmail?: string
  ): Promise<INotification> {
    const channels = await this.resolveChannels(userId, userType);
    return this.create({
      userId, userType,
      type: 'appointment',
      title: 'Rendez-vous confirmé',
      body: `Votre rendez-vous avec Dr ${doctorName} est confirmé pour le ${scheduledFor.toLocaleString('fr-FR')}.`,
      data: { appointmentId: new Types.ObjectId(appointmentId) as any },
      channels,
      priority: 'high',
      recipientEmail,
    });
  }

  async notifyAppointmentCancelled(
    userId: string,
    userType: UserType,
    appointmentId: string,
    reason?: string,
    recipientEmail?: string
  ): Promise<INotification> {
    const channels = await this.resolveChannels(userId, userType);
    return this.create({
      userId, userType,
      type: 'appointment',
      title: 'Rendez-vous annulé',
      body: reason ? `Votre rendez-vous a été annulé. Motif : ${reason}.` : 'Votre rendez-vous a été annulé.',
      data: { appointmentId: new Types.ObjectId(appointmentId) as any },
      channels,
      priority: 'high',
      recipientEmail,
    });
  }

  async notifyAppointmentReminder(
    userId: string,
    userType: UserType,
    appointmentId: string,
    minutesBefore: number,
    scheduledFor: Date,
    recipientEmail?: string
  ): Promise<INotification> {
    const channels = await this.resolveChannels(userId, userType);
    return this.create({
      userId, userType,
      type: 'reminder',
      title: `Rappel — consultation dans ${minutesBefore} min`,
      body: `Votre consultation commence dans ${minutesBefore} minutes.`,
      data: { appointmentId: new Types.ObjectId(appointmentId) as any },
      channels,
      priority: 'high',
      expiresAt: scheduledFor,
      recipientEmail,
    });
  }

  async notifyNewMessage(
    userId: string,
    userType: UserType,
    senderName: string,
    preview: string
  ): Promise<INotification> {
    return this.create({
      userId,
      userType,
      type:  'message',
      title: `Nouveau message de ${senderName}`,
      body:  preview.length > 80 ? `${preview.slice(0, 80)}...` : preview,
      priority: 'normal',
    });
  }

  async notifyPrescriptionReady(
    patientId: string,
    prescriptionId: string,
    doctorName: string
  ): Promise<INotification> {
    return this.create({
      userId:   patientId,
      userType: 'patient',
      type:     'prescription',
      title:    'Ordonnance disponible',
      body:     `Dr ${doctorName} vous a envoyé une ordonnance. Consultez votre dossier médical.`,
      data:     { prescriptionId: new Types.ObjectId(prescriptionId) as any },
      priority: 'normal',
    });
  }

  async notifyPaymentReceived(
    doctorId: string,
    amount: number,
    currency: string,
    appointmentId: string
  ): Promise<INotification> {
    return this.create({
      userId:   doctorId,
      userType: 'doctor',
      type:     'payment',
      title:    'Paiement reçu',
      body:     `Vous avez reçu un paiement de ${amount.toLocaleString('fr-FR')} ${currency}.`,
      data:     { appointmentId: new Types.ObjectId(appointmentId) as any },
      priority: 'normal',
    });
  }

  async notifySubscriptionExpiringSoon(
    doctorId: string,
    tier: 'premium' | 'elite',
    daysLeft: number,
    expiresAt: Date
  ): Promise<INotification> {
    return this.create({
      userId: doctorId,
      userType: 'doctor',
      type: 'system',
      title: `Abonnement ${tier} bientôt expiré`,
      body: `Votre abonnement ${tier} expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} (le ${expiresAt.toLocaleDateString('fr-FR')}). Renouvelez pour ne pas perdre vos avantages.`,
      priority: 'high',
      expiresAt,
    });
  }

  async notifySubscriptionDowngraded(
    doctorId: string,
    previousTier: 'premium' | 'elite'
  ): Promise<INotification> {
    return this.create({
      userId: doctorId,
      userType: 'doctor',
      type: 'system',
      title: 'Abonnement expiré',
      body: `Votre abonnement ${previousTier} a expiré et votre compte est repassé en offre gratuite. Renouvelez pour retrouver vos avantages.`,
      priority: 'high',
    });
  }

  async notifySystem(
    userId: string,
    userType: UserType,
    title: string,
    body: string,
    priority: Priority = 'low'
  ): Promise<INotification> {
    return this.create({ userId, userType, type: 'system', title, body, priority });
  }

  // ── Lister les notifications d'un utilisateur ──────────────────────────────

  async listForUser(
    userId: string,
    filters: ListFilters = {}
  ): Promise<{
    notifications: INotification[];
    total: number;
    unreadCount: number;
    page: number;
    pages: number;
  }> {
    const { type, read, page = 1, limit = 20 } = filters;

    const query: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (type !== undefined) query['type']        = type;
    if (read !== undefined) query['statut.read'] = read;

    // Exclure les notifs expirées
    query['$or'] = [
      { 'metadata.expiresAt': { $exists: false } },
      { 'metadata.expiresAt': { $gt: new Date() } },
    ];

    const skip  = (page - 1) * limit;
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId: new Types.ObjectId(userId),
      'statut.read': false,
    });

    const notifications = await Notification.find(query)
      .sort({ 'metadata.createdAt': -1, 'metadata.priority': -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      notifications,
      total,
      unreadCount,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  

  // ── Marquer comme lue ──────────────────────────────────────────────────────

  async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<INotification> {
    const notification = await Notification.findOneAndUpdate(
      {
        _id:    new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      {
        $set: {
          'statut.read':    true,
          'statut.readAt':  new Date(),
        },
      },
      { new: true }
    );

    if (!notification) throw new Error('Notification introuvable.');
    return notification;
  }

  // ── Marquer toutes comme lues ──────────────────────────────────────────────

  async markAllAsRead(userId: string): Promise<{ modified: number }> {
    const result = await Notification.updateMany(
      {
        userId:        new Types.ObjectId(userId),
        'statut.read': false,
      },
      {
        $set: {
          'statut.read':   true,
          'statut.readAt': new Date(),
        },
      }
    );

    return { modified: result.modifiedCount };
  }

  // ── Supprimer une notification ─────────────────────────────────────────────

  async delete(
    notificationId: string,
    userId: string
  ): Promise<{ message: string }> {
    const result = await Notification.findOneAndDelete({
      _id:    new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    });

    if (!result) throw new Error('Notification introuvable.');
    return { message: 'Notification supprimée.' };
  }

  // ── Supprimer toutes les notifications lues d'un user ─────────────────────

  async deleteAllRead(userId: string): Promise<{ deleted: number }> {
    const result = await Notification.deleteMany({
      userId:        new Types.ObjectId(userId),
      'statut.read': true,
    });

    return { deleted: result.deletedCount };
  }

  // ── Marquer comme envoyée / délivrée (appelé par le provider push/SMS) ────

  async markAsSent(notificationId: string): Promise<void> {
    await Notification.findByIdAndUpdate(notificationId, {
      $set: {
        'statut.sent':   true,
        'statut.sentAt': new Date(),
      },
    });
  }

  async markAsDelivered(notificationId: string): Promise<void> {
    await Notification.findByIdAndUpdate(notificationId, {
      $set: {
        'statut.delivered':   true,
        'statut.deliveredAt': new Date(),
      },
    });
  }

  // ── Purge des notifications expirées (cron job) ────────────────────────────

  async purgeExpired(): Promise<{ deleted: number }> {
    const result = await Notification.deleteMany({
      'metadata.expiresAt': { $lt: new Date() },
    });

    return { deleted: result.deletedCount };
  }


/**
 * Notification d'appel entrant
 * Utilisé par CallService quand un médecin appelle un patient
 */
async notifyIncomingCall(
  receiverId: string,
  receiverType: UserType,
  callerName: string,
  callType: 'audio' | 'video',
  callSessionId: string,
  appointmentId?: string
): Promise<INotification> {
  const callLabel = callType === 'video' ? 'Appel vidéo' : 'Appel audio';
  const body = `${callerName} vous appelle en ${callType === 'video' ? 'visio' : 'audio'}. Décrochez dès que possible.`;
  
  return this.create({
    userId: receiverId,
    userType: receiverType,
    type: 'call',
    title: `${callLabel} entrant`,
    body,
    data: {
      callSessionId: new Types.ObjectId(callSessionId) as any,
      appointmentId: appointmentId ? new Types.ObjectId(appointmentId) as any : undefined,
      callerName,
      callType,
    },
    priority: 'high',
    channels: {
      push: true,
      inApp: true,
      email: false,
      sms: false,
    },
  });
}

/**
 * Notification d'appel manqué
 * Utilisé par CallService quand un appel n'est pas répondue
 */
async notifyMissedCall(
  receiverId: string,
  receiverType: UserType,
  callerName: string,
  callType: 'audio' | 'video',
  callSessionId: string,
  appointmentId?: string
): Promise<INotification> {
  const callLabel = callType === 'video' ? 'Appel vidéo' : 'Appel audio';
  const body = `Vous avez manqué un appel ${callType === 'video' ? 'vidéo' : 'audio'} de ${callerName}.`;
  
  return this.create({
    userId: receiverId,
    userType: receiverType,
    type: 'call',
    title: `Appel manqué`,
    body,
    data: {
      callSessionId: new Types.ObjectId(callSessionId) as any,
      appointmentId: appointmentId ? new Types.ObjectId(appointmentId) as any : undefined,
      callerName,
      callType,
    },
    priority: 'normal',
    channels: {
      push: true,
      inApp: true,
      email: false,
      sms: false,
    },
  });
}

/**
 * Notification d'appel terminé (résumé)
 */
async notifyCallEnded(
  userId: string,
  userType: UserType,
  otherUserName: string,
  duration: number,
  callType: 'audio' | 'video',
  callSessionId: string
): Promise<INotification> {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const durationStr = minutes > 0 
    ? `${minutes}m${seconds}s` 
    : `${seconds}s`;
  
  return this.create({
    userId,
    userType,
    type: 'call',
    title: `Appel terminé`,
    body: `Votre ${callType === 'video' ? 'visio' : 'appel audio'} avec ${otherUserName} a duré ${durationStr}.`,
    data: {
      callSessionId: new Types.ObjectId(callSessionId) as any,
      duration,
      callType,
      otherUserName,
    },
    priority: 'low',
    channels: {
      push: true,
      inApp: true,
      email: false,
      sms: false,
    },
  });
}

  // ── Compter les non lues ───────────────────────────────────────────────────

  async countUnread(userId: string): Promise<number> {
    return Notification.countDocuments({
      userId:        new Types.ObjectId(userId),
      'statut.read': false,
    });
  }
}

export const notificationService = new NotificationService();