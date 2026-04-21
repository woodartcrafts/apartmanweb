import { type Dispatch, type SetStateAction } from "react";
import { formatDateTr, formatTry, type ManualReviewMatchRow } from "../../app/shared";

type ManualReviewMatchesFilter = {
  from: string;
  to: string;
  doorNo: string;
};

type ManualReviewMatchesPageProps = {
  loading: boolean;
  reportLoading: boolean;
  rows: ManualReviewMatchRow[];
  totalCount: number;
  filter: ManualReviewMatchesFilter;
  setFilter: Dispatch<SetStateAction<ManualReviewMatchesFilter>>;
  runQuery: () => Promise<void>;
  clearFilters: () => void;
  clearingPaymentId: string | null;
  clearWarningRow: (row: ManualReviewMatchRow) => Promise<void>;
  clearAllWarnings: () => Promise<void>;
};

function reasonLabel(row: ManualReviewMatchRow): string {
  if (row.reasonCode === "NO_EXACT_MATCH") {
    return row.reasonCount ? `Exact eslesme yok (${row.reasonCount} acik borc adayi)` : "Exact eslesme yok";
  }
  if (row.reasonCode === "MULTIPLE_EXACT_MATCH") {
    return row.reasonCount
      ? `Birden fazla exact eslesme (${row.reasonCount} aday)`
      : "Birden fazla exact eslesme";
  }
  return "Manuel inceleme";
}

export function ManualReviewMatchesPage({
  loading,
  reportLoading,
  rows,
  totalCount,
  filter,
  setFilter,
  runQuery,
  clearFilters,
  clearingPaymentId,
  clearWarningRow,
  clearAllWarnings,
}: ManualReviewMatchesPageProps) {
  return (
    <section className="dashboard report-page manual-review-matches-page">
      <div className="card table-card report-page-card">
        <div className="section-head report-toolbar">
          <h3>Manuel Inceleme Gerektiren Eslesmeler</h3>
          <div className="admin-row">
            <button className="btn btn-primary btn-run" type="button" onClick={() => void runQuery()} disabled={loading || reportLoading}>
              {reportLoading ? "Yukleniyor..." : "Calistir"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={clearFilters}>Temizle</button>
            {rows.length > 0 && (
              <button
                className="btn btn-danger"
                type="button"
                disabled={loading || reportLoading}
                onClick={() => void clearAllWarnings()}
              >
                Tumunu Temizle ({rows.length})
              </button>
            )}
          </div>
        </div>

        <div className="upload-batch-filter-row compact-row-top-gap report-filter-grid">
          <label>
            Odeme Baslangic Tarihi
            <input
              type="date"
              value={filter.from}
              onChange={(e) => setFilter((prev) => ({ ...prev, from: e.target.value }))}
            />
          </label>
          <label>
            Odeme Bitis Tarihi
            <input
              type="date"
              value={filter.to}
              onChange={(e) => setFilter((prev) => ({ ...prev, to: e.target.value }))}
            />
          </label>
          <label>
            Daire No
            <input
              value={filter.doorNo}
              onChange={(e) => setFilter((prev) => ({ ...prev, doorNo: e.target.value }))}
              placeholder="Orn: 12"
            />
          </label>
        </div>

        <div className="compact-row-top-gap">
          <span className="summary-badge summary-badge-manual-review">Kayit: {totalCount}</span>
        </div>

        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table manual-review-table">
            <thead>
              <tr>
                <th>Odeme Tarihi</th>
                <th>Daire</th>
                <th>Neden</th>
                <th className="col-num">Tutar</th>
                <th>Aciklama</th>
                <th>Not</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Manuel inceleme gerektiren kayit bulunmuyor. Listelemek icin Calistir butonunu kullanin.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.paymentId}>
                    <td>{formatDateTr(row.paidAt)}</td>
                    <td>{row.doorNo ?? (row.apartmentLabels.length > 0 ? row.apartmentLabels.join(" | ") : "-")}</td>
                    <td>{reasonLabel(row)}</td>
                    <td className="col-num">{formatTry(row.totalAmount)}</td>
                    <td>{row.description ?? "-"}</td>
                    <td>{row.note ?? "-"}</td>
                    <td className="actions-cell">
                      <button
                        className="btn btn-ghost"
                        type="button"
                        disabled={loading || reportLoading || clearingPaymentId === row.paymentId}
                        onClick={() => void clearWarningRow(row)}
                      >
                        {clearingPaymentId === row.paymentId ? "Temizleniyor..." : "Uyariyi Temizle"}
                      </button>
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
