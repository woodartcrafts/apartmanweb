-- CreateTable
CREATE TABLE "PaymentMethodDefinition" (
    "id" TEXT NOT NULL,
    "code" "PaymentMethod" NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodDefinition_code_key" ON "PaymentMethodDefinition"("code");
