// app/api/admin/[id]/permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSuperAdmin } from '@/app/server/middleware/admin.auth.middleware';
import { adminService } from '@/app/server/services/Admin.service';
import { UpdateAdminPermissionsSchema } from '@/app/server/schemas/admin.schema';
import connectDB from '@/app/server/config/databaseConnect';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const admin = await getAuthSuperAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateAdminPermissionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }

    const result = await adminService.updatePermissions(String(admin._id), id, parsed.data.permissions);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }
}