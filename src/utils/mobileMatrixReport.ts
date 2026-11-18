import fs from "node:fs";
import path from "node:path";
import { UserRole } from "@prisma/client";
import PDFDocument from "pdfkit";
import { prisma } from "../db";
import { classifyMobileMatrixChargeKind, type MobileMatrixChargeKind } from "./mobileMatrix";

export type MobileMatrixItem = {
  periodYear: number;
  periodMonth: number;
  kind: MobileMatrixChargeKind;
  chargeTypeName: string;
  remaining: number;
};

export type MobileMatrixRow = {
  apartmentId: string;
  blockName: string;
  apartmentDoorNo: string;
  occupant: string;
  overdueTotal: number;
  items: MobileMatrixItem[];
};

export type MobileMatrixReport = {
  snapshotAt: Date;
  /** Sistemdeki en son banka/odeme/gider hareketinin tarihi (veri ne zamana kadar guncel). */
  lastDataAt: Date | null;
  totals: { apartmentCount: number; overdueApartmentCount: number; overdueTotal: number };
  rows: MobileMatrixRow[];
};

// Tum daireler, daire no sirasiyla; vadesi gecmis acik kalemler ay + tur ile.
// "Geciken" tutari matris raporundaki yillik "Geciken" ile ayni kuralla hesaplanir (dueDate <= simdi, kalan > 0).
export async function buildMobileMatrixReport(): Promise<MobileMatrixReport> {
  const snapshotAt = new Date();

  const [apartments, overdueCharges, lastPayment, lastExpense] = await Promise.all([
    prisma.apartment.findMany({
      include: {
        block: { select: { name: true } },
        users: {
          where: { role: UserRole.RESIDENT },
          select: { fullName: true },
          orderBy: [{ fullName: "asc" }],
        },
      },
    }),
    prisma.charge.findMany({
      where: { dueDate: { lte: snapshotAt } },
      select: {
        id: true,
        apartmentId: true,
        periodYear: true,
        periodMonth: true,
        amount: true,
        chargeType: { select: { name: true } },
        paymentItems: { select: { amount: true } },
      },
      orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }, { createdAt: "asc" }],
    }),
    prisma.payment.aggregate({ _max: { paidAt: true } }),
    prisma.expense.aggregate({ _max: { spentAt: true } }),
  ]);

  const itemsByApartmentId = new Map<string, MobileMatrixItem[]>();
  for (const charge of overdueCharges) {
    const paid = charge.paymentItems.reduce((sum, item) => sum + Number(item.amount), 0);
    const remaining = Number((Number(charge.amount) - paid).toFixed(2));
    if (remaining <= 0.0001) {
      continue;
    }
    const list = itemsByApartmentId.get(charge.apartmentId) ?? [];
    list.push({
      periodYear: charge.periodYear,
      periodMonth: charge.periodMonth,
      kind: classifyMobileMatrixChargeKind(charge.chargeType.name),
      chargeTypeName: charge.chargeType.name,
      remaining,
    });
    itemsByApartmentId.set(charge.apartmentId, list);
  }

  const rows: MobileMatrixRow[] = apartments
    .map((apartment) => {
      const residents = apartment.users.map((x) => x.fullName.trim()).filter(Boolean);
      const occupant = residents.length > 0 ? residents.join(", ") : apartment.ownerFullName?.trim() || "-";
      const items = itemsByApartmentId.get(apartment.id) ?? [];
      return {
        apartmentId: apartment.id,
        blockName: apartment.block.name,
        apartmentDoorNo: apartment.doorNo,
        occupant,
        overdueTotal: Number(items.reduce((sum, item) => sum + item.remaining, 0).toFixed(2)),
        items,
      };
    })
    .sort((a, b) => {
      const na = Number.parseInt(a.apartmentDoorNo, 10);
      const nb = Number.parseInt(b.apartmentDoorNo, 10);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return a.apartmentDoorNo.localeCompare(b.apartmentDoorNo, "tr", { numeric: true });
    });

  const candidates = [lastPayment._max.paidAt, lastExpense._max.spentAt].filter((x): x is Date => x instanceof Date);
  const lastDataAt =
    candidates.length > 0 ? new Date(Math.max(...candidates.map((x) => x.getTime()))) : null;

  return {
    snapshotAt,
    lastDataAt,
    totals: {
      apartmentCount: rows.length,
      overdueApartmentCount: rows.filter((row) => row.overdueTotal > 0).length,
      overdueTotal: Number(rows.reduce((sum, row) => sum + row.overdueTotal, 0).toFixed(2)),
    },
    rows,
  };
}

const MONTH_NAMES = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

