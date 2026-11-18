import { describe, expect, it } from "vitest";
import { classifyMobileMatrixChargeKind } from "./utils/mobileMatrix";
import { mapRequestPathToAdminPage } from "./utils/adminPermissions";

describe("mobil matrix raporu", () => {
  it("tahakkuk turunu uc ana basliga ayirir", () => {
    expect(classifyMobileMatrixChargeKind("Aidat")).toBe("AIDAT");
    expect(classifyMobileMatrixChargeKind("Doğalgaz")).toBe("DOGALGAZ");
    expect(classifyMobileMatrixChargeKind("Diyafon + Boya")).toBe("TADILAT");
    expect(classifyMobileMatrixChargeKind("Su")).toBe("DIGER");
  });

  it("endpoint matris raporu yetkisine baglidir", () => {
    expect(mapRequestPathToAdminPage("/reports/apartment-balance-matrix-mobile", "GET")).toBe("REPORTS_MONTHLY_BALANCE");
  });
});
