import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/doctors/search?specialty=&city=&isAvailable=&consultationType=&minRating=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = req.nextUrl;

    const filters = {
      specialty:        searchParams.get('specialty') ?? undefined,
      city:             searchParams.get('city') ?? undefined,
      consultationType: searchParams.get('consultationType') as 'video' | 'audio' | 'chat' | undefined,
      isAvailable:      searchParams.has('isAvailable') ? searchParams.get('isAvailable') === 'true' : undefined,
      minRating:        searchParams.has('minRating') ? Number(searchParams.get('minRating')) : undefined,
      page:             searchParams.has('page') ? Number(searchParams.get('page')) : 1,
      limit:            searchParams.has('limit') ? Number(searchParams.get('limit')) : 10,
    };

    const result = await doctorService.searchDoctors(filters);

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}