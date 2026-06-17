import { type Dispatch, type SetStateAction } from "react";
import { formatDateTr, formatTry, type BankReconciliationRow } from "../../app/shared";

type BankStatementViewFilterState = {
  from: string;
  to: string;
};

type BankStatementViewPageProps = {
  loading: boolean;
  rows?: BankReconciliationRow[];
  openingBalance: number;
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
  filter,
  setFilter,
  runQuery,
  resetToCurrentMonth,
  loadAllTime,
}: BankStatementViewPageProps) {
  const safeRows = Array.isArray(rows) ? rows : [];

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
              Bu Ay
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void loadAllTime()} disabled={loading}>
              Tum Zamanlar
            </button>
          </div>
        </div>

        <p className="small">
          Hareketler yeniden eskiye (Z→A) siralanir. Bakiye: o islem sonrasi kalan tutar (devir + giris - cikis).
        </p>

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
                <th>Gider Sinifi</th>
                <th>Aciklama</th>
                <th>Referans</th>
                <th>Kaynak</th>
              </tr>
            </thead>
            <tbody>
              {safeRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">
                    Kayit bulunamadi
                  </td>
                </tr>
              ) : (
                safeRows.map((row) => (
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
                    <td className="bank-statement-cell-category" title={row.category ?? "-"}>
                      {row.category ?? "-"}
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

              <tr className="bank-statement-devir-row">
                <td>{filter.from || "-"}</td>
                <td>Devir</td>
                <td className="col-num">-</td>
                <td className="col-num">{formatTry(openingBalance)}</td>
                <td>-</td>
                <td>Donem basi devir bakiyesi</td>
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
