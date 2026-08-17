// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/app/server/middleware/admin.auth.middleware';
import { adminService } from '@/app/server/services/Admin.service';
import connectDB from '@/app/server/config/databaseConnect';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = await getAuthAdmin(req, 'view:analytics');
    const stats = await adminService.getDashboardStats(String(admin._id));
    return NextResponse.json({ data: stats }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }
}