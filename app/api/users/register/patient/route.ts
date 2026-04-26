import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/app/server/services/auth.service";
import connectDB from "@/app/server/config/databaseConnect";

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const dto = await req.json();
    const result = await authService.registerPatient(dto);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}