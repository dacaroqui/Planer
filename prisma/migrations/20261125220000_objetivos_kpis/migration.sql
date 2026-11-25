-- Objetivos, KPIs y fases. Solo estructuras nuevas y columnas opcionales.

CREATE TYPE "ObjetivoEstado" AS ENUM ('ABIERTO', 'EN_CURSO', 'CERRADO');
CREATE TYPE "KpiFrecuencia" AS ENUM ('SEMANAL', 'QUINCENAL', 'MENSUAL');
CREATE TYPE "KpiTipo" AS ENUM ('PRINCIPAL', 'APOYO');
CREATE TYPE "KpiEstadoMeta" AS ENUM ('EN_LINEA_BASE', 'PROPUESTA', 'APROBADA');

CREATE TABLE "Objetivo" (
  "id" TEXT NOT NULL,
  "marca" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL DEFAULT '',
  "area" "Team" NOT NULL,
  "duenoId" TEXT NOT NULL,
  "periodoInicio" TIMESTAMP(3) NOT NULL,
  "periodoFin" TIMESTAMP(3) NOT NULL,
  "costoTope" DECIMAL(12,2),
  "estado" "ObjetivoEstado" NOT NULL DEFAULT 'ABIERTO',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Objetivo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Kpi" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL DEFAULT '',
  "unidad" TEXT NOT NULL DEFAULT '',
  "lineaBase" DECIMAL(12,2),
  "meta" DECIMAL(12,2),
  "actual" DECIMAL(12,2),
  "fuente" TEXT NOT NULL DEFAULT '',
  "frecuencia" "KpiFrecuencia" NOT NULL DEFAULT 'MENSUAL',
  "tipo" "KpiTipo" NOT NULL DEFAULT 'APOYO',
  "estadoMeta" "KpiEstadoMeta" NOT NULL DEFAULT 'EN_LINEA_BASE',
  "bloqueado" BOOLEAN NOT NULL DEFAULT false,
  "motivoBloqueo" TEXT NOT NULL DEFAULT '',
  "objetivoId" TEXT,
  "area" "Team",
  "personaId" TEXT,
  "apoyaId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Kpi_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpiMedicion" (
  "id" TEXT NOT NULL,
  "kpiId" TEXT NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL,
  "valor" DECIMAL(12,2) NOT NULL,
  "nota" TEXT NOT NULL DEFAULT '',
  "registradoPorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KpiMedicion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FaseArea" (
  "id" TEXT NOT NULL,
  "team" "Team" NOT NULL,
  "nombre" TEXT NOT NULL,
  "orden" INTEGER NOT NULL,
  CONSTRAINT "FaseArea_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Proyecto" ADD COLUMN "objetivoId" TEXT;
ALTER TABLE "Proyecto" ADD COLUMN "medio" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Proyecto" ADD COLUMN "fase" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Proyecto" ADD COLUMN "costo" DECIMAL(12,2);
ALTER TABLE "Tarea" ADD COLUMN "costo" DECIMAL(12,2);
ALTER TABLE "GrowthExperimento" ADD COLUMN "objetivoId" TEXT;
ALTER TABLE "GrowthExperimento" ADD COLUMN "kpiId" TEXT;

CREATE UNIQUE INDEX "FaseArea_team_nombre_key" ON "FaseArea"("team", "nombre");
CREATE INDEX "Objetivo_area_marca_idx" ON "Objetivo"("area", "marca");
CREATE INDEX "Objetivo_duenoId_idx" ON "Objetivo"("duenoId");
CREATE INDEX "Kpi_objetivoId_idx" ON "Kpi"("objetivoId");
CREATE INDEX "Kpi_area_idx" ON "Kpi"("area");
CREATE INDEX "Kpi_personaId_idx" ON "Kpi"("personaId");
CREATE INDEX "KpiMedicion_kpiId_fecha_idx" ON "KpiMedicion"("kpiId", "fecha");
CREATE INDEX "Proyecto_objetivoId_idx" ON "Proyecto"("objetivoId");
CREATE INDEX "GrowthExperimento_objetivoId_idx" ON "GrowthExperimento"("objetivoId");
CREATE INDEX "GrowthExperimento_kpiId_idx" ON "GrowthExperimento"("kpiId");

ALTER TABLE "Objetivo" ADD CONSTRAINT "Objetivo_duenoId_fkey" FOREIGN KEY ("duenoId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_objetivoId_fkey" FOREIGN KEY ("objetivoId") REFERENCES "Objetivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_apoyaId_fkey" FOREIGN KEY ("apoyaId") REFERENCES "Kpi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KpiMedicion" ADD CONSTRAINT "KpiMedicion_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KpiMedicion" ADD CONSTRAINT "KpiMedicion_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_objetivoId_fkey" FOREIGN KEY ("objetivoId") REFERENCES "Objetivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GrowthExperimento" ADD CONSTRAINT "GrowthExperimento_objetivoId_fkey" FOREIGN KEY ("objetivoId") REFERENCES "Objetivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GrowthExperimento" ADD CONSTRAINT "GrowthExperimento_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "Kpi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
