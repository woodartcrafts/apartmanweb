import { UserRole } from "@prisma/client";

export type JwtPayload = {
  userId: string;
  role: UserRole;
  apartmentId: string | null;
};

export type AuthUser = JwtPayload;
