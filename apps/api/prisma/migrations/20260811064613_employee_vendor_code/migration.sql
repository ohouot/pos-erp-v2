-- AlterTable
ALTER TABLE "employee_profiles" ADD COLUMN "vendorCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_establishmentId_vendorCode_key" ON "employee_profiles"("establishmentId", "vendorCode");
