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
  allTimeBalance?: number | null;
  filter: BankStatementViewFilterState;
  setFilter: Dispatch<SetStateAction<BankStatementViewFilterState>>;
  runQuery: () => Promise<void>;
  resetToCurrentMonth: () => Promise<void>;
  loadAllTime: () => Promise<void>;
};

export function BankStatementViewPage({
  loading,
  rows,
  openingBalance,
  totals,
  allTimeBalance,
  filter,
  setFilter,
  runQuery,
  resetToCurrentMonth,
  loadAllTime,
}: BankStatementViewPageProps) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const hasDateFilter = Boolean(filter.from || filter.to);

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

  const displayBalance = hasDateFilter ? totals?.closingBalance : (allTimeBalance ?? totals?.closingBalance);

  return (
    <section className="dashboard report-page bank-statement-view-page">
      <div className="card table-card">
        <div className="section-head">
          <h3>Banka Hareketleri</h3>
          <div className="admin-row">
            <button className="btn btn-primary btn-run" type="button" onClick={() => void runQuery()} disabled={loading}>
              Listele
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void loadAllTime()} disabled={loading}>
              Tum Zamanlar
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void resetToCurrentMonth()} disabled={loading}>
              Bu Ay
            </button>
          </div>
        </div>

        <p className="small">
          Bakiye sutunu sunucuda hesaplanir (ana sayfa ile ayni kurallar). Tarih filtresi yokken guncel banka bakiyesi ana
          sayfadaki ile ayni olmalidir.
        </p>

        {displayBalance != null && !hasDateFilter && (
          <article className="card stat stat-tone-good compact-row-top-gap">
            <h4>Guncel Banka Bakiyesi</h4>
            <p className="reports-home-balance-value">
              <span>{formatTry(displayBalance)}</span>
              <span className="reports-home-balance-match-icon reports-home-balance-match-icon-ok" aria-hidden="true">
                ✔
              </span>
            </p>
            <span className="small">Ana sayfa banka bakiyesi ile karsilastirin</span>
          </article>
        )}

        {totals && (
          <div className="stats-grid compact-row-top-gap bank-statement-totals-grid">
            <article className="card stat stat-tone-good">
              <h4>{hasDateFilter ? "Donem Devir" : "Acilis + Onceki"}</h4>
              <p>{formatTry(totals.startingBalance)}</p>
              <span className="small">Sistem acilis: {formatTry(totals.openingBalance)}</span>
            </article>
            <article className="card stat stat-tone-good">
              <h4>{hasDateFilter ? "Donem Girisi" : "Toplam Giris"}</h4>
              <p>{formatTry(totals.totalIn)}</p>
            </article>
            <article className="card stat stat-tone-warn">
              <h4>{hasDateFilter ? "Donem Cikisi" : "Toplam Cikis"}</h4>
              <p>{formatTry(totals.totalOut)}</p>
            </article>
            <article className={`card stat ${totals.closingBalance >= 0 ? "stat-tone-good" : "stat-tone-danger"}`}>
              <h4>{hasDateFilter ? "Donem Sonu Bakiye" : "Hesaplanan Bakiye"}</h4>
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
              <tr className="bank-statement-devir-row">
                <td>{filter.from || (hasDateFilter ? "-" : "Tum")}</td>
                <td>Devir</td>
                <td className="col-num">-</td>
                <td className="col-num">{formatTry(openingBalance)}</td>
                <td>
                  {hasDateFilter
                    ? "Donem basi devir (acilis + filtreden onceki hareketler)"
                    : "Acilis bakiyesi (hareketler oncesi)"}
                </td>
                <td>-</td>
                <td>Sistem</td>
              </tr>

              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Kayit bulunamadi — Listele veya Tum Zamanlar
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
                    <td className={`col-num ${row.runningBalance < 0 ? "col-num-negative" : ""}`}>
                      {formatTry(row.runningBalance)}
                    </td>
                    <td title={row.description ?? "-"}>{row.description ?? "-"}</td>
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
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
