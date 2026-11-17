import { useMemo, useState } from "react";
import {
  formatDateTr,
  formatTry,
  type ApartmentCreditsResponse,
  type PaymentAuditReport,
} from "../../app/shared";

type ApartmentCreditsPageProps = {
  loading: boolean;
  pageLoading: boolean;
  data: ApartmentCreditsResponse | null;
  audit: PaymentAuditReport | null;
  refresh: () => Promise<void>;
  applyPendingCredits: () => Promise<void>;
  approvePendingCredit: (paymentId: string, chargeIds?: string[]) => Promise<void>;
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
  audit,
  refresh,
  applyPendingCredits,
  approvePendingCredit,
}: ApartmentCreditsPageProps) {
  const allPendingCredits = useMemo(() => data?.pendingCredits ?? [], [data]);
  const approvalRows = useMemo(
    () => allPendingCredits.filter((row) => row.pendingApproval),
    [allPendingCredits]
  );
  const pendingCredits = useMemo(
    () => allPendingCredits.filter((row) => !row.pendingApproval),
    [allPendingCredits]
  );
  // Tur kisitina takilan alacaklar: ayni turde acik borc yok ama dairede baska acik kalemler var.
  // Otomatik yazilmaz; yonetici hangi kalemlere yazilacagini kendisi secer.
  const typeBlockedRows = useMemo(
    () =>
      pendingCredits.filter(
        (row) =>
          row.typeRestriction !== null &&
          row.autoApplyBlocker !== null &&
          (row.approvalOpenCharges ?? []).length > 0
      ),
    [pendingCredits]
  );
  const overpaidCharges = data?.overpaidCharges ?? [];

  // Yonetici onerilen kalemleri degistirdiyse paymentId -> secili kalem listesi.
  const [selectionByPayment, setSelectionByPayment] = useState<Record<string, string[]>>({});

  type CreditRow = (typeof allPendingCredits)[number];

  function proposedChargeIds(row: CreditRow): string[] {
    return (row.approvalProposal ?? []).map((item) => item.chargeId);
  }

  function currentSelection(row: CreditRow): string[] {
    return selectionByPayment[row.paymentId] ?? proposedChargeIds(row);
  }

  function toggleCharge(row: CreditRow, chargeId: string): void {
    const current = currentSelection(row);
    const next = current.includes(chargeId)
      ? current.filter((id) => id !== chargeId)
      : [...current, chargeId];
    setSelectionByPayment((prev) => ({ ...prev, [row.paymentId]: next }));
  }

  async function approve(row: CreditRow): Promise<void> {
    const selected = currentSelection(row);
    const proposed = proposedChargeIds(row);
    const unchanged =
      selected.length === proposed.length && selected.every((id) => proposed.includes(id));
    // Acik kalem sirasini koru (vade sirasi).
    const ordered = (row.approvalOpenCharges ?? [])
      .map((charge) => charge.chargeId)
      .filter((id) => selected.includes(id));
    await approvePendingCredit(row.paymentId, unchanged ? undefined : ordered);
    setSelectionByPayment((prev) => {
      const rest = { ...prev };
      delete rest[row.paymentId];
      return rest;
    });
  }

  function renderPickerTable(rows: CreditRow[], buttonLabel: string) {
    return (
      <div className="table-wrap compact-row-top-gap">
        <table className="apartment-list-table report-compact-table">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Daire</th>
              <th className="col-num">Tutar</th>
              <th>Yazilacak borc kalemleri</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = currentSelection(row);
              const openCharges = row.approvalOpenCharges ?? [];
              return (
                <tr key={row.paymentId}>
                  <td>{formatDateTr(row.paidAt)}</td>
                  <td>{row.apartmentLabel ?? row.doorNo ?? "-"}</td>
                  <td className="col-num">{formatTry(row.pendingAmount)}</td>
                  <td>
                    {row.typeRestriction ? (
                      <div className="small">Alacagin turu: {row.typeRestriction.join(" / ")}</div>
                    ) : null}
                    {openCharges.length === 0 ? (
                      <span className="text-danger">Dairede acik borc yok</span>
                    ) : (
                      openCharges.map((charge) => {
                        const proposedAmount = row.approvalProposal?.find(
                          (item) => item.chargeId === charge.chargeId
                        )?.amount;
                        return (
                          <label key={charge.chargeId} style={{ display: "block" }}>
                            <input
                              type="checkbox"
                              checked={selected.includes(charge.chargeId)}
                              onChange={() => toggleCharge(row, charge.chargeId)}
                              disabled={loading}
                            />{" "}
                            {formatPeriod(charge.periodYear, charge.periodMonth)} -{" "}
                            {charge.chargeTypeName} (kalan {formatTry(charge.remaining)})
                            {proposedAmount !== undefined
                              ? ` - onerilen ${formatTry(proposedAmount)}`
                              : ""}
                          </label>
                        );
                      })
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => void approve(row)}
                      disabled={loading || pageLoading || selected.length === 0}
                    >
                      {buttonLabel}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

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
          Denetim Bulgulari
          <span className="small">
            {audit
              ? ` (son ${audit.windowDays} gun, ${audit.scannedPaymentCount} odeme tarandi)`
              : ""}
          </span>
        </h4>
        <p className="small">
          Gunluk otomatik denetim yalnizca okur, hicbir kaydi degistirmez. Asagidakiler sistemin
          kendi kayitlarindaki tutarsizliklardir; duzeltme Duzeltmeler ekranindan elle yapilir.
        </p>
        {!audit ? (
          <p className="small">Denetim sonucu alinamadi.</p>
        ) : audit.findings.length === 0 ? (
          <p className="small">Bakilmasi gereken bulgu yok.</p>
        ) : (
          <ul className="small">
            {audit.findings.map((finding, index) => (
              <li
                key={`${finding.code}-${finding.paymentId ?? finding.chargeId ?? index}`}
                className={finding.severity === "HIGH" ? "text-danger" : undefined}
              >
                {finding.severity === "HIGH" ? "[Onemli] " : finding.severity === "MEDIUM" ? "[Orta] " : "[Bilgi] "}
                {finding.message}
              </li>
            ))}
          </ul>
        )}

        <h4 className="compact-row-top-gap">
          Onay Bekleyen Odemeler
          <span className="small"> ({approvalRows.length} odeme)</span>
        </h4>
        <p className="small">
          Sistem bu odemelerin hangi borca ait oldugundan emin olamadi (dairede birden cok acik
          kalem var, tutar ve aciklama hangisini gosterdigini belli etmiyor). Yanlis kalemi
          kapatmamak icin hicbir borca yazilmadi. Onerilen kalemleri kontrol edip onaylayin ya da
          farkli kalemleri isaretleyin.
        </p>
        {approvalRows.length === 0 ? (
          <p className="small">Onay bekleyen odeme yok.</p>
        ) : (
          renderPickerTable(approvalRows, "Onayla")
        )}

        {typeBlockedRows.length > 0 ? (
          <>
            <h4 className="compact-row-top-gap">
              Tura Takilan Alacaklar
              <span className="small"> ({typeBlockedRows.length} odeme)</span>
            </h4>
            <p className="small">
              Bu odemelerin fazla kismi belirli bir borc turunden (ornegin dogalgaz) geldigi icin
              yalnizca ayni turdeki borcu kapatabilir; dairede o turden acik borc kalmadigi icin
              otomatik yazilmadi. Dairenin baska acik kalemleri asagida. Yazmak istediginiz
              kalemleri siz isaretleyin; hicbiri onceden secili degildir.
            </p>
            {renderPickerTable(typeBlockedRows, "Secili Kalemlere Yaz")}
          </>
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
