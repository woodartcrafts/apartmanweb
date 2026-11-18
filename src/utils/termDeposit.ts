// Vadeli mevduat net getiri hesabi (Banka Tanimlari ve mobil banka raporu ortak kullanir).
export function calculateTermDepositSummary(input: {
  principalAmount: number;
  annualInterestRate: number;
  withholdingTaxRate: number;
  startDate: Date;
  endDate: Date;
}): {
  dayCount: number;
  grossInterest: number;
  withholdingAmount: number;
  netInterest: number;
  netMaturityAmount: number;
} {
  const millisInDay = 1000 * 60 * 60 * 24;
  const dayDiff = Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / millisInDay);
  const dayCount = Math.max(1, dayDiff);
  const grossInterest = input.principalAmount * (input.annualInterestRate / 100) * (dayCount / 365);
  const withholdingAmount = grossInterest * (input.withholdingTaxRate / 100);
  const netInterest = grossInterest - withholdingAmount;
  const netMaturityAmount = input.principalAmount + netInterest;

  return {
    dayCount,
    grossInterest: Number(grossInterest.toFixed(2)),
    withholdingAmount: Number(withholdingAmount.toFixed(2)),
    netInterest: Number(netInterest.toFixed(2)),
    netMaturityAmount: Number(netMaturityAmount.toFixed(2)),
  };
}
