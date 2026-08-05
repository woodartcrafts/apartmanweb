import { useMemo, useState } from "react";
import {
  formatDateTr,
  formatTry,
  type ApartmentOption,
  type PaymentRefundAppliedRow,
  type PaymentRefundCandidateRow,
} from "../../app/shared";

type PaymentRefundsPageProps = {
  loading: boolean;
  pageLoading: boolean;
  candidates: PaymentRefundCandidateRow[];
  appliedRows: PaymentRefundAppliedRow[];
  apartmentOptions: ApartmentOption[];
  refresh: () => Promise<void>;
  applyRefund: (expenseId: string, doorNo: string) => Promise<void>;
};

function normalizeDoorNo(value: string): string {
  return value.trim().replace(/\s+/g, "").toLocaleLowerCase("tr");
}

export function PaymentRefundsPage({
  loading,
  pageLoading,
  candidates,
  appliedRows,
  apartmentOptions,
  refresh,
  applyRefund,
}: PaymentRefundsPageProps) {
  const [doorDrafts, setDoorDrafts] = useState<Record<string, string>>({});
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const apartmentByDoorNo = useMemo(() => {
    const map = new Map<string, ApartmentOption>();
    for (const apt of apartmentOptions) {
      map.set(normalizeDoorNo(apt.doorNo), apt);
    }
    return map;
  }, [apartmentOptions]);

  const appliedTotal = useMemo(
    () => Number(appliedRows.reduce((sum, row) => sum + row.amount, 0).toFixed(2)),
    [appliedRows]
  );

  async function onApply(row: PaymentRefundCandidateRow): Promise<void> {
    const doorNo = (doorDrafts[row.id] ?? "").trim();
    if (!doorNo) {
      return;
    }
    setApplyingId(row.id);
    try {
      await applyRefund(row.id, doorNo);
      setDoorDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <section className="dashboard report-page payment-refunds-page">
      <div className="card table-card report-page-card">
        <div className="section-head report-toolbar">
          <h3>Aidat Iadesi</h3>
          <div className="admin-row">
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
          Siniflandirilamayan banka cikislarindan iade secip daire no girin. Sistem ilgili dairenin tahsilatini
          otomatik duser. Bu kayitlar gider raporunda gorunmez; banka bakiyesinden dusulur.
        </p>

        <h4 className="compact-row-top-gap">Iade Adaylari (Siniflandirilamayan Giderler)</h4>
        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th className="col-num">Tutar</th>
                <th>Kaynak</th>
                <th>Aciklama</th>
                <th>Referans</th>
                <th>Daire No</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Iade adayi bulunamadi
                  </td>
                </tr>
              ) : (
                candidates.map((row) => {
                  const draftDoor = doorDrafts[row.id] ?? "";
                  const matchedApartment = apartmentByDoorNo.get(normalizeDoorNo(draftDoor));
                  const apartmentHint = matchedApartment
                    ? `${matchedApartment.blockName}/${matchedApartment.doorNo}${
                        matchedApartment.ownerFullName ? ` - ${matchedApartment.ownerFullName}` : ""
                      }`
                    : "Daire bulunamadi";

                  return (
                    <tr key={row.id}>
                      <td>{formatDateTr(row.spentAt)}</td>
                      <td className="col-num">{formatTry(row.amount)}</td>
                      <td>{row.sourceLabel}</td>
                      <td className="unclassified-col-ellipsis" title={row.description ?? "-"}>
                        {row.description ?? "-"}
                      </td>
                      <td className="unclassified-col-ellipsis" title={row.reference ?? "-"}>
                        {row.reference ?? "-"}
                      </td>
                      <td>
                        <div className="unclassified-inline-edit">
                          <input
                            type="text"
                            placeholder="Daire no"
                            value={draftDoor}
                            onChange={(e) =>
                              setDoorDrafts((prev) => ({
                                ...prev,
                                [row.id]: e.target.value,
                              }))
                            }
                          />
                          <span className="small">{draftDoor ? apartmentHint : "Daire no girin"}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-primary"
                          type="button"
                          disabled={loading || applyingId === row.id || !draftDoor.trim() || !matchedApartment}
                          onClick={() => void onApply(row)}
                        >
                          {applyingId === row.id ? "Uygulaniyor..." : "Iade Uygula"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <h4 className="compact-row-top-gap">
          Tamamlanan Iadeler
          <span className="small"> (Toplam: {formatTry(appliedTotal)})</span>
        </h4>
        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th className="col-num">Tutar</th>
                <th>Daire</th>
                <th>Aciklama</th>
                <th>Referans</th>
              </tr>
            </thead>
            <tbody>
              {appliedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">
                    Tamamlanan iade yok
                  </td>
                </tr>
              ) : (
                appliedRows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTr(row.spentAt)}</td>
                    <td className="col-num">{formatTry(row.amount)}</td>
                    <td>{row.doorNo ?? "-"}</td>
                    <td className="unclassified-col-ellipsis" title={row.description ?? "-"}>
                      {row.description ?? "-"}
                    </td>
                    <td className="unclassified-col-ellipsis" title={row.reference ?? "-"}>
                      {row.reference ?? "-"}
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
