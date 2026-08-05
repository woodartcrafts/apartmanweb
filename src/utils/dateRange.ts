/**
 * Rapor tarih araligi yardimcilari.
 *
 * Frontend `dateInputToIso` ile bitis tarihini gun basi (UTC 00:00) olarak gonderir.
 * Filtrede dogrudan `lte` kullanilirsa o gune ait saatli kayitlar (ozellikle banka
 * ekstresinden gelenler) rapor disinda kalir. Bu yuzden bitis siniri her zaman
 * "ertesi gunun basi" olarak hesaplanip `lt` ile kullanilmalidir.
 */

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Verilen tarihin icinde bulundugu UTC gununun basi (dahil edilecek alt sinir). */
export function startOfUtcDay(value: string | Date | null | undefined): Date | undefined {
  const parsed = parseDate(value);
  if (!parsed) {
    return undefined;
  }
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

/** Verilen tarihten sonraki UTC gununun basi (haric tutulacak ust sinir). */
export function exclusiveEndOfUtcDay(value: string | Date | null | undefined): Date | undefined {
  const parsed = parseDate(value);
  if (!parsed) {
    return undefined;
  }
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate() + 1));
}

/**
 * Prisma tarih filtresi uretir: `{ gte: gunBasi, lt: ertesiGunBasi }`.
 * Iki sinir da yoksa `undefined` doner, boylece `where` alanina guvenle atanabilir.
 */
export function buildDateRangeFilter(
  from: string | Date | null | undefined,
  to: string | Date | null | undefined
): { gte?: Date; lt?: Date } | undefined {
  const gte = startOfUtcDay(from);
  const lt = exclusiveEndOfUtcDay(to);

  if (!gte && !lt) {
    return undefined;
  }

  return {
    ...(gte ? { gte } : {}),
    ...(lt ? { lt } : {}),
  };
}
