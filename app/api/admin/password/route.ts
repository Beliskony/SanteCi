// app/api/admin/password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/app/server/middleware/admin.auth.middleware';
import { adminAuthService } from '@/app/server/services/Admin.Auth.Service';
import { ChangePasswordAuthenticatedSchema } from '@/app/server/schemas/admin.schema';
import connectDB from '@/app/server/config/databaseConnect';

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const admin = await getAuthAdmin(req);
    const body = await req.json();
    const parsed = ChangePasswordAuthenticatedSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }

    const result = await adminAuthService.changePassword(
      String(admin._id),
      parsed.data.currentPassword,
      parsed.data.newPassword
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}