// app/api/admin/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/app/server/middleware/admin.auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = await getAuthAdmin(req);
    return NextResponse.json({ data: admin }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }
}