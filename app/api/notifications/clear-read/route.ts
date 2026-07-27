import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/app/server/services/notification.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// DELETE /api/notifications/clear-read
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);

    if (!authUser || !authUser.data?._id) {
      return NextResponse.json(
        { success: false, message: 'Non authentifié.' },
        { status: 401 }
      );
    }

    const result = await notificationService.deleteAllRead(String(authUser.data._id));

    return NextResponse.json({ success: true, ...result });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}