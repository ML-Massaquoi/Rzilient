-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "modelId" TEXT;

-- CreateTable
CREATE TABLE "ItSystem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAccount" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "username" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceModel" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItSystem_name_key" ON "ItSystem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ItSystem_slug_key" ON "ItSystem"("slug");

-- CreateIndex
CREATE INDEX "EmployeeAccount_systemId_idx" ON "EmployeeAccount"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAccount_employeeId_systemId_key" ON "EmployeeAccount"("employeeId", "systemId");

-- CreateIndex
CREATE INDEX "DeviceModel_categoryId_idx" ON "DeviceModel"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceModel_categoryId_brand_name_key" ON "DeviceModel"("categoryId", "brand", "name");

-- CreateIndex
CREATE INDEX "Asset_departmentId_idx" ON "Asset"("departmentId");

-- AddForeignKey
ALTER TABLE "EmployeeAccount" ADD CONSTRAINT "EmployeeAccount_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAccount" ADD CONSTRAINT "EmployeeAccount_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "ItSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceModel" ADD CONSTRAINT "DeviceModel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "DeviceModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
