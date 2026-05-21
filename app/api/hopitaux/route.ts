import { NextRequest, NextResponse } from 'next/server';
import { hospitalClinicService } from '@/app/server/services/hopital.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import { CreateHospitalClinicSchema } from '@/app/server/schemas/HospitalClinic.schema';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/hospitals?city=&district=&type=&category=&telemedicineEnabled=&homeVisits=&emergency24h=&specialty=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = req.nextUrl;

    const filters = {
      city:                searchParams.get('city')     ?? undefined,
      district:            searchParams.get('district') ?? undefined,
      type:                searchParams.get('type')     ?? undefined,
      category:            searchParams.get('category') ?? undefined,
      specialty:           searchParams.get('specialty') ?? undefined,
      telemedicineEnabled: searchParams.has('telemedicineEnabled') ? searchParams.get('telemedicineEnabled') === 'true' : undefined,
      homeVisits:          searchParams.has('homeVisits')          ? searchParams.get('homeVisits')          === 'true' : undefined,
      emergency24h:        searchParams.has('emergency24h')        ? searchParams.get('emergency24h')        === 'true' : undefined,
      page:                searchParams.has('page')  ? Number(searchParams.get('page'))  : 1,
      limit:               searchParams.has('limit') ? Number(searchParams.get('limit')) : 10,
    };

    const result = await hospitalClinicService.search(filters);
    console.log("result:", JSON.stringify(result, null, 2));
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
     console.error("GET /api/hopitaux error:", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST — remplacer req.json() par formData
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    await getAuthDoctor(req);

    const formData = await req.formData();
    const raw = JSON.parse(formData.get('data') as string);
    const imageFile = formData.get('image') as File | null;

    const parsed = CreateHospitalClinicSchema.omit({ facilityId: true }).safeParse({
      ...raw,
      certification: {
        ...raw.certification,
        expiryDate: raw.certification?.expiryDate
          ? new Date(raw.certification.expiryDate)
          : undefined,
      },
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const imageBuffer = imageFile
      ? Buffer.from(await imageFile.arrayBuffer())
      : undefined;

    const facility = await hospitalClinicService.create(parsed.data, imageBuffer);
    return NextResponse.json({ success: true, data: facility }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401
      : message.includes('existe déjà') ? 409 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}