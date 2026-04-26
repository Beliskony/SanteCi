import mongoose, { Schema } from 'mongoose';
import { IChatMessage } from '../interfaces/chatMessage.interface';


const ChatMessageSchema: Schema = new Schema({
  senderId: { type: Schema.Types.ObjectId, required: true, refPath: 'senderModel' },
  receiverId: { type: Schema.Types.ObjectId, required: true, refPath: 'receiverModel' },
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
  chatRoomId: { type: String, required: true },
  messageType: { type: String, enum: ['text', 'image', 'file', 'audio', 'video', 'prescription'], required: true },
  content: { type: String, required: true },
  file: {
    url: { type: String },
    name: { type: String },
    size: { type: Number },
    type: { type: String },
  },
  status: {
    delivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  metadata: {
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now },
    deletedFor: [{ type: Schema.Types.ObjectId, refPath: 'deletedForModel' }],
  },
});

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);