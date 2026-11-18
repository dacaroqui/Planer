-- Cronología tipada, horas por tarea y la marca de la última entrada pública.
CREATE TYPE "TipoComentario" AS ENUM ('PUBLICA', 'INTERNA', 'REGISTRO', 'SOLICITUD_INFO');

ALTER TABLE "Comment" ADD COLUMN "kind" "TipoComentario" NOT NULL DEFAULT 'PUBLICA';
ALTER TABLE "Comment" ADD COLUMN "minutes" INTEGER;
ALTER TABLE "Comment" ADD COLUMN "tareaId" TEXT;
ALTER TABLE "Comment" ADD COLUMN "compartir" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Comment" SET "kind" = 'INTERNA' WHERE "internal" = true;

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "Tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Comment_tareaId_idx" ON "Comment"("tareaId");
CREATE INDEX "Comment_kind_idx" ON "Comment"("kind");

ALTER TABLE "Tarea" ADD COLUMN "horasEstimadas" DECIMAL(8,2);
ALTER TABLE "Tarea" ADD COLUMN "horasReales" DECIMAL(8,2);

ALTER TABLE "Request" ADD COLUMN "resolutionNote" TEXT;
ALTER TABLE "Request" ADD COLUMN "lastPublicActorId" TEXT;
ALTER TABLE "Request" ADD COLUMN "lastPublicAt" TIMESTAMP(3);

ALTER TABLE "Request" ADD CONSTRAINT "Request_lastPublicActorId_fkey" FOREIGN KEY ("lastPublicActorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Request_lastPublicAt_idx" ON "Request"("lastPublicAt");

UPDATE "Request" AS solicitud
SET "lastPublicActorId" = reciente."authorId",
    "lastPublicAt" = reciente."createdAt"
FROM (
  SELECT DISTINCT ON ("requestId") "requestId", "authorId", "createdAt"
  FROM "Comment"
  WHERE "kind" IN ('PUBLICA', 'SOLICITUD_INFO')
  ORDER BY "requestId", "createdAt" DESC
) AS reciente
WHERE solicitud."id" = reciente."requestId";
