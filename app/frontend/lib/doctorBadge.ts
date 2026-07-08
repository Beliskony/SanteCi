// app/frontend/lib/doctorBadge.ts

export type DoctorTier = 'free' | 'premium' | 'elite';

export function getDoctorTier(status: any): DoctorTier {
  const sub    = status?.subscription ?? 'free';
  const expiry = status?.subscriptionExpiry;
  if (sub === 'free' || !expiry) return 'free';
  return new Date(expiry) > new Date() ? sub as DoctorTier : 'free';
}