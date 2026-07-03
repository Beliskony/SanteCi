// pages/api/upload-audio.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure:     true,
});

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    // Le client envoie le fichier audio encodé en base64
    const { audioBase64, fileName } = req.body as { audioBase64: string; fileName: string };

    if (!audioBase64) return res.status(400).json({ error: "Aucun fichier reçu" });

    const result = await cloudinary.uploader.upload(
      `data:audio/webm;base64,${audioBase64}`,
      {
        folder:        "audio_messages",
        public_id:     fileName ?? `audio_${Date.now()}`,
        resource_type: "video",   // Cloudinary classe audio sous "video"
        overwrite:     false,
      }
    );

    res.status(200).json({ secure_url: result.secure_url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload échoué";
    console.error("Audio upload error:", err);
    res.status(500).json({ error: message });
  }
}