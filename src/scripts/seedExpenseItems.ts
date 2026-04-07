import { prisma } from "../db";

const defaults = [
  { code: "MAAS", name: "Maas" },
  { code: "SGK", name: "SGK" },
  { code: "DOGALGAZ", name: "Dogalgaz" },
  { code: "ELEKTRIK", name: "Elektrik" },
  { code: "SU", name: "Su" },
  { code: "SINIFLANDIRILAMAYAN_GIDERLER", name: "Siniflandirilamayan Giderler" },
];

async function main() {
  for (const item of defaults) {
    await prisma.expenseItemDefinition.upsert({
      where: { code: item.code },
      update: { name: item.name, isActive: true },
      create: { code: item.code, name: item.name, isActive: true },
    });
  }

  console.log(`Gider kalemleri hazir: ${defaults.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
