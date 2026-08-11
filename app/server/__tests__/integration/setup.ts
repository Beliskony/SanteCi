/**
 * setup.ts
 *
 * Démarre MongoDB en mémoire avant tous les tests d'intégration,
 * connecte Mongoose, et nettoie après chaque suite.
 *
 * À placer dans : app/server/__tests__/integration/setup.ts
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

// ── Démarrer MongoDB en mémoire et connecter Mongoose ────────────────────────
export async function setupTestDB() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

// ── Vider toutes les collections entre les tests ──────────────────────────────
export async function clearDB() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

// ── Déconnecter et arrêter MongoDB ────────────────────────────────────────────
export async function teardownTestDB() {
  await mongoose.disconnect();
  await mongod.stop();
}