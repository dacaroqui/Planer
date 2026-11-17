/*
  Warnings:

  - You are about to drop the column `requiresApproval` on the `RequestType` table. All the data in the column will be lost.
  - You are about to drop the column `slaMinutes` on the `RequestType` table. All the data in the column will be lost.
  - You are about to drop the `Sequence` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `prioritySuggested` to the `Request` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `brand` on the `Request` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `priority` on the `Request` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "field" TEXT;

-- AlterTable
ALTER TABLE "Area" ADD COLUMN     "allowSelfAssign" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "adjustmentRounds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "channels" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "committedDate" TIMESTAMP(3),
ADD COLUMN     "declaresNoPersonalData" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveryUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "firstResponseDueAt" TIMESTAMP(3),
ADD COLUMN     "firstResponseMet" BOOLEAN,
ADD COLUMN     "firstResponseMinutes" INTEGER NOT NULL DEFAULT 240,
ADD COLUMN     "firstResponseStoppedAt" TIMESTAMP(3),
ADD COLUMN     "justification" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "moduleName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "previousStatus" TEXT,
ADD COLUMN     "prioritySuggested" TEXT NOT NULL,
ADD COLUMN     "publishAt" TIMESTAMP(3),
ADD COLUMN     "resolutionMinutes" INTEGER NOT NULL DEFAULT 1440,
ADD COLUMN     "stepsToReproduce" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "expectedResult" SET DEFAULT '',
DROP COLUMN "brand",
ADD COLUMN     "brand" TEXT NOT NULL,
DROP COLUMN "priority",
ADD COLUMN     "priority" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RequestType" DROP COLUMN "requiresApproval",
DROP COLUMN "slaMinutes",
ADD COLUMN     "extra" TEXT NOT NULL DEFAULT '';

-- DropTable
DROP TABLE "Sequence";

-- DropEnum
DROP TYPE "Brand";

-- DropEnum
DROP TYPE "Priority";

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "team" "Team" NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "AreaRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeSequence" (
    "prefix" TEXT NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CodeSequence_pkey" PRIMARY KEY ("prefix")
);

-- CreateTable
CREATE TABLE "WorkflowState" (
    "id" TEXT NOT NULL,
    "team" "Team" NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "boardColumn" TEXT NOT NULL,
    "hiddenOnBoard" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WorkflowState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTransition" (
    "id" TEXT NOT NULL,
    "team" "Team" NOT NULL,
    "name" TEXT NOT NULL,
    "fromKeys" TEXT NOT NULL,
    "toKey" TEXT NOT NULL,
    "allowedRoles" TEXT NOT NULL,
    "requiresComment" BOOLEAN NOT NULL DEFAULT false,
    "requiresAssignee" BOOLEAN NOT NULL DEFAULT false,
    "requiresCommittedDate" BOOLEAN NOT NULL DEFAULT false,
    "requiresDelivery" BOOLEAN NOT NULL DEFAULT false,
    "slaEffect" TEXT NOT NULL DEFAULT 'NONE',
    "resolution" TEXT NOT NULL DEFAULT '',
    "clearResolution" BOOLEAN NOT NULL DEFAULT false,
    "incrementRounds" BOOLEAN NOT NULL DEFAULT false,
    "toPrevious" BOOLEAN NOT NULL DEFAULT false,
    "reopenWithinDays" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WorkflowTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaPolicy" (
    "id" TEXT NOT NULL,
    "team" "Team" NOT NULL,
    "typeId" TEXT,
    "priority" TEXT NOT NULL,
    "firstResponseMinutes" INTEGER NOT NULL,
    "resolutionMinutes" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SlaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "fromValue" TEXT,
    "toValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_kind_key_key" ON "CatalogItem"("kind", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AreaRole_userId_team_role_key" ON "AreaRole"("userId", "team", "role");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowState_team_key_key" ON "WorkflowState"("team", "key");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowTransition_team_name_fromKeys_toKey_key" ON "WorkflowTransition"("team", "name", "fromKeys", "toKey");

-- CreateIndex
CREATE UNIQUE INDEX "SlaPolicy_team_typeId_priority_key" ON "SlaPolicy"("team", "typeId", "priority");

-- CreateIndex
CREATE INDEX "AuditLog_entity_createdAt_idx" ON "AuditLog"("entity", "createdAt");

-- AddForeignKey
ALTER TABLE "AreaRole" ADD CONSTRAINT "AreaRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaPolicy" ADD CONSTRAINT "SlaPolicy_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "RequestType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
