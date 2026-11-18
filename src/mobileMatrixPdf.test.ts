import { describe, expect, it } from "vitest";
import { buildMobileMatrixPdf, formatMobileMatrixDate, type MobileMatrixReport } from "./utils/mobileMatrixReport";

const report: MobileMatrixReport = {
  snapshotAt: new Date("2026-11-18T11:00:00Z"),
  lastDataAt: new Date("2026-11-17T13:27:26Z"),
  totals: { apartmentCount: 3, overdueApartmentCount: 1, overdueTotal: 4325 },
  rows: [
    { apartmentId: "a", blockName: "B Blok", apartmentDoorNo: "0", occupant: "Kamil Abi", overdueTotal: 0, items: [] },
    {
      apartmentId: "b",
      blockName: "B Blok",
      apartmentDoorNo: "100",
      occupant: "Şükrü Ğüneş İpek",
      overdueTotal: 4325,
      items: [
        { periodYear: 2026, periodMonth: 10, kind: "AIDAT", chargeTypeName: "Aidat", remaining: 2000 },
        { periodYear: 2026, periodMonth: 10, kind: "TADILAT", chargeTypeName: "Diyafon + Boya", remaining: 1000 },
        { periodYear: 2026, periodMonth: 11, kind: "DOGALGAZ", chargeTypeName: "Doğalgaz", remaining: 1325 },
      ],
    },
    { apartmentId: "c", blockName: "A Blok", apartmentDoorNo: "101", occupant: "Test", overdueTotal: 0, items: [] },
  ],
};

describe("mobil matrix pdf", () => {
  it("gecerli bir PDF uretir", async () => {
    const pdf = await buildMobileMatrixPdf(report);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
  });

  it("son veri tarihini Istanbul gunune gore gg.aa.yyyy yazar", () => {
    expect(formatMobileMatrixDate(report.lastDataAt)).toBe("17.11.2026");
    expect(formatMobileMatrixDate(null)).toBe("-");
  });
});
