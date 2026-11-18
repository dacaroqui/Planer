-- Baja lógica de una persona. El historial conserva el nombre.
ALTER TABLE "User" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deactivatedById" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_deactivatedById_fkey"
  FOREIGN KEY ("deactivatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
