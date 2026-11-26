-- Entregables de un proyecto y el vínculo opcional de una actividad a un entregable o a un KPI.
-- No modifica filas existentes: entregableId y kpiId nacen nulos.

CREATE TABLE "Entregable" (
  "id" TEXT NOT NULL,
  "proyectoId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "fechaCompromiso" TIMESTAMP(3),
  "responsableId" TEXT,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Entregable_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Tarea" ADD COLUMN "entregableId" TEXT;
ALTER TABLE "Tarea" ADD COLUMN "kpiId" TEXT;

CREATE INDEX "Entregable_proyectoId_orden_idx" ON "Entregable"("proyectoId", "orden");
CREATE INDEX "Tarea_entregableId_idx" ON "Tarea"("entregableId");
CREATE INDEX "Tarea_kpiId_idx" ON "Tarea"("kpiId");

ALTER TABLE "Entregable" ADD CONSTRAINT "Entregable_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Entregable" ADD CONSTRAINT "Entregable_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_entregableId_fkey" FOREIGN KEY ("entregableId") REFERENCES "Entregable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
