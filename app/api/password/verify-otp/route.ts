import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/app/server/services/auth.service";
import connectDB from "@/app/server/config/databaseConnect";


export async function POST(req: NextRequest) {
    await connectDB();
    try {
        const {email, otp, role} = await req.json();

        if (!email || !otp || !role) {
           return NextResponse.json({ message: "Email and OTP are required" }, { status: 400 }); 
        }

        const result = await authService.verifyOtp(email, otp, role);
        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
}