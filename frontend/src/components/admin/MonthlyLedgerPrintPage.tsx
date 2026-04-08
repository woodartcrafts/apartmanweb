import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  apiBase,
  formatDateTimeTr,
  formatTry,
  type MonthlyLedgerPrintMonth,
  type MonthlyLedgerPrintResponse,
  type MonthlyLedgerPrintRow,
} from "../../app/shared";

const monthLabels = [
  "Ocak",
  "Subat",
  "Mart",
  "Nisan",
  "Mayis",
  "Haziran",
  "Temmuz",
  "Agustos",
  "Eylul",
  "Ekim",
  "Kasim",
  "Aralik",
];

const INCOME_ROWS_PER_PAGE = 52;
const EXPENSE_ROWS_PER_PAGE = 52;

type LedgerRenderRow = MonthlyLedgerPrintRow & {
  seqLabel?: string;
  excludeFromIntermediateTotals?: boolean;
};

function chunkRows<T>(rows: T[], chunkSize: number): T[][] {
  if (rows.length === 0) {
    return [[]];
  }

  const result: T[][] = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    result.push(rows.slice(i, i + chunkSize));
  }
  return result;
}

function sumRows(rows: MonthlyLedgerPrintRow[]): number {
  return rows.reduce((total, row) => total + row.amount, 0);
}

