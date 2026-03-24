import { prisma } from "../db";

const defaults = [
  { code: "AIDAT", name: "Aidat" },
  { code: "DEMIRBAS", name: "Demirbas" },
  { code: "SU", name: "Su" },
  { code: "ELEKTRIK", name: "Elektrik" },
  { code: "DIGER", name: "Diger" },
];

async function main() {
  for (const item of defaults) {
    await prisma.chargeTypeDefinition.upsert({
      where: { code: item.code },
      update: { name: item.name, isActive: true },
      create: { code: item.code, name: item.name, isActive: true },
    });
  }

  console.log(`Tahakkuk tipleri hazir: ${defaults.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
