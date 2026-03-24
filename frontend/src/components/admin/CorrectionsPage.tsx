import { useState, type Dispatch, type SetStateAction } from "react";
import {
  dateInputToIso,
  isoToDateInput,
  type ApartmentOption,
  type ChargeCorrectionRow,
  type ChargeTypeDefinition,
  type PaymentItemCorrectionRow,
  type PaymentMethod,
  type PaymentMethodDefinition,
} from "../../app/shared";

type CorrectionsPageProps = {
  correctionApartmentId: string;
  setCorrectionApartmentId: Dispatch<SetStateAction<string>>;
  loadCorrections: (apartmentId: string, showReadyMessage?: boolean) => Promise<void>;
  apartmentOptions: ApartmentOption[];
  loading: boolean;
  chargeCorrectionRows: ChargeCorrectionRow[];
  setChargeCorrectionRows: Dispatch<SetStateAction<ChargeCorrectionRow[]>>;
  selectedChargeCorrectionIds: string[];
  setSelectedChargeCorrectionIds: Dispatch<SetStateAction<string[]>>;
  chargeTypeOptions: ChargeTypeDefinition[];
  removeSelectedChargeCorrections: () => Promise<void>;
  saveChargeCorrection: (row: ChargeCorrectionRow) => Promise<void>;
  removeChargeCorrection: (chargeId: string) => Promise<void>;
  paymentCorrectionRows: PaymentItemCorrectionRow[];
  setPaymentCorrectionRows: Dispatch<SetStateAction<PaymentItemCorrectionRow[]>>;
  selectedPaymentCorrectionIds: string[];
  setSelectedPaymentCorrectionIds: Dispatch<SetStateAction<string[]>>;
  paymentMethodOptions: PaymentMethodDefinition[];
  removeSelectedPaymentCorrections: () => Promise<void>;
  savePaymentCorrection: (row: PaymentItemCorrectionRow) => Promise<void>;
  removePaymentCorrection: (paymentItemId: string) => Promise<void>;
};

