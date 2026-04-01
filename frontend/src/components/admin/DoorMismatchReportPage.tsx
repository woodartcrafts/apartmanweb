import { formatDateTr, formatTry, type DoorMismatchReportResponse, type DoorMismatchReportRow } from "../../app/shared";

type DoorMismatchReportPageProps = {
  fetchDoorMismatchReport: () => Promise<void>;
  clearDoorMismatchReport: () => void;
  doorMismatchLoading: boolean;
  onGoToReconcile: () => void;
  doorMismatchTotals: DoorMismatchReportResponse["totals"] | null;
  doorMismatchRows: DoorMismatchReportRow[];
};

export function DoorMismatchReportPage({
  fetchDoorMismatchReport,
  clearDoorMismatchReport,
  doorMismatchLoading,
  onGoToReconcile,
  doorMismatchTotals,
  doorMismatchRows,
}: DoorMismatchReportPageProps) {
  return (
    <section className="dashboard">
      <div className="card admin-tools">
        <div className="section-head">
          <h3>Banka Eslestirme Kontrolu</h3>
          <div className="admin-row">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void fetchDoorMismatchReport()}
              disabled={doorMismatchLoading}
            >
              {doorMismatchLoading ? "Kontrol Calisiyor..." : "Kontrolu Calistir"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={clearDoorMismatchReport} disabled={doorMismatchLoading}>
              Temizle
            </button>
            <button className="btn btn-ghost" type="button" onClick={onGoToReconcile}>
              Eslestirme Ekranina Git
            </button>
          </div>
        </div>
        <p className="small">DOGRU kapino etiketi (DOOR) ile bagli olmayan banka odemelerini listeler.</p>
      </div>

      <div className="stats-grid">
        <article className="card stat">
          <h4>Banka Odeme Linki</h4>
          <p>{doorMismatchTotals ? doorMismatchTotals.bankStatementPaymentItemCount : "-"}</p>
        </article>
        <article className="card stat">
          <h4>Uyumsuz Satir</h4>
          <p>{doorMismatchTotals ? doorMismatchTotals.mismatchPaymentItemCount : "-"}</p>
        </article>
        <article className="card stat">
          <h4>Uyumsuz Odeme</h4>
          <p>{doorMismatchTotals ? doorMismatchTotals.mismatchPaymentCount : "-"}</p>
        </article>
        <article className="card stat">
          <h4>Uyumsuz Tutar</h4>
          <p>{doorMismatchTotals ? formatTry(doorMismatchTotals.mismatchAllocatedTotal) : "-"}</p>
        </article>
      </div>

      <div className="card table-card">
        <h3>Uyumsuz Eslestirme Satirlari</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Odeme Tarihi</th>
                <th>Odeme Kapino</th>
                <th>Baglanan Daire</th>
                <th>Donem</th>
                <th>Tip</th>
                <th className="col-num">Dagitilan</th>
                <th className="col-num">Odeme Toplami</th>
                <th>Dosya</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {doorMismatchRows.map((row) => (
                <tr key={row.paymentItemId}>
                  <td>{formatDateTr(row.paidAt)}</td>
                  <td>{row.paymentDoorNo ?? "-"}</td>
                  <td>
                    {row.linkedBlockName}/{row.linkedDoorNo}
                  </td>
                  <td>
                    {String(row.periodMonth).padStart(2, "0")}/{row.periodYear}
                  </td>
                  <td>{row.chargeTypeName}</td>
                  <td className="col-num">{formatTry(row.allocatedAmount)}</td>
                  <td className="col-num">{formatTry(row.paymentTotal)}</td>
                  <td>{row.sourceFileName ?? "-"}</td>
                  <td>{row.paymentNote ?? "-"}</td>
                </tr>
              ))}
              {doorMismatchRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">
                    Uyumsuz eslestirme satiri bulunmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
