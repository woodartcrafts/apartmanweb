export type MobileMatrixChargeKind = "AIDAT" | "DOGALGAZ" | "TADILAT" | "DIGER";

// Mobil Matrix Raporu: tahakkuk turu adini rapordaki uc ana basliga ayirir.
export function classifyMobileMatrixChargeKind(chargeTypeName: string): MobileMatrixChargeKind {
  const name = chargeTypeName.toLocaleLowerCase("tr");
  if (name.includes("aidat")) return "AIDAT";
  if (name.includes("gaz")) return "DOGALGAZ";
  if (name.includes("diyafon") || name.includes("boya") || name.includes("tadilat")) return "TADILAT";
  return "DIGER";
}
