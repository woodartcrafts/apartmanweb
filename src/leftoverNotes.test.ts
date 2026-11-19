import { describe, expect, it } from "vitest";
import { describePartialCharge, describeUnappliedPayment, extractDoorNo, extractPayerName, monthLabel } from "./utils/leftoverNotes";
import { mapRequestPathToAdminPage } from "./utils/adminPermissions";

describe("leftoverNotes", () => {
  it("eksik kalan kalemi sade cumleyle anlatir", () => {
    const text = describePartialCharge({
      doorNo: "80",
      typeName: "Doğalgaz",
      year: 2026,
      month: 11,
      amount: 1325,
      paid: 1135,
      lastPaidAt: new Date("2026-11-18T00:00:00Z"),
      payer: "NİLÜFER ORHAN",
    });
    expect(text).toContain("Daire 80");
    expect(text).toContain("190 ₺ EKSIK");
    expect(text).toContain("18.11.2026");
    expect(text).toContain("NİLÜFER ORHAN");
  });

  it("onay bekleyen ve fazla gelen odemeyi ayirir", () => {
    const base = { doorNo: "81", paidAt: new Date("2026-11-17T00:00:00Z"), total: 11325, unapplied: 11325, payer: null, noOpenDebt: false };
    expect(describeUnappliedPayment({ ...base, pendingApproval: true })).toContain("ONAY BEKLIYOR");
    expect(describeUnappliedPayment({ ...base, pendingApproval: false, unapplied: 1300 })).toContain("1.300 ₺ FAZLA");
  });

  it("not etiketlerinden daire ve odeyen adini okur", () => {
    const note = "BANK_REF:X | BANK_DESC:ÜMRAN ELİFOĞLU*0067*aidat | DOOR:47 | AUTO_MATCH:Y";
    expect(extractDoorNo(note)).toBe("47");
    expect(extractPayerName(note)).toBe("ÜMRAN ELİFOĞLU");
    expect(extractPayerName("BANK_DESC:81*MUSTAFA")).toBeNull();
    expect(monthLabel(2026, 11)).toBe("Kasim 2026");
  });

  it("yeni rota kendi yetki anahtarina baglanir", () => {
    expect(mapRequestPathToAdminPage("/reports/leftover-notes", "GET")).toBe("CONTROL_LEFTOVER_NOTES");
  });
});
