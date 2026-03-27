import { useMemo, type Dispatch, type SetStateAction } from "react";
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
};

export function BankStatementViewPage({
  loading,
  rows,
  openingBalance,
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
    <section className="dashboard">
      <div className="card table-card">
        <div className="section-head">
          <h3>Banka Hareketleri</h3>
          <div className="admin-row">
            <button className="btn btn-primary btn-run" type="button" onClick={() => void runQuery()} disabled={loading}>
              Listele
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void resetToCurrentMonth()} disabled={loading}>
              Bu Aya Don
            </button>
          </div>
        </div>

        <p className="small">Sistemdeki banka hareketleri listelenir. Siralama en yeni tarihten eskiye dogrudur.</p>

        <div className="upload-batch-filter-row compact-row-top-gap">
          <label>
            Baslangic Tarihi
            <input
              type="date"
              value={filter.from}
              onChange={(e) => setFilter((prev) => ({ ...prev, from: e.target.value }))}
            />
          </label>
          <label>
            Bitis Tarihi
            <input
              type="date"
              value={filter.to}
              onChange={(e) => setFilter((prev) => ({ ...prev, to: e.target.value }))}
            />
          </label>
        </div>

        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table">
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
                      {row.entryType === "IN" ? "+" : "-"}
                      {formatTry(row.amount)}
                    </td>
                    <td className={`col-num ${(balanceByRowId.get(row.id) ?? 0) < 0 ? "col-num-negative" : ""}`}>
                      {formatTry(balanceByRowId.get(row.id) ?? 0)}
                    </td>
                    <td>{row.description ?? "-"}</td>
                    <td>{row.reference ?? "-"}</td>
                    <td>
                      {row.source === "BANK_STATEMENT_UPLOAD"
                        ? `Banka Upload${row.fileName ? ` (${row.fileName})` : ""}`
                        : row.source === "PAYMENT_UPLOAD"
                          ? "Toplu Odeme Upload"
                          : "Manuel"}
                    </td>
                  </tr>
                ))
              )}

              <tr>
                <td>-</td>
                <td>Devir</td>
                <td className="col-num">-</td>
                <td className="col-num">{formatTry(openingBalance)}</td>
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