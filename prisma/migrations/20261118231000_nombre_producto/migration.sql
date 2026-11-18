-- El equipo DESARROLLO se muestra como Producto. La clave y el prefijo DES- no cambian.
UPDATE "CatalogItem"
SET "name" = 'Producto'
WHERE "kind" = 'EQUIPO' AND "key" = 'DESARROLLO';

INSERT INTO "CatalogItem" ("id", "kind", "key", "name", "description", "icon", "color", "active", "sortOrder")
VALUES
  ('equipo_comercial', 'EQUIPO', 'COMERCIAL', 'Comercial', 'Cotizaciones, propuestas y seguimiento de clientes.', 'acuerdo', 'verde', true, 3),
  ('equipo_innovacion', 'EQUIPO', 'INNOVACION', 'Innovación', 'Ideas, prototipos y pilotos para mejorar la operación.', 'bombilla', 'violeta', true, 4)
ON CONFLICT ("kind", "key") DO UPDATE
SET "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "icon" = EXCLUDED."icon",
    "color" = EXCLUDED."color",
    "sortOrder" = EXCLUDED."sortOrder";
