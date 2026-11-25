-- Fechas y KPI de la actividad. Columnas opcionales. No modifica filas existentes.

ALTER TABLE "Tarea" ADD COLUMN "fechaInicio" TIMESTAMP(3);
ALTER TABLE "Tarea" ADD COLUMN "kpiNombre" TEXT;
ALTER TABLE "Tarea" ADD COLUMN "kpiMeta" DECIMAL(12,2);
ALTER TABLE "Tarea" ADD COLUMN "kpiUnidad" TEXT;
ALTER TABLE "Tarea" ADD COLUMN "kpiActual" DECIMAL(12,2);
