'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/app/frontend/store/useAuthStore';
import { detectPaymentMode, PaymentMode } from '@/app/frontend/lib/paymentModeDetector';

export function usePaymentMode() {
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const [modeInfo, setModeInfo] = useState<{
    mode: PaymentMode;
    props: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!searchParams) {
      setLoading(false);
      return;
    }

    const detection = detectPaymentMode(searchParams, user);
    
    if (!detection) {
      setLoading(false);
      setModeInfo(null);
      return;
    }

    const { mode, params } = detection;

    const props = {
      mode,
      amount: params.amount,
      ...(mode === 'consultation' ? {
        doctorId: params.doctorId,
        patientId: params.patientId || user?._id,
        doctorName: params.doctorName || 'Dr. Non spécifié',
        specialty: params.specialty || 'Généraliste',
        scheduledFor: params.scheduledFor ? new Date(params.scheduledFor) : new Date(),
        consultType: params.type || 'video',
        duration: Number(params.duration || '30'),
        reason: params.reason || '',
      } : {
        plan: params.plan || 'premium',
      }),
    };

    setModeInfo({ mode, props });
    setLoading(false);
  }, [searchParams, user]);

  return { modeInfo, loading };
}