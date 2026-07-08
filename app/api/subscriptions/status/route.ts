// app/api/subscriptions/status/route.ts
// GET — statut abonnement du médecin connecté
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import { Doctor } from '@/app/server/models/medcin.model';
import connectDB from '@/app/server/config/databaseConnect';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser?.data?._id) {
      return NextResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    }
    if (authUser.role !== 'doctor') {
      return NextResponse.json({ success: false, message: 'Réservé aux médecins.' }, { status: 403 });
    }

    const doctor = await Doctor.findById(authUser.data._id)
      .select('status.subscription status.subscriptionExpiry status.subscriptionStatus')
      .lean();

    if (!doctor) {
      return NextResponse.json({ success: false, message: 'Médecin introuvable.' }, { status: 404 });
    }

    const sub    = (doctor.status as any)?.subscription       ?? 'free';
    const expiry = (doctor.status as any)?.subscriptionExpiry ?? null;
    const status = (doctor.status as any)?.subscriptionStatus ?? null;
    const isActive = sub !== 'free' && expiry
      ? new Date(expiry) > new Date()
      : false;

    return NextResponse.json({
      success: true,
      data: {
        subscription:       isActive ? sub : 'free',
        subscriptionExpiry: expiry,
        subscriptionStatus: isActive ? status : (expiry ? 'expired' : null),
        isActive,
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}