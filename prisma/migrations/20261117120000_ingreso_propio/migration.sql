ALTER TABLE "User" ADD COLUMN "pendiente" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "failedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);

CREATE TABLE "UsuarioEmpresa" (
    "userId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    CONSTRAINT "UsuarioEmpresa_pkey" PRIMARY KEY ("userId","empresaId")
);

CREATE TABLE "UsuarioArea" (
    "userId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    CONSTRAINT "UsuarioArea_pkey" PRIMARY KEY ("userId","areaId")
);

CREATE TABLE "Invitacion" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SOLICITANTE',
    "areaId" TEXT,
    "areaIds" TEXT NOT NULL DEFAULT '',
    "empresaIds" TEXT NOT NULL DEFAULT '',
    "memberships" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invitacion_tokenHash_key" ON "Invitacion"("tokenHash");
CREATE INDEX "Invitacion_email_idx" ON "Invitacion"("email");

CREATE TABLE "Restablecimiento" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Restablecimiento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Restablecimiento_tokenHash_key" ON "Restablecimiento"("tokenHash");

ALTER TABLE "UsuarioEmpresa" ADD CONSTRAINT "UsuarioEmpresa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsuarioEmpresa" ADD CONSTRAINT "UsuarioEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsuarioArea" ADD CONSTRAINT "UsuarioArea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsuarioArea" ADD CONSTRAINT "UsuarioArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitacion" ADD CONSTRAINT "Invitacion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Restablecimiento" ADD CONSTRAINT "Restablecimiento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
