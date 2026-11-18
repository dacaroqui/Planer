-- Prototipo Growth. Solo tablas nuevas y una columna opcional en Tarea.

CREATE TYPE "GrowthEstado" AS ENUM ('BORRADOR', 'REVISION', 'PREPARACION', 'EN_EJECUCION', 'ANALISIS', 'CERRADO');
CREATE TYPE "GrowthDecision" AS ENUM ('ADOPTAR', 'ITERAR', 'DESCARTAR', 'INCONCLUSO');
CREATE TYPE "GrowthFuente" AS ENUM ('MANUAL', 'CRM');

CREATE TABLE "GrowthCiclo" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "ilustrativo" BOOLEAN NOT NULL DEFAULT false,
  "reunion" TEXT NOT NULL DEFAULT '',
  "activo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthCiclo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthEmbudo" (
  "id" TEXT NOT NULL,
  "cicloId" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "fuente" "GrowthFuente" NOT NULL DEFAULT 'MANUAL',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GrowthEmbudo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthEtapa" (
  "id" TEXT NOT NULL,
  "embudoId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "valor" INTEGER NOT NULL,
  "orden" INTEGER NOT NULL,
  "destacado" BOOLEAN NOT NULL DEFAULT false,
  "llamada" TEXT NOT NULL DEFAULT '',
  "subllamada" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "GrowthEtapa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthExperimento" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "cicloId" TEXT NOT NULL,
  "ownerId" TEXT,
  "ownerName" TEXT NOT NULL DEFAULT '',
  "etapaEmbudo" TEXT NOT NULL,
  "estado" "GrowthEstado" NOT NULL DEFAULT 'BORRADOR',
  "decision" "GrowthDecision",
  "metrica" TEXT NOT NULL DEFAULT '',
  "valorInicial" TEXT NOT NULL DEFAULT '',
  "meta" TEXT NOT NULL DEFAULT '',
  "comparacion" TEXT NOT NULL DEFAULT '',
  "duracion" TEXT NOT NULL DEFAULT '',
  "problema" TEXT NOT NULL DEFAULT '',
  "donde" TEXT NOT NULL DEFAULT '',
  "datos" TEXT NOT NULL DEFAULT '',
  "explicacion" TEXT NOT NULL DEFAULT '',
  "referencia" TEXT NOT NULL DEFAULT '',
  "mecanismo" TEXT NOT NULL DEFAULT '',
  "porque" TEXT NOT NULL DEFAULT '',
  "queOcurrio" TEXT NOT NULL DEFAULT '',
  "evidencia" TEXT NOT NULL DEFAULT '',
  "limitaciones" TEXT NOT NULL DEFAULT '',
  "proximaRevision" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GrowthExperimento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthComentario" (
  "id" TEXT NOT NULL,
  "experimentoId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthComentario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthEnlace" (
  "id" TEXT NOT NULL,
  "experimentoId" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthEnlace_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Tarea" ADD COLUMN "experimentoId" TEXT;

CREATE INDEX "GrowthEmbudo_cicloId_brand_idx" ON "GrowthEmbudo"("cicloId", "brand");
CREATE INDEX "GrowthEtapa_embudoId_idx" ON "GrowthEtapa"("embudoId");
CREATE INDEX "GrowthExperimento_cicloId_estado_idx" ON "GrowthExperimento"("cicloId", "estado");
CREATE INDEX "GrowthExperimento_ownerId_idx" ON "GrowthExperimento"("ownerId");
CREATE INDEX "GrowthComentario_experimentoId_idx" ON "GrowthComentario"("experimentoId");
CREATE INDEX "GrowthEnlace_experimentoId_idx" ON "GrowthEnlace"("experimentoId");
CREATE INDEX "Tarea_experimentoId_idx" ON "Tarea"("experimentoId");

ALTER TABLE "GrowthEmbudo" ADD CONSTRAINT "GrowthEmbudo_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "GrowthCiclo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthEtapa" ADD CONSTRAINT "GrowthEtapa_embudoId_fkey" FOREIGN KEY ("embudoId") REFERENCES "GrowthEmbudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthExperimento" ADD CONSTRAINT "GrowthExperimento_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "GrowthCiclo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthExperimento" ADD CONSTRAINT "GrowthExperimento_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GrowthComentario" ADD CONSTRAINT "GrowthComentario_experimentoId_fkey" FOREIGN KEY ("experimentoId") REFERENCES "GrowthExperimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthComentario" ADD CONSTRAINT "GrowthComentario_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GrowthEnlace" ADD CONSTRAINT "GrowthEnlace_experimentoId_fkey" FOREIGN KEY ("experimentoId") REFERENCES "GrowthExperimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_experimentoId_fkey" FOREIGN KEY ("experimentoId") REFERENCES "GrowthExperimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
