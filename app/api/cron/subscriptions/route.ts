// app/api/cron/subscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService } from '@/app/server/services/subscription.service';
import connectDB from '@/app/server/config/databaseConnect';

export async function GET(req: NextRequest) {
  // Sécuriser avec un secret pour éviter les appels non autorisés
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, message: 'Non autorisé.' }, { status: 401 });
  }

  try {
    await connectDB();

    const [downgradeResult, cleanupResult] = await Promise.all([
      subscriptionService.downgradeExpired(),
      subscriptionService.cleanupStalePending(),
    ]);

    return NextResponse.json({
      success: true,
      downgraded: downgradeResult.downgraded,
      cleanedPending: cleanupResult.cleaned,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}