export function CorrectionsPage({
  correctionApartmentId,
  setCorrectionApartmentId,
  loadCorrections,
  apartmentOptions,
  loading,
  chargeCorrectionRows,
  setChargeCorrectionRows,
  selectedChargeCorrectionIds,
  setSelectedChargeCorrectionIds,
  chargeTypeOptions,
  removeSelectedChargeCorrections,
  saveChargeCorrection,
  removeChargeCorrection,
  paymentCorrectionRows,
  setPaymentCorrectionRows,
  selectedPaymentCorrectionIds,
  setSelectedPaymentCorrectionIds,
  paymentMethodOptions,
  removeSelectedPaymentCorrections,
  savePaymentCorrection,
  removePaymentCorrection,
}: CorrectionsPageProps) {
  const [chargeAmountDrafts, setChargeAmountDrafts] = useState<Record<string, string>>({});
  const [paymentAmountDrafts, setPaymentAmountDrafts] = useState<Record<string, string>>({});

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

  return (
    <section className="dashboard corrections-page">
      <div className="card admin-form corrections-form-card">
        <h3>Tahakkuk/Odeme Duzeltme ve Manuel Kapama</h3>
        <p className="small">
          Odeme satirinda <strong>Manuel Kilit</strong> aciksa, yeniden eslestirme calistiginda bu odeme dagilimi korunur.
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
          <h3>Tahakkuklar</h3>
          <div className="admin-row">
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => void removeSelectedChargeCorrections()}
              disabled={loading || selectedChargeCorrectionIds.length === 0}
            >
              Secilenleri Sil ({selectedChargeCorrectionIds.length})
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="corrections-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    title="Tum tahakkuk satirlarini sec"
                    checked={
                      chargeCorrectionRows.length > 0 &&
                      chargeCorrectionRows.every((row) => selectedChargeCorrectionIds.includes(row.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedChargeCorrectionIds(chargeCorrectionRows.map((row) => row.id));
                      } else {
                        setSelectedChargeCorrectionIds([]);
                      }
                    }}
                  />
                </th>
                <th>Donem</th>
                <th>Tip</th>
                <th className="col-num">Tutar</th>
                <th>Son Odeme</th>
                <th className="corrections-col-description">Aciklama</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {chargeCorrectionRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      title="Tahakkuk satirini sec"
                      checked={selectedChargeCorrectionIds.includes(row.id)}
                      onChange={(e) => {
                        setSelectedChargeCorrectionIds((prev) =>
                          e.target.checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)
                        );
                      }}
                    />
                  </td>
                  <td>
                    <div className="compact-row">
                      <input
                        type="number"
                        title="Tahakkuk donem yili"
                        value={row.periodYear}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setChargeCorrectionRows((prev) =>
                            prev.map((x) => (x.id === row.id ? { ...x, periodYear: value } : x))
                          );
                        }}
                      />
                      <input
                        type="number"
                        min={1}
                        max={12}
                        title="Tahakkuk donem ayi"
                        value={row.periodMonth}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setChargeCorrectionRows((prev) =>
                            prev.map((x) => (x.id === row.id ? { ...x, periodMonth: value } : x))
                          );
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    <select
                      title="Tahakkuk turu"
                      value={row.chargeTypeId}
                      onChange={(e) => {
                        const value = e.target.value;
                        setChargeCorrectionRows((prev) =>
                          prev.map((x) => (x.id === row.id ? { ...x, chargeTypeId: value } : x))
                        );
                      }}
                    >
                      {chargeTypeOptions
                        .filter((x) => x.isActive)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="col-num">
                    <input
                      type="text"
                      inputMode="decimal"
                      title="Tahakkuk tutari"
                      value={chargeAmountDrafts[row.id] ?? formatTrDecimal(row.amount)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setChargeAmountDrafts((prev) => ({ ...prev, [row.id]: value }));
                      }}
                      onFocus={() =>
                        setChargeAmountDrafts((prev) => ({
                          ...prev,
                          [row.id]: prev[row.id] ?? formatTrDecimal(row.amount),
                        }))
                      }
                      onBlur={(e) => {
                        const value = parseTrDecimal(e.target.value);
                        if (!Number.isFinite(value)) {
                          setChargeAmountDrafts((prev) => {
                            const next = { ...prev };
                            delete next[row.id];
                            return next;
                          });
                          return;
                        }
                        setChargeCorrectionRows((prev) =>
                          prev.map((x) => (x.id === row.id ? { ...x, amount: Number(value.toFixed(2)) } : x))
                        );
                        setChargeAmountDrafts((prev) => {
                          const next = { ...prev };
                          delete next[row.id];
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      title="Tahakkuk son odeme tarihi"
                      value={isoToDateInput(row.dueDate)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setChargeCorrectionRows((prev) =>
                          prev.map((x) => (x.id === row.id ? { ...x, dueDate: dateInputToIso(value) } : x))
                        );
                      }}
                    />
                  </td>
                  <td className="corrections-col-description">
                    <input
                      title="Tahakkuk aciklamasi"
                      value={row.description ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setChargeCorrectionRows((prev) =>
                          prev.map((x) => (x.id === row.id ? { ...x, description: value } : x))
                        );
                      }}
                    />
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-ghost" type="button" onClick={() => void saveChargeCorrection(row)}>
                      Kaydet
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => void removeChargeCorrection(row.id)}>
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {chargeCorrectionRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    Tahakkuk kaydi yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card table-card">
        <div className="compact-row">
          <h3>Odeme Kayitlari</h3>
          <div className="admin-row">
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => void removeSelectedPaymentCorrections()}
              disabled={loading || selectedPaymentCorrectionIds.length === 0}
            >
              Secilenleri Sil ({selectedPaymentCorrectionIds.length})
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="corrections-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    title="Tum odeme satirlarini sec"
                    checked={
                      paymentCorrectionRows.length > 0 &&
                      paymentCorrectionRows.every((row) => selectedPaymentCorrectionIds.includes(row.paymentItemId))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPaymentCorrectionIds(paymentCorrectionRows.map((row) => row.paymentItemId));
                      } else {
                        setSelectedPaymentCorrectionIds([]);
                      }
                    }}
                  />
                </th>
                <th>Tahakkuk</th>
                <th className="col-num">Tutar</th>
                <th>Odeme Tarihi</th>
                <th>Yontem</th>
                <th>Kilit</th>
                <th className="corrections-col-description">Not</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {paymentCorrectionRows.map((row) => (
                <tr key={row.paymentItemId}>
                  <td>
                    <input
                      type="checkbox"
                      title="Odeme satirini sec"
                      checked={selectedPaymentCorrectionIds.includes(row.paymentItemId)}
                      onChange={(e) => {
                        setSelectedPaymentCorrectionIds((prev) =>
                          e.target.checked
                            ? [...prev, row.paymentItemId]
                            : prev.filter((id) => id !== row.paymentItemId)
                        );
                      }}
                    />
                  </td>
                  <td>
                    <select
                      title="Odeme iliskili tahakkuk"
                      value={row.chargeId}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPaymentCorrectionRows((prev) =>
                          prev.map((x) => (x.paymentItemId === row.paymentItemId ? { ...x, chargeId: value } : x))
                        );
                      }}
                    >
                      {chargeCorrectionRows.map((charge) => (
                        <option key={charge.id} value={charge.id}>
                          {String(charge.periodMonth).padStart(2, "0")}/{charge.periodYear} - {charge.chargeTypeName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="col-num">
                    <input
                      type="text"
                      inputMode="decimal"
                      title="Odeme tutari"
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
                  </td>
                  <td>
                    <input
                      type="date"
                      title="Odeme tarihi"
                      value={isoToDateInput(row.paidAt)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPaymentCorrectionRows((prev) =>
                          prev.map((x) =>
                            x.paymentItemId === row.paymentItemId ? { ...x, paidAt: dateInputToIso(value) } : x
                          )
                        );
                      }}
                    />
                  </td>
                  <td>
                    <select
                      title="Odeme yontemi"
                      value={row.method}
                      onChange={(e) => {
                        const value = e.target.value as PaymentMethod;
                        setPaymentCorrectionRows((prev) =>
                          prev.map((x) => (x.paymentItemId === row.paymentItemId ? { ...x, method: value } : x))
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
                  </td>
                  <td>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        title="Bu odemeyi yeniden eslestirmede kilitle"
                        checked={row.isReconcileLocked === true}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setPaymentCorrectionRows((prev) =>
                            prev.map((x) =>
                              x.paymentItemId === row.paymentItemId ? { ...x, isReconcileLocked: checked } : x
                            )
                          );
                        }}
                      />
                      Manuel
                    </label>
                  </td>
                  <td className="corrections-col-description">
                    <input
                      title="Odeme notu"
                      value={row.note ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPaymentCorrectionRows((prev) =>
                          prev.map((x) => (x.paymentItemId === row.paymentItemId ? { ...x, note: value } : x))
                        );
                      }}
                    />
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-ghost" type="button" onClick={() => void savePaymentCorrection(row)}>
                      Kaydet
                    </button>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() => void removePaymentCorrection(row.paymentItemId)}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {paymentCorrectionRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    Odeme kaydi yok
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
