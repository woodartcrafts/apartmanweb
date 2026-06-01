import { useMemo, type Dispatch, type SetStateAction } from "react";
import { formatDateTr, formatTry, type BankReconciliationRow } from "../../app/shared";

type BankStatementViewFilterState = {
  from: string;
  to: string;
};

type BankStatementViewTotals = {
  totalIn: number;
  totalOut: number;
  net: number;
  openingBalance: number;
  startingBalance: number;
  closingBalance: number;
};

type BankStatementViewPageProps = {
  loading: boolean;
  rows?: BankReconciliationRow[];
  openingBalance: number;
  totals?: BankStatementViewTotals | null;
  filter: BankStatementViewFilterState;
  setFilter: Dispatch<SetStateAction<BankStatementViewFilterState>>;
  runQuery: () => Promise<void>;
  resetToCurrentMonth: () => Promise<void>;
};

export function BankStatementViewPage({
  loading,
  rows,
  openingBalance,
  totals,
  filter,
  setFilter,
  runQuery,
  resetToCurrentMonth,
}: BankStatementViewPageProps) {
  const safeRows = Array.isArray(rows) ? rows : [];

  const sortedRows = useMemo(
    () =>
      [...safeRows].sort((a, b) => {
        const dateCompare = new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
        if (dateCompare !== 0) {
          return dateCompare;
        }

        const typeCompare = b.entryType.localeCompare(a.entryType, "tr", { sensitivity: "base" });
        if (typeCompare !== 0) {
          return typeCompare;
        }

        return (b.description ?? "").localeCompare(a.description ?? "", "tr", { sensitivity: "base" });
      }),
    [safeRows]
  );

  const balanceByRowId = useMemo(() => {
    const byId = new Map<string, number>();
    const rowsByDateAsc = [...safeRows].sort((a, b) => {
      const dateCompare = new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return a.id.localeCompare(b.id, "tr", { sensitivity: "base" });
    });

    let runningBalance = Number(openingBalance);
    for (const row of rowsByDateAsc) {
      const signedAmount = row.entryType === "IN" ? Number(row.amount) : -Number(row.amount);
      runningBalance += signedAmount;
      byId.set(row.id, runningBalance);
    }

    return byId;
  }, [safeRows, openingBalance]);

  return (
    <section className="dashboard report-page bank-statement-view-page">
      <div className="card table-card">
        <div className="section-head">
          <h3>Banka Hareketleri</h3>
          <div className="admin-row">
            <button className="btn btn-primary btn-run" type="button" onClick={() => void runQuery()} disabled={loading}>
              Listele
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void resetToCurrentMonth()} disabled={loading}>
              Temizle
            </button>
          </div>
        </div>

        <p className="small">
          Sistemdeki banka hareketleri listelenir. Bakiye sutunu donem devirinden itibaren kumulatif hesaplanir (ana sayfa ile
          ayni kurallar: acilis + giris - gider, vadeli kapama giderleri haric).
        </p>

        {totals && (
          <div className="stats-grid compact-row-top-gap bank-statement-totals-grid">
            <article className="card stat stat-tone-good">
              <h4>Donem Devir</h4>
              <p>{formatTry(totals.startingBalance)}</p>
              <span className="small">Sistem acilis: {formatTry(totals.openingBalance)}</span>
            </article>
            <article className="card stat stat-tone-good">
              <h4>Donem Girisi</h4>
              <p>{formatTry(totals.totalIn)}</p>
            </article>
            <article className="card stat stat-tone-warn">
              <h4>Donem Cikisi</h4>
              <p>{formatTry(totals.totalOut)}</p>
            </article>
            <article className={`card stat ${totals.closingBalance >= 0 ? "stat-tone-good" : "stat-tone-danger"}`}>
              <h4>Donem Sonu Bakiye</h4>
              <p>{formatTry(totals.closingBalance)}</p>
              <span className="small">Devir + giris - cikis</span>
            </article>
          </div>
        )}

        <div className="upload-batch-filter-row bank-statement-filter-row compact-row-top-gap">
          <label className="bank-statement-filter-inline">
            <span>Baslangic Tarihi</span>
            <input
              type="date"
              value={filter.from}
              onChange={(e) => setFilter((prev) => ({ ...prev, from: e.target.value }))}
            />
          </label>
          <label className="bank-statement-filter-inline">
            <span>Bitis Tarihi</span>
            <input
              type="date"
              value={filter.to}
              onChange={(e) => setFilter((prev) => ({ ...prev, to: e.target.value }))}
            />
          </label>
        </div>

        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table bank-statement-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tip</th>
                <th className="col-num">Tutar</th>
                <th className="col-num">Bakiye</th>
                <th>Aciklama</th>
                <th>Referans</th>
                <th>Kaynak</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Kayit bulunamadi
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTr(row.occurredAt)}</td>
                    <td>{row.entryType === "IN" ? "Giris" : "Cikis"}</td>
                    <td className={`col-num ${row.entryType === "OUT" ? "col-num-negative" : ""}`}>
                      {row.entryType === "OUT" ? "-" : ""}
                      {formatTry(row.amount)}
                    </td>
                    <td className={`col-num ${(balanceByRowId.get(row.id) ?? 0) < 0 ? "col-num-negative" : ""}`}>
                      {formatTry(balanceByRowId.get(row.id) ?? 0)}
                    </td>
                    <td title={row.description ?? "-"}>
                      {row.description ?? "-"}
                    </td>
                    <td className="bank-statement-cell-reference" title={row.reference ?? "-"}>
                      {row.reference ?? "-"}
                    </td>
                    <td
                      className="bank-statement-cell-source"
                      title={
                        row.source === "BANK_STATEMENT_UPLOAD"
                          ? `Banka Upload${row.fileName ? ` (${row.fileName})` : ""}`
                          : row.source === "PAYMENT_UPLOAD"
                            ? "Toplu Odeme Upload"
                            : "Manuel"
                      }
                    >
                      {row.source === "BANK_STATEMENT_UPLOAD"
                        ? `Banka Upload${row.fileName ? ` (${row.fileName})` : ""}`
                        : row.source === "PAYMENT_UPLOAD"
                          ? "Toplu Odeme Upload"
                          : "Manuel"}
                    </td>
                  </tr>
                ))
              )}

              <tr className="bank-statement-devir-row">
                <td>{filter.from || "-"}</td>
                <td>Devir</td>
                <td className="col-num">-</td>
                <td className="col-num">{formatTry(openingBalance)}</td>
                <td>Donem basi devir bakiyesi (acilis + onceki hareketler)</td>
                <td>-</td>
                <td>Sistem</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}