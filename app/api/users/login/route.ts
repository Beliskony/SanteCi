import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/app/server/services/auth.service";
import connectDB from "@/app/server/config/databaseConnect";
import { LoginDTO } from "@/app/server/services/auth.service";


export async function POST(req: NextRequest) {
    await connectDB();

    try {
        const loginDTO: LoginDTO = await req.json();

        if (!loginDTO) {
            return NextResponse.json(
                { message: "Email, Password et role sont des champs requis" },
                { status: 400 }
            )
        }

        const result = await authService.login(loginDTO);
        return NextResponse.json(
            { message: "Login successful", data: result },
            { status: 200 }
        );

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 401 });
    }
}