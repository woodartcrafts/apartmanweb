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

  it("mobil endpointler kendi yetki anahtarlarina baglidir (masaustu raporlardan ayri)", () => {
    expect(mapRequestPathToAdminPage("/reports/apartment-balance-matrix-mobile", "GET")).toBe("REPORTS_MOBILE_MATRIX");
    expect(mapRequestPathToAdminPage("/reports/apartment-balance-matrix-mobile/pdf", "GET")).toBe("REPORTS_MOBILE_MATRIX");
    expect(mapRequestPathToAdminPage("/reports/apartment-balance-matrix-mobile/apartment/abc", "GET")).toBe("REPORTS_MOBILE_MATRIX");
    expect(mapRequestPathToAdminPage("/expenses/mobile-report", "GET")).toBe("EXPENSES_MOBILE_REPORT");
    expect(mapRequestPathToAdminPage("/reports/apartment-balance-matrix", "GET")).toBe("REPORTS_MONTHLY_BALANCE");
    expect(mapRequestPathToAdminPage("/expenses/report", "GET")).toBe("EXPENSES_REPORT_LIST");
  });
});

import { cleanPaymentDescription } from "./utils/mobileMatrixReport";

describe("odeme aciklamasi", () => {
  it("banka aciklamasini teknik etiketlerden ayirir", () => {
    expect(
      cleanPaymentDescription("BANK_REF:ABC | BANK_DESC:FATİH YAZGAN*0125*Öz | DOOR:33 | RECONCILE_LOCK:MANUAL", "BANK_TRANSFER")
    ).toBe("FATİH YAZGAN*0125*Öz");
  });
  it("aciklama yoksa odeme yontemini yazar", () => {
    expect(cleanPaymentDescription(null, "CASH")).toBe("Nakit");
    expect(cleanPaymentDescription("DOOR:5 | AUTO_MATCH:EXACT", "BANK_TRANSFER")).toBe("Banka");
  });
});
