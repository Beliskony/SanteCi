// app/api/admin/hospitals/[id]/verification-details/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/app/server/middleware/admin.auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';
import { adminService } from '@/app/server/services/Admin.service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = await getAuthAdmin(req, 'moderate:hospitals');
    const { id } = await params;
    const result = await adminService.getHospitalVerificationDetails(String(admin._id), id);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: error.status ?? 400 });
  }
}