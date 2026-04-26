import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/app/server/services/auth.service";
import connectDB from "@/app/server/config/databaseConnect";

export async function POST(req:NextRequest) {
    await connectDB();
    try {
        const {email, otp, newPassword, role} = await req.json();
        if (!email || !otp || !newPassword || !role) {
            return NextResponse.json(
                {message: "Email, otp, Newpassword et role sont requis"},
                {status: 400}
            )
        }

        await authService.verifyOtp(email, otp, role);
        const result = await authService.resetPassword(email, otp, newPassword, role);
        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}