import { PaymentMethod } from "@prisma/client";
import { prisma } from "../db";

const defaults: Array<{ code: PaymentMethod; name: string }> = [
  { code: "BANK_TRANSFER", name: "Banka" },
  { code: "CASH", name: "Nakit" },
  { code: "CREDIT_CARD", name: "Kredi Karti" },
  { code: "OTHER", name: "Diger" },
];

async function main() {
  for (const item of defaults) {
    await prisma.paymentMethodDefinition.upsert({
      where: { code: item.code },
      update: { name: item.name, isActive: true },
      create: { code: item.code, name: item.name, isActive: true },
    });
  }

  console.log(`Odeme yontemleri hazir: ${defaults.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
