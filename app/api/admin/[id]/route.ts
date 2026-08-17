// app/api/admin/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSuperAdmin } from '@/app/server/middleware/admin.auth.middleware';
import { adminService } from '@/app/server/services/Admin.service';
import connectDB from '@/app/server/config/databaseConnect';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = await getAuthSuperAdmin(req);
    const { id } = await params;
    const result = await adminService.getAdminById(String(admin._id), id);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }
}