import { useMemo } from "react";
import {
  formatDateTr,
  formatTry,
  type ApartmentCreditsResponse,
} from "../../app/shared";

type ApartmentCreditsPageProps = {
  loading: boolean;
  pageLoading: boolean;
  data: ApartmentCreditsResponse | null;
  refresh: () => Promise<void>;
  applyPendingCredits: () => Promise<void>;
};

const MONTH_NAMES = [
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

function formatPeriod(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}

export function ApartmentCreditsPage({
  loading,
  pageLoading,
  data,
  refresh,
  applyPendingCredits,
}: ApartmentCreditsPageProps) {
  const pendingCredits = data?.pendingCredits ?? [];
  const overpaidCharges = data?.overpaidCharges ?? [];

  const blockedCount = useMemo(
    () => pendingCredits.filter((row) => row.autoApplyBlocker !== null).length,
    [pendingCredits]
  );

  return (
    <section className="dashboard report-page apartment-credits-page">
      <div className="card table-card report-page-card">
        <div className="section-head report-toolbar">
          <h3>Fazla Odeme ve Daire Alacaklari</h3>
          <div className="admin-row">
            <button
              className="btn"
              type="button"
              onClick={() => void applyPendingCredits()}
              disabled={loading || pageLoading || (data?.applicablePendingTotal ?? 0) <= 0}
            >
              Bekleyen Alacaklari Simdi Uygula
            </button>
            <button
              className="btn btn-primary btn-run"
              type="button"
              onClick={() => void refresh()}
              disabled={loading || pageLoading}
            >
              {pageLoading ? "Yukleniyor..." : "Yenile"}
            </button>
          </div>
        </div>

        <p className="small">
          Bir daire borcundan fazla odedi ginde fazla kisim hicbir tahakkuga yazilmadan
          alacak olarak bekler. Yeni tahakkuk olusturuldugunda bu alacaklar otomatik
          olarak yeni tahakkuklara islenir. Asagidaki buton, yeni tahakkuk beklemeden
          mevcut acik borclara islemek icin.
        </p>

        {data?.truncated ? (
          <p className="small" role="alert">
            DIKKAT: taranan kayit sayisi limite takildi, liste eksik olabilir.
          </p>
        ) : null}

        <h4 className="compact-row-top-gap">
          Bekleyen Alacaklar
          <span className="small">
            {" "}
            (Toplam: {formatTry(data?.pendingTotal ?? 0)}
            {blockedCount > 0
              ? ` — bunun ${formatTry(
                  (data?.pendingTotal ?? 0) - (data?.applicablePendingTotal ?? 0)
                )} kadari otomatik uygulanamaz`
              : ""}
            )
          </span>
        </h4>
        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Daire</th>
                <th className="col-num">Odeme</th>
                <th className="col-num">Islenen</th>
                <th className="col-num">Bekleyen</th>
                <th>Sebep</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {pendingCredits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Bekleyen alacak yok
                  </td>
                </tr>
              ) : (
                pendingCredits.map((row) => (
                  <tr key={row.paymentId}>
                    <td>{formatDateTr(row.paidAt)}</td>
                    <td>{row.apartmentLabel ?? row.doorNo ?? "-"}</td>
                    <td className="col-num">{formatTry(row.totalAmount)}</td>
                    <td className="col-num">{formatTry(row.appliedAmount)}</td>
                    <td className="col-num">{formatTry(row.pendingAmount)}</td>
                    <td>{row.reason}</td>
                    <td className={row.autoApplyBlocker ? "text-danger" : undefined}>
                      {row.autoApplyBlocker ?? "Otomatik uygulanacak"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <h4 className="compact-row-top-gap">
          Fazla Odenmis Tahakkuklar
          <span className="small"> (Toplam fazla: {formatTry(data?.overpaidTotal ?? 0)})</span>
        </h4>
        <p className="small">
          Bu tahakkuklara tutarindan fazla odeme islenmis. Fark hicbir raporda
          gorunmez ve sonraki aya devretmez; ilgili tahsilati Duzeltmeler ekranindan
          duzeltmen gerekir.
        </p>
        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table">
            <thead>
              <tr>
                <th>Daire</th>
                <th>Donem</th>
                <th>Tahakkuk Tipi</th>
                <th className="col-num">Tutar</th>
                <th className="col-num">Odenen</th>
                <th className="col-num">Fazla</th>
              </tr>
            </thead>
            <tbody>
              {overpaidCharges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">
                    Fazla odenmis tahakkuk yok
                  </td>
                </tr>
              ) : (
                overpaidCharges.map((row) => (
                  <tr key={row.chargeId}>
                    <td>{row.apartmentLabel}</td>
                    <td>{formatPeriod(row.periodYear, row.periodMonth)}</td>
                    <td>{row.chargeTypeName}</td>
                    <td className="col-num">{formatTry(row.amount)}</td>
                    <td className="col-num">{formatTry(row.paidAmount)}</td>
                    <td className="col-num text-danger">{formatTry(row.excessAmount)}</td>
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
