// app/api/admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSuperAdmin } from '@/app/server/middleware//admin.auth.middleware';
import { adminService } from '@/app/server/services/Admin.service';
import { CreateSubAdminSchema } from '@/app/server/schemas/admin.schema';
import connectDB from '@/app/server/config/databaseConnect';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = await getAuthSuperAdmin(req);
    const admins = await adminService.listAdmins(String(admin._id));
    return NextResponse.json({ data: admins }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const admin = await getAuthSuperAdmin(req);
    const body = await req.json();
    const parsed = CreateSubAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }

    const result = await adminService.createSubAdmin(String(admin._id), parsed.data);
    return NextResponse.json({ message: 'Administrateur créé.', data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }
}