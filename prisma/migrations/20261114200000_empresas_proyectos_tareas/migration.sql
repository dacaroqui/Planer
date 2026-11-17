-- CreateEnum
CREATE TYPE "EstadoProyecto" AS ENUM ('PLANIFICADO', 'EN_CURSO', 'EN_PAUSA', 'CERRADO');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('PENDIENTE', 'EN_CURSO', 'HECHA');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "exigirProyectoAlClasificar" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Empresa_name_key" ON "Empresa"("name");

INSERT INTO "Empresa" ("id", "name", "active", "exigirProyectoAlClasificar", "createdAt") VALUES
  ('emp_cifes', 'CIFES', true, false, CURRENT_TIMESTAMP),
  ('emp_luvania', 'Luvania', true, false, CURRENT_TIMESTAMP);

ALTER TABLE "Request" ADD COLUMN "empresaId" TEXT;
UPDATE "Request" SET "empresaId" = CASE
  WHEN brand = 'LUVANIA' THEN 'emp_luvania'
  ELSE 'emp_cifes'
END;
ALTER TABLE "Request" ALTER COLUMN "empresaId" SET NOT NULL;
ALTER TABLE "Request" ADD COLUMN "projectId" TEXT;

-- CreateTable
CREATE TABLE "Proyecto" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "leaderId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "targetAt" TIMESTAMP(3) NOT NULL,
    "status" "EstadoProyecto" NOT NULL DEFAULT 'PLANIFICADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "EstadoTarea" NOT NULL DEFAULT 'PENDIENTE',
    "requestId" TEXT,
    "projectId" TEXT,
    "parentId" TEXT,
    "createdById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tarea_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Proyecto_empresaId_idx" ON "Proyecto"("empresaId");
CREATE INDEX "Tarea_requestId_idx" ON "Tarea"("requestId");
CREATE INDEX "Tarea_projectId_idx" ON "Tarea"("projectId");
CREATE INDEX "Request_empresaId_idx" ON "Request"("empresaId");
CREATE INDEX "Request_projectId_idx" ON "Request"("projectId");

ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Tarea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
