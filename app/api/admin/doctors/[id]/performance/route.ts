// app/api/admin/doctors/[id]/performance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/app/server/middleware/admin.auth.middleware';
import { adminService } from '@/app/server/services/Admin.service';
import { RevenuePeriodQuerySchema } from '@/app/server/schemas/admin.schema';
import connectDB from '@/app/server/config/databaseConnect';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = await getAuthAdmin(req, 'moderate:doctors');
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const parsed = RevenuePeriodQuerySchema.safeParse({ period: searchParams.get('period') ?? undefined });
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }

    const result = await adminService.getDoctorPerformance(String(admin._id), id, parsed.data.period);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }
}