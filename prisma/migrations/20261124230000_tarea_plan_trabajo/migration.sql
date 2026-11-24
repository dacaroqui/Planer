-- Plan de trabajo. Columnas opcionales en Tarea. No inserta ni modifica filas.

ALTER TABLE "Tarea" ADD COLUMN "participantes" TEXT;
ALTER TABLE "Tarea" ADD COLUMN "bloqueo" TEXT;
ALTER TABLE "Tarea" ADD COLUMN "notaRol" TEXT;
