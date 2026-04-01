import { useState, type FormEvent } from "react";
import {
  formatDateTr,
  formatTry,
  type ApartmentOption,
  type ImportSummary,
  type PaymentMethod,
  type PaymentMethodDefinition,
  type SkippedRowInfo,
} from "../../app/shared";

type PaymentFormState = {
  paidAt: string;
  method: PaymentMethod;
  reference: string;
  note: string;
  items: Array<{
    chargeId: string;
    amount: number;
  }>;
};

type PaymentEntryPageProps = {
  loading: boolean;
  initialChargeId?: string;
  apartmentOptions: ApartmentOption[];
  paymentMethodOptions: PaymentMethodDefinition[];
  fetchOpenPaymentCharges: (apartmentId: string) => Promise<
    Array<{
      chargeId: string;
      chargeTypeName: string;
      periodYear: number;
      periodMonth: number;
      dueDate: string;
      amount: number;
      paidTotal: number;
      remaining: number;
    }>
  >;
  onCreatePayment: (payload: PaymentFormState) => Promise<void>;
  onCreateCarryForward: (payload: {
    apartmentId: string;
    amount: string;
    paidAt: string;
    reference: string;
    note: string;
  }) => Promise<void>;
  onUploadPayments: (payload: { method: PaymentMethod; file: File }) => Promise<void>;
  lastImportSummary: ImportSummary | null;
  lastSkippedRows: SkippedRowInfo[];
  lastSkippedTitle: string;
};

