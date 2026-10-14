-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssetTransactionAction" ADD VALUE 'COMPONENT_ADDED';
ALTER TYPE "AssetTransactionAction" ADD VALUE 'COMPONENT_REMOVED';

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Asset_parentId_idx" ON "Asset"("parentId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
