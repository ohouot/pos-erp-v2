-- AlterTable
ALTER TABLE "cash_sessions" ADD COLUMN     "closureNumber" INTEGER,
ADD COLUMN     "summary" JSONB;

-- AlterTable
ALTER TABLE "establishments" ADD COLUMN     "nextClosureNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "clientTicketId" TEXT,
ADD COLUMN     "invoiceNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cash_sessions_establishmentId_closureNumber_key" ON "cash_sessions"("establishmentId", "closureNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_establishmentId_invoiceNumber_key" ON "orders"("establishmentId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_establishmentId_clientTicketId_key" ON "orders"("establishmentId", "clientTicketId");

