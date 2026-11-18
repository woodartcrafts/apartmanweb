import { prisma } from "../db";
import { computeOperatingBankBalanceSnapshot } from "./operatingBankBalance";
import { getMobileMatrixLastDataAt } from "./mobileMatrixReport";
import { calculateTermDepositSummary } from "./termDeposit";

export type MobileBankDeposit = {
  id: string;
  bankName: string;
  branchName: string | null;
  principalAmount: number;
  annualInterestRate: number;
  startDate: Date;
  endDate: Date;
  /** Vadeye kalan gun (vade gecmisse 0). */
  daysLeft: number;
  matured: boolean;
  netInterest: number;
  netMaturityAmount: number;
  notes: string | null;
};

export type MobileBankReport = {
  snapshotAt: Date;
  lastDataAt: Date | null;
  /** Vadesiz banka bakiyesi (Raporlar ozetindeki "Banka bakiyesi" ile ayni hesap). */
  bankBalance: number;
  deposits: MobileBankDeposit[];
  /** depositPrincipal / depositNetMaturity yalnizca vadesi dolmamis kayitlari kapsar. */
  totals: {
    depositPrincipal: number;
    depositNetMaturity: number;
    /** Vadesiz bakiye + vadeli anapara. */
    grandTotal: number;
  };
};

const MILLIS_IN_DAY = 24 * 60 * 60 * 1000;

export async function buildMobileBankReport(): Promise<MobileBankReport> {
  const snapshotAt = new Date();
  const [snapshot, depositRows, lastDataAt] = await Promise.all([
    computeOperatingBankBalanceSnapshot(),
    prisma.bankTermDeposit.findMany({
      where: { isActive: true },
      include: { bank: { select: { name: true } }, branch: { select: { name: true } } },
      orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
    }),
    getMobileMatrixLastDataAt(),
  ]);

  const deposits: MobileBankDeposit[] = depositRows.map((row) => {
    const principalAmount = Number(row.principalAmount);
    const annualInterestRate = Number(row.annualInterestRate);
    const summary = calculateTermDepositSummary({
      principalAmount,
      annualInterestRate,
      withholdingTaxRate: Number(row.withholdingTaxRate),
      startDate: row.startDate,
      endDate: row.endDate,
    });
    const diff = row.endDate.getTime() - snapshotAt.getTime();
    return {
      id: row.id,
      bankName: row.bank.name,
      branchName: row.branch?.name ?? null,
      principalAmount,
      annualInterestRate,
      startDate: row.startDate,
      endDate: row.endDate,
      daysLeft: diff > 0 ? Math.ceil(diff / MILLIS_IN_DAY) : 0,
      matured: diff <= 0,
      netInterest: summary.netInterest,
      netMaturityAmount: summary.netMaturityAmount,
      notes: row.notes,
    };
  });

  const bankBalance = Number(snapshot.estimatedBalance.toFixed(2));
  // Vadesi dolmus kayitlar toplama dahil edilmez: bankada kapanip vadesiz bakiyeye gecmis olabilir
  // (cifte sayimi onlemek icin ayri listelenir).
  const openDeposits = deposits.filter((d) => !d.matured);
  const depositPrincipal = Number(openDeposits.reduce((sum, d) => sum + d.principalAmount, 0).toFixed(2));
  const depositNetMaturity = Number(openDeposits.reduce((sum, d) => sum + d.netMaturityAmount, 0).toFixed(2));

  return {
    snapshotAt,
    lastDataAt,
    bankBalance,
    deposits,
    totals: {
      depositPrincipal,
      depositNetMaturity,
      grandTotal: Number((bankBalance + depositPrincipal).toFixed(2)),
    },
  };
}
