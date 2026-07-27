import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/app/server/services/notification.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/notifications?type=xxx&read=true&page=1&limit=20
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);

    if (!authUser || !authUser.data?._id) {
      return NextResponse.json(
        { success: false, message: 'Non authentifié.' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;

    const filters: any = {
      page:  Math.max(1, parseInt(searchParams.get('page')  ?? '1')),
      limit: Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20'))),
    };

    if (searchParams.has('type')) {
      filters.type = searchParams.get('type') as any;
    }
    if (searchParams.has('read')) {
      filters.read = searchParams.get('read') === 'true';
    }

    const result = await notificationService.listForUser(String(authUser.data._id), filters);

    return NextResponse.json({ success: true, ...result });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}