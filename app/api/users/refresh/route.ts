import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/app/server/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'Refresh token manquant' },
        { status: 401 }
      );
    }

    const tokens = await authService.refreshToken(refreshToken);

    return NextResponse.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur serveur' },
      { status: 401 }
    );
  }
}