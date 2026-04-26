import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/app/server/services/auth.service";
import connectDB from "@/app/server/config/databaseConnect";


export async function  POST(req: NextRequest) {
    await connectDB();

    try {
        const { email, role } = await req.json();
        if (!email || !role) {
            return NextResponse.json({message: "Email et role sont requis"})
        }

        const result = await authService.sendOtp(email, role);
        return NextResponse.json(result, {status: 200});
        
    } catch (error: any) {
        const status = error.message === "User not found" ? 404 : 400;
        return NextResponse.json({ message: error.message }, { status });
    }
}