function formatLedgerDateUtc(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function sumIntermediateIncomeRows(rows: LedgerRenderRow[]): number {
  return rows.reduce((total, row) => {
    if (row.excludeFromIntermediateTotals) {
      return total;
    }
    return total + row.amount;
  }, 0);
}

function buildIncomeRows(monthData: MonthlyLedgerPrintMonth, year: number, openingBalance: number): LedgerRenderRow[] {
  if (monthData.month !== 1) {
    return monthData.incomeRows;
  }

  const openingRow: LedgerRenderRow = {
    id: `opening-${year}`,
    seqNo: 0,
    seqLabel: "-",
    excludeFromIntermediateTotals: true,
    date: `${String(year)}-01-01`,
    description: "Banka Bakiyesi Acilis",
    reference: null,
    amount: openingBalance,
  };

  return [openingRow, ...monthData.incomeRows];
}

export function MonthlyLedgerPrintPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Yili secip Defteri Hazirla butonuna basin");
  const [data, setData] = useState<MonthlyLedgerPrintResponse | null>(null);

  const parsedYear = useMemo(() => {
    const value = Number(year);
    if (!Number.isFinite(value)) {
      return null;
    }
    const normalized = Math.trunc(value);
    if (normalized < 2000 || normalized > 2100) {
      return null;
    }
    return normalized;
  }, [year]);

  useEffect(() => {
    document.body.classList.add("ledger-print-mode");
    return () => {
      document.body.classList.remove("ledger-print-mode");
    };
  }, []);

  async function fetchLedger(): Promise<void> {
    if (parsedYear === null) {
      setMessage("Yil bilgisi gecersiz. 2000 - 2100 araliginda bir yil girin.");
      setData(null);
      return;
    }

    setLoading(true);
    setMessage("Defter raporu hazirlaniyor...");

    try {
      const res = await fetch(`${apiBase}/api/admin/reports/monthly-ledger-print?year=${parsedYear}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? "Defter raporu alinamadi");
      }

      const result = (await res.json()) as MonthlyLedgerPrintResponse;
      setData(result);
      setMessage(`Defter raporu hazir. Yil: ${result.criteria.year}`);
    } catch (err) {
      console.error(err);
      setData(null);
      setMessage(err instanceof Error ? err.message : "Defter raporu alinamadi");
    } finally {
      setLoading(false);
    }
  }

  function printPage(): void {
    window.print();
  }

  function exportExcel(): void {
    if (!data) {
      return;
    }

    const workbook = XLSX.utils.book_new();

    data.months.forEach((monthData) => {
      const incomeRows = buildIncomeRows(monthData, data.criteria.year, data.opening.openingBalance);
      const rows: Array<Array<string | number>> = [];

      rows.push([`${monthLabels[monthData.month - 1]} ${data.criteria.year} Gelir-Gider Defteri`]);
      rows.push([]);

      rows.push(["Gelir Tarafi"]);
      rows.push(["Sira No", "Tarih", "Aciklama", "Referans", "Tutar"]);
      incomeRows.forEach((row) => {
        rows.push([
          row.seqLabel ?? row.seqNo,
          formatLedgerDateUtc(row.date),
          row.description,
          row.reference ?? "",
          row.amount,
        ]);
      });
      if (incomeRows.length === 0) {
        rows.push(["", "", "Bu ay gelir kaydi yok", "", 0]);
      }

      rows.push([]);
      rows.push(["Bu Ay Gelir Toplami", "", "", "", monthData.incomeMonthTotal]);
      rows.push(["Onceki Ay/Yil Gelir Toplami", "", "", "", monthData.incomeCarryInTotal]);
      rows.push(["Devreden + Bu Ay Gelir Toplami", "", "", "", monthData.incomeCumulativeTotal]);

      rows.push([]);
      rows.push(["Gider Tarafi"]);
      rows.push(["Sira No", "Tarih", "Aciklama", "Referans", "Tutar"]);
      monthData.expenseRows.forEach((row) => {
        rows.push([
          row.seqNo,
          formatLedgerDateUtc(row.date),
          row.description,
          row.reference ?? "",
          row.amount,
        ]);
      });
      if (monthData.expenseRows.length === 0) {
        rows.push(["", "", "Bu ay gider kaydi yok", "", 0]);
      }

      rows.push([]);
      rows.push(["Bu Ay Gider Toplami", "", "", "", monthData.expenseMonthTotal]);
      rows.push(["Onceki Ay/Yil Gider Toplami", "", "", "", monthData.expenseCarryInTotal]);
      rows.push(["Devreden + Bu Ay Gider Toplami", "", "", "", monthData.expenseCumulativeTotal]);
      rows.push(["Ay Neti (Gelir - Gider)", "", "", "", monthData.monthNet]);
      rows.push(["Ay Sonu Banka Bakiyesi", "", "", "", monthData.closingBankBalance]);

      const sheet = XLSX.utils.aoa_to_sheet(rows);
      sheet["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 60 }, { wch: 34 }, { wch: 18 }];

      const shortYear = String(data.criteria.year).slice(-2);
      const sheetName = `${monthLabels[monthData.month - 1].slice(0, 3)}-${shortYear}`;
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    });

    XLSX.writeFile(workbook, `apartman-defter-${data.criteria.year}.xlsx`);
  }

  return (
    <section className="dashboard report-page ledger-print-page">
      <div className="card table-card report-page-card print-hide">
        <div className="section-head report-toolbar">
          <h3>Apartman Gelir-Gider Defteri (Aylik Print)</h3>
          <div className="admin-row">
            <button className="btn btn-primary btn-run" type="button" onClick={() => void fetchLedger()} disabled={loading}>
              {loading ? "Hazirlaniyor..." : "Defteri Hazirla"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={printPage} disabled={!data}>
              Yazdir
            </button>
            <button className="btn btn-ghost" type="button" onClick={exportExcel} disabled={!data}>
              Excel'e Aktar
            </button>
          </div>
        </div>

        <div className="upload-batch-filter-row compact-row-top-gap report-filter-grid">
          <label>
            Yil
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </label>
        </div>

        <p className="small">{message}</p>
      </div>

      {data && (
        <>
          <div className="card table-card report-page-card ledger-summary-card print-hide">
            <div className="section-head">
              <h3>{data.criteria.year} Defter Ozet</h3>
              <span className="small">Hazirlama zamani: {formatDateTimeTr(data.snapshotAt)}</span>
            </div>
            <div className="stats-grid compact-row-top-gap">
              <article className="card stat stat-tone-info">
                <h4>Banka Bakiyesi Acilis (Donem Basi)</h4>
                <p>{formatTry(data.opening.openingBalance)}</p>
              </article>
              <article className="card stat stat-tone-good">
                <h4>Yillik Gelir Toplami</h4>
                <p>{formatTry(data.totals.incomeYearTotal)}</p>
              </article>
              <article className="card stat stat-tone-warn">
                <h4>Yillik Gider Toplami</h4>
                <p>{formatTry(data.totals.expenseYearTotal)}</p>
              </article>
              <article className={`card stat ${data.totals.yearEndBankBalance >= 0 ? "stat-tone-good" : "stat-tone-danger"}`}>
                <h4>Aralik Sonu Banka Bakiyesi</h4>
                <p>{formatTry(data.totals.yearEndBankBalance)}</p>
              </article>
            </div>
          </div>

          {data.months.map((monthData) => (
            <div key={monthData.month} className="ledger-month-pair">
              {(() => {
                const incomeRows = buildIncomeRows(monthData, data.criteria.year, data.opening.openingBalance);
                const incomePages = chunkRows(incomeRows, INCOME_ROWS_PER_PAGE);
                const expensePages = chunkRows(monthData.expenseRows, EXPENSE_ROWS_PER_PAGE);

                return (
                  <>
                    {incomePages.map((pageRows, pageIndex) => {
                      const isLastIncomePage = pageIndex === incomePages.length - 1;
                      const showIncomePageSubtotal = incomePages.length > 1 && !isLastIncomePage;
                      const pageSubtotal = sumIntermediateIncomeRows(pageRows);
                      const incomeRowsUntilThisPage = incomePages
                        .slice(0, pageIndex + 1)
                        .reduce((total, page) => total + sumIntermediateIncomeRows(page), 0);
                      const incomeCumulativeUntilThisPage = incomeRowsUntilThisPage;

                      return (
                        <article
                          key={`income-${monthData.month}-${pageIndex}`}
                          className="card table-card report-page-card ledger-month-sheet ledger-side-sheet ledger-side-income"
                        >
                          <div className="section-head">
                            <h3>{monthLabels[monthData.month - 1]} {data.criteria.year} - Gelir Tarafi</h3>
                            <span className="small ledger-page-counter">
                              {incomePages.length > 1 ? `Sayfa ${pageIndex + 1}/${incomePages.length}` : ""}
                            </span>
                          </div>

                          <div className="table-wrap compact-row-top-gap">
                            <table className="apartment-list-table report-compact-table ledger-print-table">
                              <thead>
                                <tr>
                                  <th className="col-num">Sira No</th>
                                  <th>Tarih</th>
                                  <th>Aciklama</th>
                                  <th className="col-num">Tutar</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pageRows.map((row) => (
                                  <tr key={row.id}>
                                    <td className="col-num">{row.seqLabel ?? row.seqNo}</td>
                                    <td>{formatLedgerDateUtc(row.date)}</td>
                                    <td>{row.reference ? `${row.description} | Ref: ${row.reference}` : row.description}</td>
                                    <td className="col-num">{formatTry(row.amount)}</td>
                                  </tr>
                                ))}
                                {pageRows.length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="empty">Bu ay gelir kaydi yok</td>
                                  </tr>
                                )}
                              </tbody>
                              <tfoot>
                                {showIncomePageSubtotal && (
                                  <>
                                    <tr>
                                      <td colSpan={3}>{monthLabels[monthData.month - 1]} Gelir Sayfa Toplami</td>
                                      <td className="col-num">{formatTry(pageSubtotal)}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan={3}>{monthLabels[monthData.month - 1]} Bu Tarihe Kadar Kumulatif Toplam</td>
                                      <td className="col-num">{formatTry(incomeCumulativeUntilThisPage)}</td>
                                    </tr>
                                  </>
                                )}
                                {isLastIncomePage && (
                                  <>
                                    <tr>
                                      <td colSpan={3}>{monthLabels[monthData.month - 1]} Bu Ay Gelir Toplami</td>
                                      <td className="col-num">{formatTry(monthData.incomeMonthTotal)}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan={3}>{monthLabels[monthData.month - 1]} Onceki Ay/Yil Gelir Toplami</td>
                                      <td className="col-num">{formatTry(monthData.incomeCarryInTotal)}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan={3}>{monthLabels[monthData.month - 1]} Devreden + Bu Ay Gelir Toplami</td>
                                      <td className="col-num">{formatTry(monthData.incomeCumulativeTotal)}</td>
                                    </tr>
                                  </>
                                )}
                              </tfoot>
                            </table>
                          </div>
                        </article>
                      );
                    })}

                    {expensePages.map((pageRows, pageIndex) => {
                      const isLastExpensePage = pageIndex === expensePages.length - 1;
                      const showExpensePageSubtotal = expensePages.length > 1 && !isLastExpensePage;
                      const pageSubtotal = sumRows(pageRows);
                      const monthEndCumulativeNet = Number(
                        (monthData.incomeCumulativeTotal - monthData.expenseCumulativeTotal).toFixed(2)
                      );
                      const expenseRowsUntilThisPage = expensePages
                        .slice(0, pageIndex + 1)
                        .reduce((total, page) => total + sumRows(page), 0);
                      const expenseCumulativeUntilThisPage = expenseRowsUntilThisPage;

                      return (
                        <article
                          key={`expense-${monthData.month}-${pageIndex}`}
                          className="card table-card report-page-card ledger-month-sheet ledger-side-sheet ledger-side-expense"
                        >
                          <div className="section-head">
                            <h3>{monthLabels[monthData.month - 1]} {data.criteria.year} - Gider Tarafi</h3>
                            <span className="small ledger-page-counter">
                              {expensePages.length > 1 ? `Sayfa ${pageIndex + 1}/${expensePages.length}` : ""}
                            </span>
                          </div>

                          <div className="table-wrap compact-row-top-gap">
                            <table className="apartment-list-table report-compact-table ledger-print-table">
                              <thead>
                                <tr>
                                  <th className="col-num">Sira No</th>
                                  <th>Tarih</th>
                                  <th>Aciklama</th>
                                  <th className="col-num">Tutar</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pageRows.map((row) => (
                                  <tr key={row.id}>
                                    <td className="col-num">{row.seqNo}</td>
                                    <td>{formatLedgerDateUtc(row.date)}</td>
                                    <td>{row.reference ? `${row.description} | Ref: ${row.reference}` : row.description}</td>
                                    <td className="col-num">{formatTry(row.amount)}</td>
                                  </tr>
                                ))}
                                {pageRows.length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="empty">Bu ay gider kaydi yok</td>
                                  </tr>
                                )}
                              </tbody>
                              <tfoot>
                                {showExpensePageSubtotal && (
                                  <>
                                    <tr>
                                      <td colSpan={3}>{monthLabels[monthData.month - 1]} Gider Sayfa Toplami</td>
                                      <td className="col-num">{formatTry(pageSubtotal)}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan={3}>{monthLabels[monthData.month - 1]} Bu Tarihe Kadar Kumulatif Toplam</td>
                                      <td className="col-num">{formatTry(expenseCumulativeUntilThisPage)}</td>
                                    </tr>
                                  </>
                                )}
                                {isLastExpensePage && (
                                  <>
                                    <tr>
                                      <td colSpan={3}>{monthLabels[monthData.month - 1]} Bu Ay Gider Toplami</td>
                                      <td className="col-num">{formatTry(monthData.expenseMonthTotal)}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan={3}>{monthLabels[monthData.month - 1]} Onceki Ay/Yil Gider Toplami</td>
                                      <td className="col-num">{formatTry(monthData.expenseCarryInTotal)}</td>
                                    </tr>
                                    <tr>
                                      <td colSpan={3}>{monthLabels[monthData.month - 1]} Devreden + Bu Ay Gider Toplami</td>
                                      <td className="col-num">{formatTry(monthData.expenseCumulativeTotal)}</td>
                                    </tr>
                                  </>
                                )}
                              </tfoot>
                            </table>
                          </div>

                          {isLastExpensePage && (
                            <div className="ledger-month-net-row">
                              <span>
                                {monthLabels[monthData.month - 1]} Ay Sonu Kumulatif (Gelir - Gider): {formatTry(monthEndCumulativeNet)}
                              </span>
                              <span>{monthLabels[monthData.month - 1]} Ay Neti (Gelir - Gider): {formatTry(monthData.monthNet)}</span>
                              <span>{monthLabels[monthData.month - 1]} Ay Sonu Banka Bakiyesi: {formatTry(monthData.closingBankBalance)}</span>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          ))}
        </>
      )}
    </section>
  );
}
