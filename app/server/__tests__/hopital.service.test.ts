/**
 * hopital.service.test.ts
 *
 * Tests unitaires purs : HospitalClinic et cloudinaryService sont mockés.
 * Structure : app/server/services/hopital.service.ts, app/server/models/*.ts,
 * app/server/__tests__/hopital.service.test.ts (ce fichier).
 *
 * Basé sur ma lecture du fichier uploadé, pas encore vérifié contre le
 * vrai code source — colle-moi hopital.service.ts si tu veux un contrôle
 * croisé comme pour auth/appointment/payment/doctor.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../models/hopitalClinic.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../services/cloudinary.service', () => ({
  cloudinaryService: {
    uploadHospitalCover: jest.fn(async () => ({ url: 'https://x/cover.png', publicId: 'cover_FAC-1' })),
    replaceImage: jest.fn(async () => ({ url: 'https://x/new-cover.png', publicId: 'cover_FAC-1-new' })),
    deleteImage: jest.fn(async () => undefined),
  },
}));

import { hospitalClinicService } from '../services/hopital.service';
import HospitalClinic from '../models/hopitalClinic.model';
import { cloudinaryService } from '../services/cloudinary.service';

function mockQuery<T>(value: T) {
  const query: any = Promise.resolve(value);
  query.select = jest.fn().mockReturnValue(query);
  query.populate = jest.fn().mockReturnValue(query);
  query.sort = jest.fn().mockReturnValue(query);
  query.skip = jest.fn().mockReturnValue(query);
  query.limit = jest.fn().mockReturnValue(query);
  query.lean = jest.fn().mockReturnValue(Promise.resolve(value));
  return query;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── create ─────────────────────────────────────────────────────────────────

describe('hospitalClinicService.create', () => {
  const dto = {
    name: 'Clinique du Plateau',
    type: 'clinic' as const,
    category: 'private' as const,
    certification: { licenseNumber: 'LIC-999' },
  };

  it('rejette si le numéro de licence existe déjà', async () => {
    (HospitalClinic.findOne as any).mockResolvedValue({ _id: 'existing' });

    await expect(hospitalClinicService.create(dto as any)).rejects.toThrow(
      'Un établissement avec ce numéro de licence existe déjà.'
    );
    expect(HospitalClinic.create).not.toHaveBeenCalled();
  });

  it("crée l'établissement sans image de couverture", async () => {
    (HospitalClinic.findOne as any).mockResolvedValue(null);
    const created = { _id: 'fac1', facilityId: 'FAC-ABCD1234' };
    (HospitalClinic.create as any).mockResolvedValue(created);

    const result = await hospitalClinicService.create(dto as any);

    expect(result).toBe(created);
    expect(cloudinaryService.uploadHospitalCover).not.toHaveBeenCalled();
  });

  it("crée l'établissement et uploade la couverture si un buffer est fourni", async () => {
    (HospitalClinic.findOne as any).mockResolvedValue(null);
    (HospitalClinic.create as any).mockResolvedValue({ _id: 'fac1', facilityId: 'FAC-ABCD1234' });

    const buffer = Buffer.from('fake-image');
    await hospitalClinicService.create(dto as any, buffer);

    expect(cloudinaryService.uploadHospitalCover).toHaveBeenCalledWith(
      buffer,
      expect.stringMatching(/^cover_FAC-/)
    );
    const createArg = (HospitalClinic.create as any).mock.calls[0][0];
    expect(createArg.imageCover).toEqual({ url: 'https://x/cover.png', publicId: 'cover_FAC-1' });
  });
});

// ─── getById / getByFacilityId ──────────────────────────────────────────────

describe('hospitalClinicService.getById', () => {
  it('rejette si introuvable', async () => {
    (HospitalClinic.findById as any).mockReturnValue(mockQuery(null));

    await expect(hospitalClinicService.getById('fac1')).rejects.toThrow(
      'Établissement introuvable.'
    );
  });

  it('retourne l\'établissement trouvé', async () => {
    const facility = { _id: 'fac1', name: 'Clinique du Plateau' };
    (HospitalClinic.findById as any).mockReturnValue(mockQuery(facility));

    const result = await hospitalClinicService.getById('fac1');

    expect(result).toBe(facility);
  });
});

// ─── update ─────────────────────────────────────────────────────────────────

describe('hospitalClinicService.update', () => {
  it('rejette si introuvable', async () => {
    (HospitalClinic.findByIdAndUpdate as any).mockReturnValue(mockQuery(null));

    await expect(hospitalClinicService.update('fac1', {} as any)).rejects.toThrow(
      'Établissement introuvable.'
    );
  });

  it('met à jour uniquement les champs fournis', async () => {
    (HospitalClinic.findByIdAndUpdate as any).mockReturnValue(mockQuery({ _id: 'fac1' }));

    await hospitalClinicService.update('fac1', { name: 'Nouveau nom' } as any);

    expect(HospitalClinic.findByIdAndUpdate).toHaveBeenCalledWith(
      'fac1',
      { $set: expect.objectContaining({ name: 'Nouveau nom' }) },
      expect.objectContaining({ new: true })
    );
  });

  it('remplace l\'ancienne image de couverture si un nouveau buffer est fourni', async () => {
    // findById().select() est utilisé pour récupérer le doc courant avant update
    (HospitalClinic.findById as any).mockReturnValue(
      mockQuery({ imageCover: { publicId: 'cover_FAC-OLD' }, facilityId: 'FAC-OLD' })
    );
    (HospitalClinic.findByIdAndUpdate as any).mockReturnValue(mockQuery({ _id: 'fac1' }));

    const buffer = Buffer.from('new-image');
    await hospitalClinicService.update('fac1', {} as any, buffer);

    expect(cloudinaryService.replaceImage).toHaveBeenCalledWith(
      'cover_FAC-OLD',
      buffer,
      'hospitalCover',
      'cover_FAC-OLD'
    );
  });
});

// ─── addDoctor / removeDoctor ────────────────────────────────────────────────

describe('hospitalClinicService.addDoctor / removeDoctor', () => {
  it('rejette si l\'établissement est introuvable', async () => {
    (HospitalClinic.findById as any).mockResolvedValue(null);

    await expect(hospitalClinicService.addDoctor('fac1', '507f1f77bcf86cd799439012')).rejects.toThrow(
      'Établissement introuvable.'
    );
  });

  it("rejette si le médecin est déjà affilié", async () => {
    (HospitalClinic.findById as any).mockResolvedValue({
      staff: { doctors: [{ toString: () => '507f1f77bcf86cd799439012' }] },
    });

    await expect(hospitalClinicService.addDoctor('fac1', '507f1f77bcf86cd799439012')).rejects.toThrow(
      'Ce médecin est déjà affilié à cet établissement.'
    );
  });

  it('ajoute le médecin via $push', async () => {
    (HospitalClinic.findById as any).mockResolvedValue({ staff: { doctors: [] } });
    (HospitalClinic.findByIdAndUpdate as any).mockResolvedValue(undefined);

    const result = await hospitalClinicService.addDoctor('fac1', '507f1f77bcf86cd799439012');

    expect(result.message).toMatch(/ajouté/);
    expect(HospitalClinic.findByIdAndUpdate).toHaveBeenCalledWith(
      'fac1',
      expect.objectContaining({ $push: expect.objectContaining({ 'staff.doctors': expect.anything() }) })
    );
  });

  it('retire le médecin via $pull', async () => {
    (HospitalClinic.findByIdAndUpdate as any).mockResolvedValue(undefined);

    const result = await hospitalClinicService.removeDoctor('fac1', '507f1f77bcf86cd799439012');

    expect(result.message).toMatch(/retiré/);
    expect(HospitalClinic.findByIdAndUpdate).toHaveBeenCalledWith(
      'fac1',
      expect.objectContaining({ $pull: expect.objectContaining({ 'staff.doctors': expect.anything() }) })
    );
  });
});

// ─── verify ─────────────────────────────────────────────────────────────────

describe('hospitalClinicService.verify', () => {
  it('rejette si introuvable', async () => {
    (HospitalClinic.findByIdAndUpdate as any).mockResolvedValue(null);

    await expect(hospitalClinicService.verify('fac1')).rejects.toThrow(
      'Établissement introuvable.'
    );
  });

  it('marque l\'établissement comme vérifié', async () => {
    (HospitalClinic.findByIdAndUpdate as any).mockResolvedValue({ _id: 'fac1' });

    const result = await hospitalClinicService.verify('fac1');

    expect(result.message).toMatch(/vérifié/);
    expect(HospitalClinic.findByIdAndUpdate).toHaveBeenCalledWith(
      'fac1',
      expect.objectContaining({ $set: expect.objectContaining({ 'metadata.verified': true }) }),
      expect.objectContaining({ new: true })
    );
  });
});

// ─── updateRating ────────────────────────────────────────────────────────────

describe('hospitalClinicService.updateRating', () => {
  it('rejette si introuvable', async () => {
    (HospitalClinic.findById as any).mockReturnValue(mockQuery(null));

    await expect(hospitalClinicService.updateRating('fac1', 5)).rejects.toThrow(
      'Établissement introuvable.'
    );
  });

  it('calcule correctement la nouvelle moyenne pondérée', async () => {
    // Moyenne actuelle 4.0 sur 2 avis, on ajoute une note de 5
    // → nouvelle moyenne = (4.0*2 + 5) / 3 = 4.33
    (HospitalClinic.findById as any).mockReturnValue(
      mockQuery({ metadata: { rating: 4.0, totalReviews: 2 } })
    );
    (HospitalClinic.findByIdAndUpdate as any).mockResolvedValue(undefined);

    await hospitalClinicService.updateRating('fac1', 5);

    const updateArg = (HospitalClinic.findByIdAndUpdate as any).mock.calls[0][1];
    expect(updateArg.$set['metadata.rating']).toBeCloseTo(4.33, 2);
    expect(updateArg.$set['metadata.totalReviews']).toBe(3);
  });
});

// ─── delete ─────────────────────────────────────────────────────────────────

describe('hospitalClinicService.delete', () => {
  it('rejette si introuvable', async () => {
    (HospitalClinic.findById as any).mockReturnValue(mockQuery(null));

    await expect(hospitalClinicService.delete('fac1')).rejects.toThrow(
      'Établissement introuvable.'
    );
  });

  it('supprime l\'image de couverture puis le document', async () => {
    (HospitalClinic.findById as any).mockReturnValue(
      mockQuery({ imageCover: { publicId: 'cover_FAC-1' } })
    );
    (HospitalClinic.findByIdAndDelete as any).mockResolvedValue(undefined);

    const result = await hospitalClinicService.delete('fac1');

    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('cover_FAC-1');
    expect(HospitalClinic.findByIdAndDelete).toHaveBeenCalledWith('fac1');
    expect(result.message).toMatch(/supprimé/);
  });

  it('ne tente pas de supprimer une image inexistante', async () => {
    (HospitalClinic.findById as any).mockReturnValue(mockQuery({ imageCover: undefined }));
    (HospitalClinic.findByIdAndDelete as any).mockResolvedValue(undefined);

    await hospitalClinicService.delete('fac1');

    expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
  });
});