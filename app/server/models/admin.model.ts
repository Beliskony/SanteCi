import mongoose, { Schema } from 'mongoose';
import { IAdmin } from '../interfaces/admin.interface';

const AdminSchema: Schema = new Schema({
  adminId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  profile: {
    fullName: { type: String, required: true },
    photo: { type: String },
  },
  contact: {
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Boolean, default: false },
    phone: { type: String, required: true, unique: true },
    phoneVerified: { type: Boolean, default: false },
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin'],
    required: true,
    default: 'admin',
  },
  permissions: [{
    type: String,
    enum: [
      'moderate:doctors',
      'moderate:patients',
      'moderate:hospitals',
      'moderate:reviews',
      'manage:subscriptions',
      'manage:payments',
      'manage:disputes',
      'manage:notifications',
      'view:analytics',
    ],
  }],
  security: {
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: true },
    twoFactorEnabled: { type: Boolean, default: false },
    devices: [{
      deviceId: { type: String },
      platform: { type: String, enum: ['ios', 'android', 'web'] },
      lastActive: { type: Date },
    }],
    failedAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  status: {
    accountStatus: { type: String, enum: ['active', 'suspended', 'blocked'], default: 'active' },
    isOnline: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },
    lastLoginAt: { type: Date },
    verificationCode: { type: String },
    verificationExpires: { type: Date },
  },
  recentActions: [{
    action: {
      type: String,
      enum: [
        'verify_doctor', 'suspend_doctor', 'block_doctor', 'reactivate_doctor',
        'verify_hospital', 'suspend_hospital', 'reactivate_hospital',
        'suspend_patient', 'block_patient', 'reactivate_patient',
        'delete_review',
        'refund_payment',
        'create_admin', 'update_admin_permissions', 'suspend_admin', 'delete_admin',
        'other',
      ],
      required: true,
    },
    targetId: { type: mongoose.Types.ObjectId, required: true },
    targetType: {
      type: String,
      enum: ['doctor', 'patient', 'hospital', 'review', 'payment', 'admin'],
      required: true,
    },
    reason: { type: String },
    performedAt: { type: Date, default: Date.now },
  }],
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Types.ObjectId, ref: 'Admin', default: null },
  },
});

AdminSchema.index({ 'profile.fullName': 'text' });
AdminSchema.index({ 'status.accountStatus': 1 });
AdminSchema.index({ role: 1 });

export const Admin = mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);