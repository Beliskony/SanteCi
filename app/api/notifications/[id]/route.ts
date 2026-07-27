import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/app/server/services/notification.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PATCH /api/notifications/[id] - Marquer comme lue
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);

    if (!authUser || !authUser.data?._id) {
      return NextResponse.json(
        { success: false, message: 'Non authentifié.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const notification = await notificationService.markAsRead(id, String(authUser.data._id));

    return NextResponse.json({ success: true, data: notification });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message.includes('introuvable') ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// DELETE /api/notifications/[id] - Supprimer une notification
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);

    if (!authUser || !authUser.data?._id) {
      return NextResponse.json(
        { success: false, message: 'Non authentifié.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const result = await notificationService.delete(id, String(authUser.data._id));

    return NextResponse.json({ success: true, ...result });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message.includes('introuvable') ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}