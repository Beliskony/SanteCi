// app/api/admin/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/app/server/services/Admin.Auth.Service';
import { RegisterSuperAdminSchema } from '@/app/server/schemas/admin.schema';
import connectDB from '@/app/server/config/databaseConnect';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const parsed = RegisterSuperAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }

    const result = await adminAuthService.registerFirstSuperAdmin(parsed.data);
    return NextResponse.json({ message: result.message, data: result }, { status: 201 });
  } catch (error: any) {
    const status = error.message === 'Non autorisé.' ? 403 : 400;
    return NextResponse.json({ message: error.message }, { status });
  }
}