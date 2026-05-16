import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';
import { Doctor } from '@/app/server/models/medcin.model';
import { cloudinaryService } from '@/app/server/services/cloudinary.service';
import { Types } from 'mongoose';

// POST /api/doctor/[id]/photo
// app/api/doctor/photo/route.ts - Version de diagnostic
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    const mongoId = String(authDoctor._id);
    
    console.log('=== DIAGNOSTIC ===');
    console.log('1. Mongo ID:', mongoId);
    
    // TEST 1: Vérifier que le médecin existe
    const doctorBefore = await Doctor.findById(mongoId);
    console.log('2. Médecin trouvé:', doctorBefore ? 'OUI' : 'NON');
    console.log('3. Photo avant:', doctorBefore?.profile?.photo);
    
    const formData = await req.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Aucun fichier envoyé.' },
        { status: 400 }
      );
    }

    console.log('4. Fichier reçu:', file.name, file.type, file.size);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // TEST 2: Upload Cloudinary
    console.log('5. Upload vers Cloudinary...');
    const { url } = await cloudinaryService.uploadProfilePhoto(buffer, mongoId, 'doctor');
    console.log('6. URL Cloudinary:', url);
    
    // TEST 3: Mise à jour directe avec updateOne
    console.log('7. Mise à jour directe avec updateOne...');
    const updateResult = await Doctor.updateOne(
      { _id: new Types.ObjectId(mongoId) },
      { $set: { 'profile.photo': url } }
    );
    console.log('8. Résultat updateOne:', {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount
    });
    
    // TEST 4: Vérifier immédiatement
    const doctorAfter = await Doctor.findById(mongoId);
    console.log('9. Photo après mise à jour:', doctorAfter?.profile?.photo);
    
    // TEST 5: Vérifier avec findOne
    const doctorFindOne = await Doctor.findOne({ _id: mongoId });
    console.log('10. Vérification findOne:', doctorFindOne?.profile?.photo);
    
    return NextResponse.json({ 
      success: true, 
      data: { photoUrl: url },
      debug: {
        updateResult,
        photoInDb: doctorAfter?.profile?.photo,
        url
      }
    });
    
  } catch (error: unknown) {
    console.error('❌ ERREUR DETAILLEE:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return NextResponse.json({ success: false, message, error: String(error) }, { status: 500 });
  }
}