export function PaymentEntryPage({
  loading,
  initialChargeId,
  apartmentOptions,
  paymentMethodOptions,
  fetchOpenPaymentCharges,
  onCreatePayment,
  onCreateCarryForward,
  onUploadPayments,
  lastImportSummary,
  lastSkippedRows,
  lastSkippedTitle,
}: PaymentEntryPageProps) {
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    paidAt: "",
    method: "BANK_TRANSFER",
    reference: "",
    note: "",
    items: [],
  });
  const [carryForwardForm, setCarryForwardForm] = useState({
    apartmentId: "",
    amount: "",
    paidAt: "",
    reference: "",
    note: "",
  });
  const [paymentUploadFile, setPaymentUploadFile] = useState<File | null>(null);
  const [paymentApartmentId, setPaymentApartmentId] = useState("");
  const [paymentChargeOptions, setPaymentChargeOptions] = useState<
    Array<{
      chargeId: string;
      chargeTypeName: string;
      periodYear: number;
      periodMonth: number;
      dueDate: string;
      amount: number;
      paidTotal: number;
      remaining: number;
    }>
  >([]);
  const [paymentChargeLoading, setPaymentChargeLoading] = useState(false);
  const [paymentChargeDrafts, setPaymentChargeDrafts] = useState<Record<string, string>>({});

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
    }).format(value);

  const activeOrAllMethods =
    paymentMethodOptions.filter((x) => x.isActive).length > 0
      ? paymentMethodOptions.filter((x) => x.isActive)
      : paymentMethodOptions;
  const defaultMethod = activeOrAllMethods[0]?.code ?? "BANK_TRANSFER";
  const selectedMethod = paymentForm.method || defaultMethod;
  const selectedCarryForwardApartmentId = carryForwardForm.apartmentId || apartmentOptions[0]?.id || "";

  function resetPaymentEntryForm(): void {
    setPaymentForm({
      paidAt: "",
      method: defaultMethod,
      reference: "",
      note: "",
      items: [],
    });
    setPaymentApartmentId("");
    setPaymentChargeOptions([]);
    setPaymentChargeDrafts({});
  }

  async function handlePaymentApartmentChange(apartmentId: string): Promise<void> {
    setPaymentApartmentId(apartmentId);

    if (!apartmentId) {
      setPaymentChargeOptions([]);
      setPaymentForm((prev) => ({ ...prev, chargeId: "" }));
      return;
    }

    setPaymentChargeLoading(true);
    try {
      const rows = await fetchOpenPaymentCharges(apartmentId);
      setPaymentChargeOptions(rows);
      setPaymentForm((prev) => {
          const existingById = new Map(prev.items.map((x) => [x.chargeId, x.amount]));
          const nextItems = rows
            .filter((row) => existingById.has(row.chargeId))
            .map((row) => ({ chargeId: row.chargeId, amount: existingById.get(row.chargeId) as number }));

        const initialMatch = initialChargeId ? rows.find((item) => item.chargeId === initialChargeId) : null;
          if (initialMatch && !nextItems.some((x) => x.chargeId === initialMatch.chargeId)) {
            nextItems.push({ chargeId: initialMatch.chargeId, amount: Number(initialMatch.remaining.toFixed(2)) });
          }

        return {
          ...prev,
            items: nextItems,
        };
      });

        setPaymentChargeDrafts((prev) => {
          const next: Record<string, string> = {};
          for (const row of rows) {
            if (prev[row.chargeId] != null) {
              next[row.chargeId] = prev[row.chargeId];
            }
          }
          if (initialChargeId && rows.some((x) => x.chargeId === initialChargeId) && next[initialChargeId] == null) {
            const initial = rows.find((x) => x.chargeId === initialChargeId);
            if (initial) {
              next[initialChargeId] = formatTrDecimal(initial.remaining);
            }
          }
          return next;
        });
    } finally {
      setPaymentChargeLoading(false);
    }
  }

  async function onSubmitPayment(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    await onCreatePayment({
      ...paymentForm,
      method: selectedMethod,
      items: paymentForm.items,
    });
  }

  const selectedPaymentTotal = paymentForm.items.reduce((sum, item) => sum + Number(item.amount), 0);

  const isPaymentSubmitDisabled =
    loading ||
    !paymentApartmentId ||
    paymentChargeLoading ||
    paymentForm.items.length === 0 ||
    selectedPaymentTotal <= 0.0001;

  async function onSubmitCarryForward(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    await onCreateCarryForward({
      ...carryForwardForm,
      apartmentId: selectedCarryForwardApartmentId,
    });
  }

  function resetCarryForwardForm(): void {
    setCarryForwardForm({
      apartmentId: "",
      amount: "",
      paidAt: "",
      reference: "",
      note: "",
    });
  }

  async function onSubmitUpload(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!paymentUploadFile) {
      return;
    }
    await onUploadPayments({ method: selectedMethod, file: paymentUploadFile });
  }

  function resetUploadForm(): void {
    setPaymentUploadFile(null);
    setPaymentForm((prev) => ({ ...prev, method: defaultMethod }));
  }

  return (
    <section className="dashboard payment-entry-page">
      <form
        data-testid="payment-entry-form"
        className="card admin-form apartment-form-surface payment-entry-form-surface"
        onSubmit={(e) => void onSubmitPayment(e)}
      >
        <div className="section-head">
          <h3>Tahsilat Gir</h3>
          <div className="admin-row">
            <button data-testid="payment-submit" className="btn btn-primary" type="submit" disabled={isPaymentSubmitDisabled}>
              Tahsilati Kaydet
            </button>
            <button className="btn btn-ghost" type="button" onClick={resetPaymentEntryForm} disabled={loading}>
              Temizle
            </button>
          </div>
        </div>

        <section className="payment-entry-form-section">
          <div className="payment-entry-form-section-head">
            <h4>🏠 Tahakkuk Secimi</h4>
            <p className="small">Daire secip acik tahakkuklari odemeye hazirlayin</p>
          </div>

          <div className="payment-entry-inline-grid payment-entry-inline-grid-top">
            <label>
              Daire
              <select
                data-testid="payment-apartment-select"
                value={paymentApartmentId}
                onChange={(e) => {
                  void handlePaymentApartmentChange(e.target.value);
                }}
                required
              >
                <option value="">Daire seciniz</option>
                {apartmentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.blockName} / {item.doorNo}
                    {item.ownerFullName ? ` / ${item.ownerFullName}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <p className="small payment-entry-inline-note">
              Secilen tahakkuk: {paymentForm.items.length} | Toplam tahsilat: <b>{formatTry(selectedPaymentTotal)}</b>
            </p>
          </div>
        </section>

        {paymentApartmentId && !paymentChargeLoading && paymentChargeOptions.length === 0 && (
          <p className="small">Bu dairede acik tahakkuk bulunmuyor.</p>
        )}

        <section className="payment-entry-form-section">
          <div className="payment-entry-form-section-head">
            <h4>📋 Acik Tahakkuklar</h4>
            <p className="small">Tek satirdan secip odeme tutarini guncelleyebilirsiniz</p>
          </div>

          <div className="table-wrap compact-row-top-gap">
            <table className="report-compact-table">
              <thead>
                <tr>
                  <th>Sec</th>
                  <th>Donem</th>
                  <th>Tip</th>
                  <th>Vade</th>
                  <th className="col-num">Kalan</th>
                  <th className="col-num">Odeme</th>
                </tr>
              </thead>
              <tbody>
                {paymentChargeOptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Acik tahakkuk bulunmuyor
                    </td>
                  </tr>
                ) : (
                  paymentChargeOptions.map((item) => {
                    const selected = paymentForm.items.some((x) => x.chargeId === item.chargeId);
                    const selectedRow = paymentForm.items.find((x) => x.chargeId === item.chargeId);
                    return (
                      <tr key={item.chargeId}>
                        <td>
                          <input
                            data-testid="payment-charge-checkbox"
                            type="checkbox"
                            title="Tahakkuku sec"
                            aria-label={`${String(item.periodMonth).padStart(2, "0")}/${item.periodYear} ${item.chargeTypeName} tahakkugunu sec`}
                            checked={selected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setPaymentForm((prev) => {
                                if (checked) {
                                  if (prev.items.some((x) => x.chargeId === item.chargeId)) {
                                    return prev;
                                  }
                                  return {
                                    ...prev,
                                    items: [...prev.items, { chargeId: item.chargeId, amount: Number(item.remaining.toFixed(2)) }],
                                  };
                                }

                                return {
                                  ...prev,
                                  items: prev.items.filter((x) => x.chargeId !== item.chargeId),
                                };
                              });

                              if (checked) {
                                setPaymentChargeDrafts((prev) => ({
                                  ...prev,
                                  [item.chargeId]: prev[item.chargeId] ?? formatTrDecimal(item.remaining),
                                }));
                              }
                            }}
                          />
                        </td>
                        <td>{String(item.periodMonth).padStart(2, "0")}/{item.periodYear}</td>
                        <td>{item.chargeTypeName}</td>
                        <td>{formatDateTr(item.dueDate)}</td>
                        <td className="col-num">{formatTry(item.remaining)}</td>
                        <td className="col-num">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="manual-closure-amount-input"
                            title="Secilen tahakkuk icin odeme tutari"
                            placeholder="0,00"
                            disabled={!selected}
                            value={
                              paymentChargeDrafts[item.chargeId] ??
                              (selectedRow ? formatTrDecimal(selectedRow.amount) : "")
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              setPaymentChargeDrafts((prev) => ({ ...prev, [item.chargeId]: value }));
                            }}
                            onBlur={(e) => {
                              if (!selected) {
                                return;
                              }

                              const parsed = parseTrDecimal(e.target.value);
                              if (!Number.isFinite(parsed) || parsed <= 0) {
                                return;
                              }

                              const normalized = Number(parsed.toFixed(2));
                              setPaymentForm((prev) => ({
                                ...prev,
                                items: prev.items.map((x) => (x.chargeId === item.chargeId ? { ...x, amount: normalized } : x)),
                              }));
                              setPaymentChargeDrafts((prev) => ({ ...prev, [item.chargeId]: formatTrDecimal(normalized) }));
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="payment-entry-form-section">
          <div className="payment-entry-form-section-head">
            <h4>💳 Tahsilat Bilgileri</h4>
            <p className="small">Tarih, yontem ve referans alanlarini tek satirdan yonetin</p>
          </div>

          <div className="payment-entry-inline-grid payment-entry-inline-grid-bottom">
            <label>
              Tahsilat Tarihi
              <input
                data-testid="payment-paid-at"
                type="date"
                value={paymentForm.paidAt}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, paidAt: e.target.value }))}
                required
              />
            </label>
            <label>
              Yontem
              <select
                value={selectedMethod}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value as PaymentMethod }))}
              >
                {activeOrAllMethods.map((item) => (
                  <option key={item.id} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Referans Numarasi
              <input
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </label>
            <label>
              Not
              <input
                value={paymentForm.note}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </label>
          </div>
        </section>
      </form>

      <form className="card admin-form apartment-form-surface payment-entry-form-surface" onSubmit={(e) => void onSubmitCarryForward(e)}>
        <div className="section-head">
          <h3>Devir Alacak Girisi</h3>
          <div className="admin-row">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Devir Alacak Kaydet
            </button>
            <button className="btn btn-ghost" type="button" onClick={resetCarryForwardForm} disabled={loading}>
              Temizle
            </button>
          </div>
        </div>

        <section className="payment-entry-form-section">
          <div className="payment-entry-form-section-head">
            <h4>↩ Devir Kaydi</h4>
            <p className="small">Banka bakiyesini etkilemeden daire bazli devir alacak kaydi olusturur</p>
          </div>

          <div className="payment-entry-inline-grid payment-entry-inline-grid-bottom payment-entry-inline-grid-carry">
            <label>
              Daire
              <select
                value={selectedCarryForwardApartmentId}
                onChange={(e) => setCarryForwardForm((prev) => ({ ...prev, apartmentId: e.target.value }))}
                required
              >
                <option value="">Daire seciniz</option>
                {apartmentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.blockName} / {item.doorNo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Devir Alacak Tutari
              <input
                type="text"
                inputMode="decimal"
                value={carryForwardForm.amount}
                onChange={(e) => setCarryForwardForm((prev) => ({ ...prev, amount: e.target.value }))}
                onBlur={(e) => {
                  const parsed = parseTrDecimal(e.target.value);
                  if (Number.isFinite(parsed)) {
                    setCarryForwardForm((prev) => ({ ...prev, amount: formatTrDecimal(parsed) }));
                  }
                }}
                required
              />
            </label>
            <label>
              Islem Tarihi
              <input
                type="date"
                value={carryForwardForm.paidAt}
                onChange={(e) => setCarryForwardForm((prev) => ({ ...prev, paidAt: e.target.value }))}
                required
              />
            </label>
            <label>
              Referans Numarasi
              <input
                value={carryForwardForm.reference}
                onChange={(e) => setCarryForwardForm((prev) => ({ ...prev, reference: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </label>
            <label>
              Aciklama
              <input
                value={carryForwardForm.note}
                onChange={(e) => setCarryForwardForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Opsiyonel"
              />
            </label>
          </div>
        </section>
      </form>

      <form className="card admin-form apartment-form-surface payment-entry-form-surface" onSubmit={(e) => void onSubmitUpload(e)}>
        <div className="section-head">
          <h3>Toplu Tahsilat Upload</h3>
          <div className="admin-row">
            <button className="btn btn-primary" type="submit" disabled={loading || !paymentUploadFile}>
              Toplu Tahsilati Yukle
            </button>
            <button className="btn btn-ghost" type="button" onClick={resetUploadForm} disabled={loading}>
              Temizle
            </button>
          </div>
        </div>

        <section className="payment-entry-form-section">
          <div className="payment-entry-form-section-head">
            <h4>📤 Toplu Yukleme</h4>
            <p className="small">Format: .xlsx, .csv, .txt, .pdf | Kolonlar: tarih, tutar, daire no, aciklama, referans</p>
          </div>

          <div className="payment-entry-inline-grid payment-entry-inline-grid-upload">
            <label>
              Tahsilat Araci
              <select
                value={selectedMethod}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value as PaymentMethod }))}
              >
                {activeOrAllMethods.map((item) => (
                  <option key={item.id} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Dosya
              <input
                type="file"
                accept=".xlsx,.csv,.txt,.pdf"
                onChange={(e) => setPaymentUploadFile(e.target.files?.[0] ?? null)}
                required
              />
            </label>
          </div>
        </section>
      </form>

      {lastImportSummary && (
        <div className="card import-summary-card">
          <h3>{lastImportSummary.title}</h3>
          <div className="import-summary-badges">
            <span className="summary-badge summary-badge-total">Toplam Satir: {lastImportSummary.totalRows}</span>
            <span className="summary-badge summary-badge-saved">
              {lastImportSummary.savedLabel ?? "Kaydedilen"}: {lastImportSummary.savedCount}
            </span>
            <span className="summary-badge summary-badge-skipped">Atlanan: {lastImportSummary.skippedCount}</span>
          </div>
          {lastImportSummary.detailText && <p className="small">{lastImportSummary.detailText}</p>}
        </div>
      )}

      {lastSkippedRows.length > 0 && (
        <div className="card table-card">
          <h3>{lastSkippedTitle || "Kaydedilmeyen Satirlar"}</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Satir</th>
                  <th>Ham Hata</th>
                  <th>Aciklama</th>
                </tr>
              </thead>
              <tbody>
                {lastSkippedRows.map((item, idx) => (
                  <tr key={`${item.raw}-${idx}`}>
                    <td>{item.rowNo ?? "-"}</td>
                    <td>{item.raw}</td>
                    <td>{item.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
