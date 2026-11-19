import { describe, expect, it } from "vitest";
import { describeHint, describePartialCharge, describeUnappliedPayment, extractDoorNo, extractPayerName, monthLabel } from "./utils/leftoverNotes";
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
    expect(text).toContain("ödenmeyen 190 ₺");
    expect(text).toContain("18.11.2026");
    expect(text).toContain("NİLÜFER ORHAN");
  });

  it("vadesi gelmemis kalemde eksik demez, onceden odendi der", () => {
    const text = describePartialCharge({
      doorNo: "15",
      typeName: "Aidat",
      year: 2026,
      month: 12,
      amount: 2000,
      paid: 25,
      lastPaidAt: new Date("2026-11-17T00:00:00Z"),
      payer: null,
      dueDate: new Date("2026-12-31T00:00:00Z"),
      now: new Date("2026-11-19T00:00:00Z"),
    });
    expect(text).toContain("önceden ödendi");
    expect(text).not.toContain("ödenmeyen");
  });

  it("onay bekleyen ve fazla gelen odemeyi ayirir", () => {
    const base = { doorNo: "81", paidAt: new Date("2026-11-17T00:00:00Z"), total: 11325, unapplied: 11325, payer: null, noOpenDebt: false };
    expect(describeUnappliedPayment({ ...base, pendingApproval: true })).toContain("onayını bekliyor");
    const fazla = describeUnappliedPayment({ ...base, pendingApproval: false, unapplied: 1300 });
    expect(fazla).toContain("1.300 ₺ artakaldı");
    expect(fazla).toContain("otomatik olarak ona yazılır");
  });

  it("elle duzenlenmis fazla odeme icin kendiliginden dusmeyecegini soyler", () => {
    const base = { doorNo: "4", paidAt: new Date("2026-08-16T00:00:00Z"), total: 3400, unapplied: 1300, payer: null, noOpenDebt: false, pendingApproval: false };
    expect(describeUnappliedPayment({ ...base, manualLock: true })).toContain("kendiliğinden yazılmaz");
    expect(describeHint("FAZLA", true)).toContain("iade");
    expect(describeHint("FAZLA", false)).toContain("kendiliğinden düşer");
    expect(describeHint("ILERI", false)).toContain("gerek yok");
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
