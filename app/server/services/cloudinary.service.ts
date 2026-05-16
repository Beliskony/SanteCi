import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// ─── Configuration ─────────────────────────────────────────────────────────────
// Variables d'env requises dans .env.local :
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure:     true,
});

// ─── Dossiers Cloudinary ───────────────────────────────────────────────────────

const FOLDERS = {
  hospitalCovers:  'hospitals/covers',
  profilePhotos:   'profile_photos',
  documents:       'documents',
} as const;

type CloudinaryFolder = typeof FOLDERS[keyof typeof FOLDERS];

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CloudinaryUploadResult {
  url:      string;
  publicId: string;
}

type UploadTarget =
  | 'hospitalCover'   // Image de couverture d'un hôpital
  | 'profilePhoto'    // Photo de profil (médecin ou patient)
  | 'document';       // Document médical partagé (consultation, etc.)

// ─── Helpers internes ──────────────────────────────────────────────────────────

function resolveFolder(target: UploadTarget): CloudinaryFolder {
  switch (target) {
    case 'hospitalCover': return FOLDERS.hospitalCovers;
    case 'profilePhoto':  return FOLDERS.profilePhotos;
    case 'document':      return FOLDERS.documents;
  }
}

/**
 * Transformations par défaut selon le type d'upload.
 * - hospitalCover : grand format paysage, qualité auto
 * - profilePhoto  : carré recadré sur le visage, petit poids
 * - document      : pas de transformation (préserver le contenu)
 */
function resolveTransformation(target: UploadTarget): object | undefined {
  switch (target) {
    case 'hospitalCover':
      return { width: 1280, height: 480, crop: 'fill', gravity: 'auto', quality: 'auto', fetch_format: 'auto' };
    case 'profilePhoto':
      return { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' };
    case 'document':
      return undefined;
  }
}

// ─── Service ───────────────────────────────────────────────────────────────────

class CloudinaryService {

  // ── Upload depuis un Buffer (Next.js FormData) ─────────────────────────────

  /**
   * Upload générique depuis un Buffer.
   * @param buffer  - Le fichier en mémoire
   * @param target  - Détermine le dossier et la transformation appliquée
   * @param entityId - Identifiant métier utilisé comme publicId (ex: hospitalId, doctorId…)
   */
  async uploadBuffer(
    buffer:   Buffer,
    target:   UploadTarget,
    entityId?: string,
  ): Promise<CloudinaryUploadResult> {
    const folder         = resolveFolder(target);
    const transformation = resolveTransformation(target);

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id:     entityId,
          transformation,
          resource_type: 'image',
          overwrite:     true,      // Remplace l'ancienne photo si même publicId
          invalidate:    true,      // Purge le CDN après remplacement
        },
        (error, res) => {
          if (error || !res) return reject(error ?? new Error('Upload échoué.'));
          resolve(res);
        }
      );
      stream.end(buffer);
    });

    return { url: result.secure_url, publicId: result.public_id };
  }

  // ── Upload depuis une URL distante ─────────────────────────────────────────

  async uploadFromUrl(
    imageUrl: string,
    target:   UploadTarget,
    entityId?: string,
  ): Promise<CloudinaryUploadResult> {
    const folder         = resolveFolder(target);
    const transformation = resolveTransformation(target);

    const result = await cloudinary.uploader.upload(imageUrl, {
      folder,
      public_id:     entityId,
      transformation,
      resource_type: 'image',
      overwrite:     true,
      invalidate:    true,
    });

    return { url: result.secure_url, publicId: result.public_id };
  }

  // ── Raccourcis sémantiques ─────────────────────────────────────────────────

  /** Photo de couverture d'un hôpital */
  async uploadHospitalCover(buffer: Buffer, hospitalId: string): Promise<CloudinaryUploadResult> {
    return this.uploadBuffer(buffer, 'hospitalCover', hospitalId);
  }

  /** Photo de profil — médecin ou patient */
  async uploadProfilePhoto(
    buffer:   Buffer,
    ownerId:  string,
    role:     'doctor' | 'patient',
  ): Promise<CloudinaryUploadResult> {
    // Préfixe le dossier par rôle pour mieux organiser : profile_photos/doctor/<id>
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:        `${FOLDERS.profilePhotos}/${role}`,
          public_id:     ownerId,
          transformation: resolveTransformation('profilePhoto'),
          resource_type: 'image',
          overwrite:     true,
          invalidate:    true,
        },
        (error, res) => {
          if (error || !res) return reject(error ?? new Error('Upload photo échoué.'));
          resolve(res);
        }
      );
      stream.end(buffer);
    });

    return { url: result.secure_url, publicId: result.public_id };
  }

  /** Document médical (consultation, ordonnance…) */
  async uploadDocument(buffer: Buffer, documentId: string): Promise<CloudinaryUploadResult> {
    return this.uploadBuffer(buffer, 'document', documentId);
  }

  // ── Suppression ────────────────────────────────────────────────────────────

  /**
   * Supprime une ressource via son publicId.
   * Idempotent : ne rejette pas si l'image n'existe pas.
   */
  async deleteImage(publicId: string): Promise<void> {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate:    true,
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Échec de la suppression Cloudinary : ${result.result}`);
    }
  }

  /**
   * Remplace une image existante et supprime l'ancienne si le publicId change.
   * Utile quand on ne peut pas garantir le même publicId entre deux uploads.
   */
  async replaceImage(
    oldPublicId: string | undefined,
    buffer:      Buffer,
    target:      UploadTarget,
    newEntityId?: string,
  ): Promise<CloudinaryUploadResult> {
    const uploaded = await this.uploadBuffer(buffer, target, newEntityId);

    // Nettoyage de l'ancienne image seulement si le publicId a changé
    if (oldPublicId && oldPublicId !== uploaded.publicId) {
      await this.deleteImage(oldPublicId).catch(() => {
        // On ne bloque pas si la suppression échoue (image déjà absente)
      });
    }

    return uploaded;
  }

  // ── Transformation à la volée (sans ré-upload) ────────────────────────────

  getTransformedUrl(
    publicId: string,
    options: {
      width?:   number;
      height?:  number;
      crop?:    string;
      quality?: string | number;
      format?:  string;
    } = {}
  ): string {
    return cloudinary.url(publicId, {
      secure:       true,
      width:        options.width,
      height:       options.height,
      crop:         options.crop    ?? 'fill',
      quality:      options.quality ?? 'auto',
      fetch_format: options.format  ?? 'auto',
    });
  }
}

export const cloudinaryService = new CloudinaryService();