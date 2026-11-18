-- Datos de presentación de cada equipo del catálogo. No crea equipos nuevos.
ALTER TABLE "CatalogItem" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CatalogItem" ADD COLUMN "icon" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CatalogItem" ADD COLUMN "color" TEXT NOT NULL DEFAULT '';

INSERT INTO "CatalogItem" ("id", "kind", "key", "name", "description", "icon", "color", "active", "sortOrder")
VALUES
  ('equipo_desarrollo', 'EQUIPO', 'DESARROLLO', 'Desarrollo', 'Errores, soporte técnico y mejoras en plataformas.', 'codigo', 'azul', true, 1),
  ('equipo_marketing', 'EQUIPO', 'MARKETING', 'Marketing', 'Diseño, contenidos y piezas de comunicación.', 'megafono', 'coral', true, 2)
ON CONFLICT ("kind", "key") DO NOTHING;
