import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  dateInputToIso,
  formatDateTr,
  formatTry,
  isoToDateInput,
  type ApartmentOption,
  type ChargeCorrectionRow,
  type PaymentItemCorrectionRow,
  type PaymentMethod,
  type PaymentMethodDefinition,
} from "../../app/shared";

type ManualClosuresPageProps = {
  correctionApartmentId: string;
  setCorrectionApartmentId: Dispatch<SetStateAction<string>>;
  loadCorrections: (apartmentId: string, showReadyMessage?: boolean) => Promise<void>;
  apartmentOptions: ApartmentOption[];
  loading: boolean;
  chargeCorrectionRows: ChargeCorrectionRow[];
  paymentCorrectionRows: PaymentItemCorrectionRow[];
  setPaymentCorrectionRows: Dispatch<SetStateAction<PaymentItemCorrectionRow[]>>;
  paymentMethodOptions: PaymentMethodDefinition[];
  savePaymentCorrection: (row: PaymentItemCorrectionRow) => Promise<void>;
  removePaymentCorrection: (paymentItemId: string) => Promise<void>;
  splitPaymentCorrection: (input: { paymentItemId: string; amount: number; targetChargeId: string }) => Promise<void>;
};

export function ManualClosuresPage({
  correctionApartmentId,
  setCorrectionApartmentId,
  loadCorrections,
  apartmentOptions,
  loading,
  chargeCorrectionRows,
  paymentCorrectionRows,
  setPaymentCorrectionRows,
  paymentMethodOptions,
  savePaymentCorrection,
  removePaymentCorrection,
  splitPaymentCorrection,
}: ManualClosuresPageProps) {
  const [paymentAmountDrafts, setPaymentAmountDrafts] = useState<Record<string, string>>({});
  const [splitDrafts, setSplitDrafts] = useState<Record<string, { amount: string; targetChargeId: string }>>({});

  const parseTrDecimal = (value: string): number => {
    const raw = value.trim().replace(/\s+/g, "");
    if (!raw) {
      return Number.NaN;
    }

    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");

    if (hasComma && hasDot) {
      if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
        return Number(raw.replace(/\./g, "").replace(/,/g, "."));
      }
      return Number(raw.replace(/,/g, ""));
    }

    if (hasComma) {
      return Number(raw.replace(/,/g, "."));
    }

    return Number(raw);
  };

  const formatTrDecimal = (value: number): string =>
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);

  const ellipsisText = (value: string, max = 26): string => {
    const text = value.trim();
    if (text.length <= max) {
      return text;
    }
    return `${text.slice(0, Math.max(0, max - 3))}...`;
  };

  const paymentsByChargeId = useMemo(() => {
    const map = new Map<string, PaymentItemCorrectionRow[]>();
    for (const row of paymentCorrectionRows) {
      const list = map.get(row.chargeId) ?? [];
      list.push(row);
      map.set(row.chargeId, list);
    }
    return map;
  }, [paymentCorrectionRows]);

  const getDefaultSplitTargetChargeId = (currentChargeId: string): string => {
    const alternative = chargeCorrectionRows.find((x) => x.id !== currentChargeId);
    return alternative?.id ?? currentChargeId;
  };

  function clearPage(): void {
    setCorrectionApartmentId("");
    setPaymentCorrectionRows([]);
    setPaymentAmountDrafts({});
    setSplitDrafts({});
  }

  return (
    <section className="dashboard manual-closures-page">
      <div className="card admin-form corrections-form-card">
        <div className="section-head">
          <h3>Manuel Kapama Yonetimi</h3>
          <div className="admin-row">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void loadCorrections(correctionApartmentId, true)}
              disabled={loading || !correctionApartmentId}
            >
              Kapamalari Yukle
            </button>
            <button className="btn btn-ghost" type="button" onClick={clearPage} disabled={loading}>
              Temizle
            </button>
          </div>
        </div>
        <p className="small">
          Her tahakkugun saginda bagli kapama satirlari gorulur. Kapamayi baska tahakkuga tasiyip kaydederek manuel dagitimi
          yonetebilirsiniz.
        </p>
        <label>
          Daire Secimi
          <select
            value={correctionApartmentId}
            onChange={(e) => {
              setCorrectionApartmentId(e.target.value);
              void loadCorrections(e.target.value);
            }}
          >
            <option value="">Daire seciniz</option>
            {apartmentOptions.map((apt) => (
              <option key={apt.id} value={apt.id}>
                {apt.blockName} / {apt.doorNo} / {apt.type}
                {apt.ownerFullName ? ` / ${apt.ownerFullName}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card table-card">
        <div className="compact-row">
          <h3>Tahakkuk / Kapama Eslestirmesi</h3>
          <span className="small">Tahakkuk: {chargeCorrectionRows.length}, Kapama: {paymentCorrectionRows.length}</span>
        </div>
        <div className="table-wrap">
          <table className="manual-closures-table">
            <thead>
              <tr>
                <th>Donem</th>
                <th>Tip</th>
                <th className="col-num">Tahakkuk</th>
                <th>Son Odeme</th>
                <th className="manual-closures-col-payments">Bagli Kapamalar (sag)</th>
              </tr>
            </thead>
            <tbody>
              {chargeCorrectionRows.map((charge) => {
                const linkedPayments = paymentsByChargeId.get(charge.id) ?? [];
                const linkedTotal = linkedPayments.reduce((sum, row) => sum + Number(row.amount), 0);
                const remaining = Number((charge.amount - linkedTotal).toFixed(2));

                return (
                  <tr key={charge.id}>
                    <td>
                      {String(charge.periodMonth).padStart(2, "0")}/{charge.periodYear}
                    </td>
                    <td>
                      <div className="manual-closure-charge-type" title={charge.chargeTypeName}>
                        {ellipsisText(charge.chargeTypeName, 22)}
                      </div>
                      {charge.description ? (
                        <div className="small manual-closure-charge-desc" title={charge.description}>
                          {ellipsisText(charge.description, 34)}
                        </div>
                      ) : null}
                    </td>
                    <td className="col-num">
                      <div>{formatTry(charge.amount)}</div>
                      <div className={`small ${remaining > 0.01 ? "small-error" : ""}`}>
                        Kalan: {formatTry(remaining)}
                      </div>
                    </td>
                    <td>{formatDateTr(charge.dueDate)}</td>
                    <td className="manual-closures-col-payments">
                      {linkedPayments.length === 0 ? (
                        <p className="small">Bu tahakkuga bagli kapama yok.</p>
                      ) : (
                        <div className="manual-closure-payments-list">
                          {linkedPayments.map((row) => (
                            <div key={row.paymentItemId} className="manual-closure-payment-row">
                              <label>
                                Tahakkuk
                                <select
                                  value={row.chargeId}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setPaymentCorrectionRows((prev) =>
                                      prev.map((x) => (x.paymentItemId === row.paymentItemId ? { ...x, chargeId: value } : x))
                                    );
                                  }}
                                >
                                  {chargeCorrectionRows.map((target) => (
                                    <option key={target.id} value={target.id}>
                                      {String(target.periodMonth).padStart(2, "0")}/{target.periodYear} - {ellipsisText(
                                        target.chargeTypeName,
                                        20
                                      )}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label>
                                Tutar
                                <input
                                  className="manual-closure-amount-input"
                                  type="text"
                                  inputMode="decimal"
                                  value={paymentAmountDrafts[row.paymentItemId] ?? formatTrDecimal(row.amount)}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setPaymentAmountDrafts((prev) => ({ ...prev, [row.paymentItemId]: value }));
                                  }}
                                  onFocus={() =>
                                    setPaymentAmountDrafts((prev) => ({
                                      ...prev,
                                      [row.paymentItemId]: prev[row.paymentItemId] ?? formatTrDecimal(row.amount),
                                    }))
                                  }
                                  onBlur={(e) => {
                                    const value = parseTrDecimal(e.target.value);
                                    if (!Number.isFinite(value)) {
                                      setPaymentAmountDrafts((prev) => {
                                        const next = { ...prev };
                                        delete next[row.paymentItemId];
                                        return next;
                                      });
                                      return;
                                    }
                                    setPaymentCorrectionRows((prev) =>
                                      prev.map((x) =>
                                        x.paymentItemId === row.paymentItemId ? { ...x, amount: Number(value.toFixed(2)) } : x
                                      )
                                    );
                                    setPaymentAmountDrafts((prev) => {
                                      const next = { ...prev };
                                      delete next[row.paymentItemId];
                                      return next;
                                    });
                                  }}
                                />
                              </label>

                              <label>
                                Tarih
                                <input
                                  type="date"
                                  value={isoToDateInput(row.paidAt)}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setPaymentCorrectionRows((prev) =>
                                      prev.map((x) =>
                                        x.paymentItemId === row.paymentItemId
                                          ? { ...x, paidAt: dateInputToIso(value) }
                                          : x
                                      )
                                    );
                                  }}
                                />
                              </label>

                              <label>
                                Yontem
                                <select
                                  value={row.method}
                                  onChange={(e) => {
                                    const value = e.target.value as PaymentMethod;
                                    setPaymentCorrectionRows((prev) =>
                                      prev.map((x) =>
                                        x.paymentItemId === row.paymentItemId ? { ...x, method: value } : x
                                      )
                                    );
                                  }}
                                >
                                  {Array.from(new Set<PaymentMethod>([...paymentMethodOptions.map((x) => x.code), row.method])).map(
                                    (code) => {
                                      const item = paymentMethodOptions.find((x) => x.code === code);
                                      return (
                                        <option key={code} value={code}>
                                          {item?.name ?? code}
                                        </option>
                                      );
                                    }
                                  )}
                                </select>
                              </label>

                              <label className="checkbox-row manual-closure-lock-field">
                                <input
                                  type="checkbox"
                                  checked={row.isReconcileLocked === true}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setPaymentCorrectionRows((prev) =>
                                      prev.map((x) =>
                                        x.paymentItemId === row.paymentItemId
                                          ? { ...x, isReconcileLocked: checked }
                                          : x
                                      )
                                    );
                                  }}
                                />
                                Manuel Kilit
                              </label>

                              <label className="manual-closure-note-field">
                                Not
                                <input
                                  value={row.note ?? ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setPaymentCorrectionRows((prev) =>
                                      prev.map((x) =>
                                        x.paymentItemId === row.paymentItemId ? { ...x, note: value } : x
                                      )
                                    );
                                  }}
                                />
                              </label>

                              <div className="actions-cell manual-closure-actions">
                                <button
                                  className="btn btn-ghost"
                                  type="button"
                                  onClick={() => void savePaymentCorrection(row)}
                                  disabled={loading}
                                >
                                  Kaydet
                                </button>
                                <button
                                  className="btn btn-ghost"
                                  type="button"
                                  onClick={() => {
                                    setSplitDrafts((prev) => {
                                      if (prev[row.paymentItemId]) {
                                        const next = { ...prev };
                                        delete next[row.paymentItemId];
                                        return next;
                                      }
                                      return {
                                        ...prev,
                                        [row.paymentItemId]: {
                                          amount: "",
                                          targetChargeId: getDefaultSplitTargetChargeId(row.chargeId),
                                        },
                                      };
                                    });
                                  }}
                                  disabled={loading || row.amount <= 0.01}
                                >
                                  Bol
                                </button>
                                <button
                                  className="btn btn-danger"
                                  type="button"
                                  onClick={() => void removePaymentCorrection(row.paymentItemId)}
                                  disabled={loading}
                                >
                                  Sil
                                </button>
                              </div>

                              {splitDrafts[row.paymentItemId] && (
                                <div className="manual-closure-split-panel">
                                  <label>
                                    Bolunecek Tutar
                                    <input
                                      className="manual-closure-amount-input"
                                      type="text"
                                      inputMode="decimal"
                                      value={splitDrafts[row.paymentItemId].amount}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        setSplitDrafts((prev) => ({
                                          ...prev,
                                          [row.paymentItemId]: {
                                            ...prev[row.paymentItemId],
                                            amount: value,
                                          },
                                        }));
                                      }}
                                      placeholder="0,00"
                                    />
                                  </label>
                                  <label>
                                    Hedef Tahakkuk
                                    <select
                                      value={splitDrafts[row.paymentItemId].targetChargeId}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        setSplitDrafts((prev) => ({
                                          ...prev,
                                          [row.paymentItemId]: {
                                            ...prev[row.paymentItemId],
                                            targetChargeId: value,
                                          },
                                        }));
                                      }}
                                    >
                                      {chargeCorrectionRows.map((target) => (
                                        <option key={target.id} value={target.id}>
                                          {String(target.periodMonth).padStart(2, "0")}/{target.periodYear} - {ellipsisText(
                                            target.chargeTypeName,
                                            20
                                          )}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <div className="actions-cell manual-closure-actions">
                                    <button
                                      className="btn btn-primary"
                                      type="button"
                                      disabled={loading}
                                      onClick={() => {
                                        const draft = splitDrafts[row.paymentItemId];
                                        if (!draft) {
                                          return;
                                        }
                                        const parsedAmount = parseTrDecimal(draft.amount);
                                        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                                          return;
                                        }
                                        void splitPaymentCorrection({
                                          paymentItemId: row.paymentItemId,
                                          amount: Number(parsedAmount.toFixed(2)),
                                          targetChargeId: draft.targetChargeId,
                                        });
                                      }}
                                    >
                                      Bolmeyi Uygula
                                    </button>
                                    <button
                                      className="btn btn-ghost"
                                      type="button"
                                      disabled={loading}
                                      onClick={() => {
                                        setSplitDrafts((prev) => {
                                          const next = { ...prev };
                                          delete next[row.paymentItemId];
                                          return next;
                                        });
                                      }}
                                    >
                                      Vazgec
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {chargeCorrectionRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    Tahakkuk kaydi yok
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
