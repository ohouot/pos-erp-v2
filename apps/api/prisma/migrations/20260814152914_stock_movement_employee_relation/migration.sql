-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
