import { describe, expect, it } from "vitest";
import { buildDateRangeFilter, exclusiveEndOfUtcDay, startOfUtcDay } from "./dateRange";

describe("dateRange", () => {
  it("gun basini dondurur", () => {
    expect(startOfUtcDay("2026-08-05T14:37:12.000Z")?.toISOString()).toBe("2026-08-05T00:00:00.000Z");
    expect(startOfUtcDay("2026-08-05T00:00:00.000Z")?.toISOString()).toBe("2026-08-05T00:00:00.000Z");
  });

  it("bitis sinirini ertesi gunun basina tasir", () => {
    expect(exclusiveEndOfUtcDay("2026-08-05T00:00:00.000Z")?.toISOString()).toBe("2026-08-06T00:00:00.000Z");
    expect(exclusiveEndOfUtcDay("2026-08-05T23:59:59.000Z")?.toISOString()).toBe("2026-08-06T00:00:00.000Z");
  });

  it("ay ve yil sonunda dogru gune gecer", () => {
    expect(exclusiveEndOfUtcDay("2026-01-31T00:00:00.000Z")?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(exclusiveEndOfUtcDay("2026-12-31T00:00:00.000Z")?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(exclusiveEndOfUtcDay("2028-02-28T00:00:00.000Z")?.toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });

  it("bos ve gecersiz degerleri yok sayar", () => {
    expect(startOfUtcDay(undefined)).toBeUndefined();
    expect(startOfUtcDay("")).toBeUndefined();
    expect(exclusiveEndOfUtcDay("gecersiz-tarih")).toBeUndefined();
    expect(buildDateRangeFilter(undefined, undefined)).toBeUndefined();
  });

  it("sadece tek sinir verildiginde diger alani eklemez", () => {
    expect(buildDateRangeFilter("2026-08-01T00:00:00.000Z", undefined)).toEqual({
      gte: new Date("2026-08-01T00:00:00.000Z"),
    });
    expect(buildDateRangeFilter(undefined, "2026-08-05T00:00:00.000Z")).toEqual({
      lt: new Date("2026-08-06T00:00:00.000Z"),
    });
  });

  it("bitis gununun saatli kayitlarini araliga dahil eder", () => {
    const filter = buildDateRangeFilter("2026-08-01T00:00:00.000Z", "2026-08-05T00:00:00.000Z")!;
    const bankRowOnLastDay = new Date("2026-08-05T14:30:00.000Z");

    expect(bankRowOnLastDay >= filter.gte!).toBe(true);
    expect(bankRowOnLastDay < filter.lt!).toBe(true);
  });
});
