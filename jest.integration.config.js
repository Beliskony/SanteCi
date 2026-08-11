const { createDefaultPreset } = require('ts-jest');

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  // Cible uniquement le dossier integration/
  testMatch: ['**/__tests__/integration/*.integration.test.ts'],
  // Plus de timeout — MongoDB en mémoire peut être lent au démarrage
  testTimeout: 30000,
  // Les tests d'intégration s'exécutent en série (pas en parallèle)
  // pour éviter les conflits de connexion Mongoose
  runInBand: true,
};