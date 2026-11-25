-- Orden persistente de cada actividad. El valor inicial sigue la fecha de inicio y, si no hay, la fecha de creación.

ALTER TABLE "Tarea" ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;

WITH ordenadas AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "projectId", "parentId"
           ORDER BY "fechaInicio" ASC NULLS LAST, "createdAt" ASC
         ) - 1 AS n
  FROM "Tarea"
)
UPDATE "Tarea" AS t
SET "orden" = ordenadas.n
FROM ordenadas
WHERE t."id" = ordenadas."id";

CREATE INDEX "Tarea_projectId_orden_idx" ON "Tarea"("projectId", "orden");
