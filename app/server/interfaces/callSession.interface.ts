import { Document, Types } from 'mongoose';

export interface ICallSession extends Document {
  _id:           Types.ObjectId;

  // Participants
  callerId:      Types.ObjectId;
  callerType:    'doctor' | 'patient';
  receiverId:    Types.ObjectId;
  receiverType:  'doctor' | 'patient';

  // Lien avec le RDV
  appointmentId: Types.ObjectId;
  chatRoomId:    string;

  // Type d'appel
  callType:      'audio' | 'video';

  // Statut
  status:        'initiated' | 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed' | 'failed';

  // Agora
  agora: {
    channelName:   string;           // identifiant unique du channel Agora
    callerToken:   string;           // token RTC généré pour le caller
    receiverToken: string;           // token RTC généré pour le receiver
    callerUid:     number;
    receiverUid:   number;
    appId:         string;
  };

  // Timing
  timing: {
    initiatedAt:  Date;
    ringingAt?:   Date;
    acceptedAt?:  Date;
    endedAt?:     Date;
    duration?:    number;            // en secondes
  };

  // Fin d'appel
  endedBy?:         'caller' | 'receiver' | 'system';
  declineReason?:   string;
  failureReason?:   string;

  metadata: {
    createdAt: Date;
    updatedAt: Date;
  };
}