const KIND_LABEL: Record<MobileMatrixChargeKind, string> = {
  AIDAT: "Aidat",
  DOGALGAZ: "Doğalgaz",
  TADILAT: "Tadilat (Diyafon + Boya)",
  DIGER: "Diğer",
};

const TIME_ZONE = "Europe/Istanbul";
const moneyFormatter = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });

export function formatMobileMatrixDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Turkce karakterler (ğ ş ı İ ...) icin pdfkit'in varsayilan Helvetica'si yetmez; DejaVu Sans repoda tasinir.
function resolveFontPath(fileName: string): string | null {
  const candidates = [
    path.resolve(process.cwd(), "assets", "fonts", fileName),
    path.resolve(__dirname, "..", "..", "assets", "fonts", fileName),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

export function buildMobileMatrixPdf(report: MobileMatrixReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 36, size: "A4", bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const regularPath = resolveFontPath("DejaVuSans.ttf");
      const boldPath = resolveFontPath("DejaVuSans-Bold.ttf");
      const regular = regularPath ? "Body" : "Helvetica";
      const bold = boldPath ? "BodyBold" : "Helvetica-Bold";
      if (regularPath) doc.registerFont("Body", regularPath);
      if (boldPath) doc.registerFont("BodyBold", boldPath);

      const left = doc.page.margins.left;
      const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const bottomLimit = doc.page.height - doc.page.margins.bottom - 14;

      doc.font(bold).fontSize(17).fillColor("#14213d").text("Mobil Matrix Raporu", left, doc.y);
      doc.moveDown(0.3);
      doc
        .font(regular)
        .fontSize(10)
        .fillColor("#444444")
        .text(`Son veri tarihi: ${formatMobileMatrixDate(report.lastDataAt)}`)
        .text(`Rapor oluşturma: ${formatDateTime(report.snapshotAt)}`);
      doc.moveDown(0.6);

      doc
        .font(bold)
        .fontSize(13)
        .fillColor("#c62828")
        .text(`Toplam geciken: ${moneyFormatter.format(report.totals.overdueTotal)}`, left, doc.y, { continued: false });
      doc
        .font(regular)
        .fontSize(9)
        .fillColor("#666666")
        .text(`${report.totals.overdueApartmentCount} borçlu daire / ${report.totals.apartmentCount} daire`);
      doc.moveDown(0.7);

      for (const row of report.rows) {
        const hasDebt = row.overdueTotal > 0.005;
        const blockHeight = 18 + (hasDebt ? row.items.length * 14 + 4 : 0);
        if (doc.y + blockHeight > bottomLimit) {
          doc.addPage();
        }

        const y = doc.y;
        if (hasDebt) {
          doc.rect(left, y, width, 17).fill("#f3f4f6");
        }
        doc
          .font(bold)
          .fontSize(10)
          .fillColor("#14213d")
          .text(`Daire ${row.apartmentDoorNo}`, left + 4, y + 4, { width: 62, lineBreak: false });
        doc
          .font(regular)
          .fontSize(10)
          .fillColor("#222222")
          .text(`${row.occupant} (${row.blockName})`, left + 70, y + 4, { width: width - 190, lineBreak: false, ellipsis: true });
        if (hasDebt) {
          doc
            .font(bold)
            .fillColor("#c62828")
            .text(moneyFormatter.format(row.overdueTotal), left + width - 118, y + 4, {
              width: 114,
              align: "right",
              lineBreak: false,
            });
        } else {
          doc
            .font(regular)
            .fontSize(9)
            .fillColor("#2e7d32")
            .text("Borç yok", left + width - 118, y + 4, { width: 114, align: "right", lineBreak: false });
        }

        let cursor = y + 20;
        if (hasDebt) {
          for (const item of row.items) {
            const month = MONTH_NAMES[item.periodMonth - 1] ?? String(item.periodMonth);
            const label = item.kind === "DIGER" ? item.chargeTypeName : KIND_LABEL[item.kind];
            doc.font(regular).fontSize(9).fillColor("#555555").text(`${month} ${item.periodYear}`, left + 20, cursor, {
              width: 100,
              lineBreak: false,
            });
            doc.fillColor("#222222").text(label, left + 125, cursor, { width: width - 260, lineBreak: false });
            doc.text(moneyFormatter.format(item.remaining), left + width - 118, cursor, {
              width: 114,
              align: "right",
              lineBreak: false,
            });
            cursor += 14;
          }
          cursor += 4;
        }
        doc.y = cursor;
        doc.x = left;
        if (!hasDebt) {
          doc.y = y + 18;
        }
      }

      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        doc
          .font(regular)
          .fontSize(8)
          .fillColor("#888888")
          .text(`Sayfa ${i + 1} / ${range.count}`, left, doc.page.height - doc.page.margins.bottom + 8, {
            width,
            align: "right",
            lineBreak: false,
          });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
