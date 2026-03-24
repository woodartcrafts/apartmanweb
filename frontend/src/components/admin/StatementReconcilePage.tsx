import { formatDateTr, formatTry, type ApartmentOption, type MixedPaymentReportRow } from "../../app/shared";

type StatementReconcilePageProps = {
  loading: boolean;
  activeApartmentId: string;
  setActiveApartmentId: (value: string) => void;
  apartmentOptions: ApartmentOption[];
  reconcileSelectedApartment: () => Promise<void>;
  reconcileAllApartments: () => Promise<void>;
  fetchMixedPaymentReport: (options?: { apartmentId?: string; silent?: boolean }) => Promise<void>;
  mixedPaymentTotalCount: number;
  mixedPaymentRows: MixedPaymentReportRow[];
};

export function StatementReconcilePage({
  loading,
  activeApartmentId,
  setActiveApartmentId,
  apartmentOptions,
  reconcileSelectedApartment,
  reconcileAllApartments,
  fetchMixedPaymentReport,
  mixedPaymentTotalCount,
  mixedPaymentRows,
}: StatementReconcilePageProps) {
  return (
    <section className="dashboard">
      <div className="card admin-tools">
        <h3>Eslestirme ve Karisik Odeme Islemleri</h3>
        <div className="admin-row">
          <select
            title="Eslestirme icin daire secimi"
            value={activeApartmentId}
            onChange={(e) => setActiveApartmentId(e.target.value)}
          >
            <option value="">Daire seciniz</option>
            {apartmentOptions.map((apt) => (
              <option key={apt.id} value={apt.id}>
                {apt.blockName} / {apt.doorNo} / {apt.type}
                {apt.ownerFullName ? ` / ${apt.ownerFullName}` : ""}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={() => void reconcileSelectedApartment()} disabled={loading}>
            Secilen Daireyi Yeniden Eslestir
          </button>
          <button className="btn btn-danger" onClick={() => void reconcileAllApartments()} disabled={loading}>
            Tum Daireleri Toplu Yeniden Eslestir
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => void fetchMixedPaymentReport({ apartmentId: activeApartmentId || undefined })}
            disabled={loading}
          >
            Karisik Odemeleri Listele (Secili/Tumu)
          </button>
          <button className="btn btn-ghost" onClick={() => void fetchMixedPaymentReport()} disabled={loading}>
            Tum Karisik Odemeleri Listele
          </button>
        </div>
      </div>

      <div className="card table-card">
        <div className="compact-row">
          <h3>Karisik Odemeler (Manuel Kontrol)</h3>
          <span className="small">Toplam: {mixedPaymentTotalCount}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Odeme Tarihi</th>
                <th>Yontem</th>
                <th className="col-num">Odeme Tutari</th>
                <th className="col-num">Dagitilan</th>
                <th>Daire Sayisi</th>
                <th>Daire Dagilimi</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {mixedPaymentRows.map((row) => (
                <tr key={row.paymentId}>
                  <td>{formatDateTr(row.paidAt)}</td>
                  <td>{row.method.replaceAll("_", " ")}</td>
                  <td className="col-num">{formatTry(row.totalAmount)}</td>
                  <td className="col-num">{formatTry(row.linkedAmount)}</td>
                  <td>{row.apartmentCount}</td>
                  <td>{row.allocations.map((x) => `${x.blockName}/${x.apartmentDoorNo}: ${formatTry(x.amount)}`).join(" | ")}</td>
                  <td>{row.note ?? "-"}</td>
                </tr>
              ))}
              {mixedPaymentRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    Karisik odeme kaydi bulunmuyor
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
