// app/api/admin/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/app/server/services/Admin.Auth.Service';
import connectDB from '@/app/server/config/databaseConnect';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { refreshToken } = await req.json();
    if (!refreshToken) return NextResponse.json({ message: 'Refresh token requis.' }, { status: 400 });

    const tokens = await adminAuthService.refreshToken(refreshToken);
    return NextResponse.json({ data: tokens }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }
}