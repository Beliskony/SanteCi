// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/app/server/services/Admin.Auth.Service';
import { LoginAdminSchema } from '@/app/server/schemas/admin.schema';
import connectDB from '@/app/server/config/databaseConnect';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const parsed = LoginAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }

    const result = await adminAuthService.login(parsed.data);
    return NextResponse.json({ message: 'Connexion réussie.', data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 401 });
  }
}