import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

// ── Sous-schémas ───────────────────────────────────────────────────────────────

const FileSchema = z.object({
  url:  z.string().url().optional(),
  name: z.string().optional(),
  size: z.number().positive().optional(),
  type: z.string().optional(),
});

const StatusSchema = z.object({
  delivered:   z.boolean().default(false),
  deliveredAt: z.date().optional(),
  read:        z.boolean().default(false),
  readAt:      z.date().optional(),
});

const MetadataSchema = z.object({
  createdAt:  z.date().default(() => new Date()),
  updatedAt:  z.date().default(() => new Date()),
  deletedFor: z.array(objectId).default([]),
});

// ── Schéma principal ───────────────────────────────────────────────────────────

export const ChatMessageSchema = z.object({
  senderId:      objectId,
  receiverId:    objectId,
  appointmentId: objectId.optional(),
  chatRoomId:    z.string().min(1),
  messageType:   z.enum(['text', 'image', 'file', 'audio', 'video', 'prescription']),
  content:       z.string().min(1),
  file:          FileSchema.optional(),
  status:        StatusSchema.default(() => ({
    delivered: false,
    read:      false,
  })),
  metadata:      MetadataSchema.default(() => ({
    createdAt:  new Date(),
    updatedAt:  new Date(),
    deletedFor: [],
  })),
}).refine(
  (data) => {
    // Si messageType nécessite un fichier, file doit être présent
    const fileTypes = ['image', 'file', 'audio', 'video'] as const;
    if (fileTypes.includes(data.messageType as typeof fileTypes[number])) {
      return !!data.file?.url;
    }
    return true;
  },
  {
    message: 'Un fichier (url) est requis pour ce type de message',
    path:    ['file', 'url'],
  }
);

// ── Types inférés ──────────────────────────────────────────────────────────────

export type TChatMessage         = z.infer<typeof ChatMessageSchema>;
export type TChatMessageFile     = z.infer<typeof FileSchema>;
export type TChatMessageStatus   = z.infer<typeof StatusSchema>;
export type TChatMessageMetadata = z.infer<typeof MetadataSchema>;

// ── Schémas dérivés ────────────────────────────────────────────────────────────

/** Envoi d'un message */
export const SendMessageSchema = ChatMessageSchema.omit({
  status:   true,
  metadata: true,
});

/** Mise à jour du statut uniquement */
export const UpdateMessageStatusSchema = z.object({
  delivered:   z.boolean().optional(),
  deliveredAt: z.date().optional(),
  read:        z.boolean().optional(),
  readAt:      z.date().optional(),
});

/** Soft delete : ajout d'un userId dans deletedFor */
export const DeleteMessageSchema = z.object({
  userId: objectId,
});

/** Document complet depuis la DB */
export const ChatMessageDocumentSchema = ChatMessageSchema.extend({
  _id: objectId,
  __v: z.number().optional(),
});

export type TSendMessage         = z.infer<typeof SendMessageSchema>;
export type TUpdateMessageStatus = z.infer<typeof UpdateMessageStatusSchema>;
export type TDeleteMessage       = z.infer<typeof DeleteMessageSchema>;