// app/api/admin/hospitals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/app/server/middleware/admin.auth.middleware';
import { adminService } from '@/app/server/services/Admin.service';
import { UpdateHospitalClinicSchema } from '@/app/server/schemas/HospitalClinic.schema';
import connectDB from '@/app/server/config/databaseConnect';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = await getAuthAdmin(req, 'moderate:hospitals');
    const { id } = await params;

    const contentType = req.headers.get('content-type') ?? '';
    let body: Record<string, unknown>;
    let imageBuffer: Buffer | undefined;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const raw = form.get('data');
      body = typeof raw === 'string' ? JSON.parse(raw) : {};

      const file = form.get('image');
      if (file instanceof File) {
        imageBuffer = Buffer.from(await file.arrayBuffer());
      }
    } else {
      body = await req.json();
    }

    const parsed = UpdateHospitalClinicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }

    const facility = await adminService.updateHospital(String(admin._id), id, parsed.data, imageBuffer);

    return NextResponse.json({ data: facility }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = await getAuthAdmin(req, 'moderate:hospitals');
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const reason = searchParams.get('reason') ?? undefined;

    const result = await adminService.deleteHospital(String(admin._id), id, reason);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}