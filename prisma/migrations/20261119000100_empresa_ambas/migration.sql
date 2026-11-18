-- Empresa transversal. No borra CIFES ni Luvania.
INSERT INTO "Empresa" ("id", "name", "active", "createdAt")
SELECT 'empresa_ambas_transversal', 'Ambas/Transversal', true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Empresa" WHERE "name" IN ('Ambas/Transversal', 'Ambas')
);
