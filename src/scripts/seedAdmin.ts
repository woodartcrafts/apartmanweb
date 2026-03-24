import bcrypt from "bcryptjs";
import { PasswordChangeReason, UserRole } from "@prisma/client";
import { prisma } from "../db";

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@apartman.local";
  const password = process.env.ADMIN_PASSWORD ?? "Admin123!";
  const fullName = process.env.ADMIN_FULLNAME ?? "Site Yonetici";

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { fullName, passwordHash, passwordPlaintext: password, role: UserRole.ADMIN },
    create: {
      email,
      fullName,
      passwordHash,
      passwordPlaintext: password,
      role: UserRole.ADMIN,
    },
  });

  const latestHistory = await prisma.userPasswordHistory.findFirst({
    where: { userId: admin.id },
    orderBy: [{ changedAt: "desc" }],
    select: { id: true, passwordHash: true },
  });

  if (!latestHistory || latestHistory.passwordHash !== passwordHash) {
    await prisma.userPasswordHistory.create({
      data: {
        userId: admin.id,
        changedByUserId: null,
        passwordHash,
        passwordPlaintext: password,
        reason: PasswordChangeReason.INITIAL_SEED,
      },
    });
  }

  console.log("Admin hazir:", { id: admin.id, email: admin.email });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
