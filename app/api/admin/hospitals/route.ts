// app/api/admin/hospitals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/app/server/middleware/admin.auth.middleware';
import { adminService } from '@/app/server/services/Admin.service';
import { ListHospitalsQuerySchema } from '@/app/server/schemas/admin.schema';
import { CreateHospitalClinicSchema } from '@/app/server/schemas/HospitalClinic.schema';
import connectDB from '@/app/server/config/databaseConnect';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = await getAuthAdmin(req, 'moderate:hospitals');
    const { searchParams } = new URL(req.url);

    const parsed = ListHospitalsQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      verified: searchParams.get('verified') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }

    const result = await adminService.listHospitals(String(admin._id), parsed.data);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 403 });
  }
}


// app/api/admin/hospitals/route.ts

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const admin = await getAuthAdmin(req, 'moderate:hospitals');

    const contentType = req.headers.get('content-type') ?? '';
    let body: Record<string, unknown>;
    let imageBuffer: Buffer | undefined;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const raw = form.get('data');
      if (typeof raw !== 'string') {
        return NextResponse.json({ message: 'Champ "data" (JSON) manquant.' }, { status: 400 });
      }
      body = JSON.parse(raw);

      const file = form.get('image');
      if (file instanceof File) {
        imageBuffer = Buffer.from(await file.arrayBuffer());
      }
    } else {
      body = await req.json();
    }

    // ✅ Vérifier que body a les champs requis
    console.log('Body reçu:', body);

    const parsed = CreateHospitalClinicSchema.safeParse(body);
    if (!parsed.success) {
      console.log('Erreur de validation:', parsed.error.issues);
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const facility = await adminService.createHospital(
      String(admin._id),
      parsed.data,
      imageBuffer
    );

    return NextResponse.json({ data: facility }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur POST /admin/hospitals:', error);
    return NextResponse.json(
      { message: error.message },
      { status: 400 }
    );
  }
}