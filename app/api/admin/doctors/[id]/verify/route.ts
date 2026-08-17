// app/api/admin/doctors/[id]/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/app/server/middleware/admin.auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';
import { adminService } from '@/app/server/services/Admin.service';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = await getAuthAdmin(req, 'moderate:doctors');
    const { id } = await params;
    const result = await adminService.verifyDoctor(String(admin._id), id);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }
}