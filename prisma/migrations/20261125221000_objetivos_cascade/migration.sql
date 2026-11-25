-- Borrar un usuario arrastra sus objetivos y mediciones. No borra otras filas.

ALTER TABLE "Objetivo" DROP CONSTRAINT "Objetivo_duenoId_fkey";
ALTER TABLE "Objetivo" ADD CONSTRAINT "Objetivo_duenoId_fkey" FOREIGN KEY ("duenoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KpiMedicion" DROP CONSTRAINT "KpiMedicion_registradoPorId_fkey";
ALTER TABLE "KpiMedicion" ADD CONSTRAINT "KpiMedicion_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
