-- AlterEnum
ALTER TYPE "AttachmentKind" ADD VALUE 'EMPLOYEE_PHOTO';

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "employeeId" TEXT;

-- CreateIndex
CREATE INDEX "Attachment_employeeId_idx" ON "Attachment"("employeeId");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
