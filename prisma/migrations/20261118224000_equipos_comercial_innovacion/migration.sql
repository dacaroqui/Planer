-- AlterEnum
ALTER TYPE "Team" ADD VALUE 'COMERCIAL';
ALTER TYPE "Team" ADD VALUE 'INNOVACION';

-- AlterTable
ALTER TABLE "Proyecto" ADD COLUMN "team" "Team";
