// app/api/admin/password/send-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/app/server/services/Admin.Auth.Service';
import { SendPasswordOtpSchema } from '@/app/server/schemas/admin.schema';
import connectDB from '@/app/server/config/databaseConnect';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const parsed = SendPasswordOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }

    await adminAuthService.sendPasswordResetOtp(parsed.data.email).catch(() => null);
    // Réponse générique dans tous les cas — évite l'énumération d'emails admin
    return NextResponse.json({ message: 'Si ce compte existe, un OTP a été envoyé.' }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Si ce compte existe, un OTP a été envoyé.' }, { status: 200 });
  }
}