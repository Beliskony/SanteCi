// app/api/admin/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSuperAdmin } from '@/app/server/middleware/admin.auth.middleware';
import { adminService } from '@/app/server/services/Admin.service';
import { UpdateAccountStatusSchema } from '@/app/server/schemas/admin.schema';
import connectDB from '@/app/server/config/databaseConnect';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = await getAuthSuperAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateAccountStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }

    const result = await adminService.setAdminStatus(String(admin._id), id, parsed.data.status, parsed.data.reason);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = await getAuthSuperAdmin(req);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const reason = searchParams.get('reason') ?? undefined;

    const result = await adminService.deleteAdmin(String(admin._id), id, reason);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }
}