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
  applyRefund: (
    expenseId: string,
    doorNo: string,
    allocations?: Array<{ doorNo: string; amount: number }>
  ) => Promise<void>;
};

function normalizeDoorNo(value: string): string {
  return value.trim().replace(/\s+/g, "").toLocaleLowerCase("tr");
}

function parseDoorNosDraft(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,;/]|\s+ve\s+|\s+veya\s+|\s+/i)
        .map((part) => part.trim())
        .filter(Boolean)
    ),
  ];
}

function parseTrDecimal(value: string): number {
  const raw = value.trim().replace(/\s+/g, "");
  if (!raw) {
    return Number.NaN;
  }
  if (raw.includes(",")) {
    return Number(raw.replace(/\./g, "").replace(/,/g, "."));
  }
  return Number(raw);
}

function formatTrDecimal(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Kalani ilk daireye vererek kurus farki olmadan esit boler. */
function buildEqualAllocationDrafts(doorNos: string[], amount: number): Record<string, string> {
  const totalCents = Math.round(amount * 100);
  const base = Math.floor(totalCents / doorNos.length);
  const drafts: Record<string, string> = {};
  doorNos.forEach((door, index) => {
    const cents = index === 0 ? totalCents - base * (doorNos.length - 1) : base;
    drafts[door] = formatTrDecimal(cents / 100);
  });
  return drafts;
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
  // expenseId -> doorNo -> tutar metni
  const [amountDrafts, setAmountDrafts] = useState<Record<string, Record<string, string>>>({});
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

  function resolveDoorHint(draft: string): { ok: boolean; label: string } {
    const doors = parseDoorNosDraft(draft);
    if (doors.length === 0) {
      return { ok: false, label: "Daire no girin (orn. 57 veya 57,93)" };
    }

    const labels: string[] = [];
    const missing: string[] = [];
    for (const door of doors) {
      const matched = apartmentByDoorNo.get(normalizeDoorNo(door));
      if (!matched) {
        missing.push(door);
        continue;
      }
      labels.push(
        `${matched.blockName}/${matched.doorNo}${
          matched.ownerFullName ? ` - ${matched.ownerFullName}` : ""
        }`
      );
    }

    if (missing.length > 0) {
      return { ok: false, label: `Daire bulunamadi: ${missing.join(", ")}` };
    }

    return { ok: true, label: labels.join(" + ") };
  }

  /**
   * Coklu daire iadesinde tutari sistem tahmin edemez (hangi daireye ne kadar
   * iade edildigi ekstrede yazmiyor), bu yuzden kullanici girer. Toplam iade
   * tutarina birebir esit olmali.
   */
  function resolveAllocationState(row: PaymentRefundCandidateRow): {
    doorNos: string[];
    drafts: Record<string, string>;
    allocations: Array<{ doorNo: string; amount: number }>;
    enteredTotal: number;
    ok: boolean;
    error: string;
  } {
    const doorNos = parseDoorNosDraft(doorDrafts[row.id] ?? "");
    const drafts =
      amountDrafts[row.id] && doorNos.every((door) => amountDrafts[row.id][door] != null)
        ? amountDrafts[row.id]
        : buildEqualAllocationDrafts(doorNos, row.amount);

    const allocations: Array<{ doorNo: string; amount: number }> = [];
    for (const door of doorNos) {
      const parsed = parseTrDecimal(drafts[door] ?? "");
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return {
          doorNos,
          drafts,
          allocations: [],
          enteredTotal: Number.NaN,
          ok: false,
          error: `${door} icin gecerli bir tutar girin`,
        };
      }
      allocations.push({ doorNo: door, amount: Number(parsed.toFixed(2)) });
    }

    const enteredTotal = Number(
      allocations.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
    );
    if (Math.round(enteredTotal * 100) !== Math.round(row.amount * 100)) {
      return {
        doorNos,
        drafts,
        allocations,
        enteredTotal,
        ok: false,
        error: `Toplam ${formatTry(enteredTotal)} girildi, iade tutari ${formatTry(row.amount)}`,
      };
    }

    return { doorNos, drafts, allocations, enteredTotal, ok: true, error: "" };
  }

  async function onApply(row: PaymentRefundCandidateRow): Promise<void> {
    const doorNo = (doorDrafts[row.id] ?? "").trim();
    if (!doorNo) {
      return;
    }
    const hint = resolveDoorHint(doorNo);
    if (!hint.ok) {
      return;
    }

    const allocationState = resolveAllocationState(row);
    if (allocationState.doorNos.length > 1 && !allocationState.ok) {
      return;
    }

    setApplyingId(row.id);
    try {
      await applyRefund(
        row.id,
        doorNo,
        allocationState.doorNos.length > 1 ? allocationState.allocations : undefined
      );
      setDoorDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setAmountDrafts((prev) => {
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
          Siniflandirilamayan banka cikislarindan iade secip daire no girin. Tek daire: <b>57</b>.
          Coklu daire: <b>57,93</b> — bu durumda her daireye ne kadar iade edildigini siz girersiniz,
          toplam iade tutarina birebir esit olmali. Iade once dairenin bekleyen alacagindan
          (tahakkuga yazilmamis fazla odemesinden), yetmezse tahakkuklara yazili tahsilatlardan en
          yeniden baslayarak dusulur. Kayit gider raporunda gorunmez; banka bakiyesinden dusulur.
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
                  const hint = resolveDoorHint(draftDoor);
                  const allocationState = resolveAllocationState(row);
                  const needsAllocation = hint.ok && allocationState.doorNos.length > 1;

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
                            placeholder="57 veya 57,93"
                            value={draftDoor}
                            onChange={(e) =>
                              setDoorDrafts((prev) => ({
                                ...prev,
                                [row.id]: e.target.value,
                              }))
                            }
                          />
                          <span className="small">{draftDoor ? hint.label : "Daire no girin"}</span>

                          {needsAllocation && (
                            <div className="refund-allocation">
                              <span className="small">Daire basina iade tutari:</span>
                              {allocationState.doorNos.map((door) => (
                                <label key={door} className="refund-allocation-line">
                                  <span>{door}</span>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={allocationState.drafts[door] ?? ""}
                                    onChange={(e) =>
                                      setAmountDrafts((prev) => ({
                                        ...prev,
                                        [row.id]: {
                                          ...allocationState.drafts,
                                          ...(prev[row.id] ?? {}),
                                          [door]: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                </label>
                              ))}
                              <span className={allocationState.ok ? "small" : "small text-danger"}>
                                {allocationState.ok
                                  ? `Toplam ${formatTry(allocationState.enteredTotal)}`
                                  : allocationState.error}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-primary"
                          type="button"
                          disabled={
                            loading ||
                            applyingId === row.id ||
                            !draftDoor.trim() ||
                            !hint.ok ||
                            (needsAllocation && !allocationState.ok)
                          }
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
