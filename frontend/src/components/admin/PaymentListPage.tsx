import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  formatDateTimeTr,
  formatDateTr,
  formatTry,
  paymentMethodEnumOptions,
  type ApartmentOption,
  type PaymentListRow,
  type PaymentMethod,
  type PaymentMethodDefinition,
  type PaymentSourceFilter,
} from "../../app/shared";

type PaymentListFilterState = {
  from: string;
  to: string;
  source: PaymentSourceFilter;
  description: string;
};

type PaymentListEditFormState = {
  paidAt: string;
  amount: string;
  method: PaymentMethod;
  description: string;
  reference: string;
  apartmentId: string;
};

type PaymentListHeaderFilterState = {
  paidAt: string;
  doorNo: string;
  occupant: string;
  method: string;
  amount: string;
  description: string;
  reference: string;
  source: string;
  createdBy: string;
  createdAt: string;
};

const initialHeaderFilters: PaymentListHeaderFilterState = {
  paidAt: "",
  doorNo: "",
  occupant: "",
  method: "",
  amount: "",
  description: "",
  reference: "",
  source: "",
  createdBy: "",
  createdAt: "",
};

function normalizeFilterText(value: string | null | undefined): string {
  return (value ?? "").toLocaleLowerCase("tr-TR");
}

function toSourceLabel(source: PaymentListRow["source"]): string {
  if (source === "GMAIL") {
    return "Gmail";
  }
  if (source === "BANK_STATEMENT_UPLOAD") {
    return "Banka Ekstresi Upload";
  }
  if (source === "PAYMENT_UPLOAD") {
    return "Toplu Tahsilat Upload";
  }
  return "Manuel";
}

function resolveOccupantName(row: PaymentListRow, apartmentOptions: ApartmentOption[]): string {
  const apartment = apartmentOptions.find((x) => x.id === row.apartmentId);
  if (!apartment) {
    return "-";
  }

  const residentNames = apartment.residentUsers.map((x) => x.fullName).filter((x) => x && x.trim().length > 0);
  if (residentNames.length > 0) {
    return residentNames.join(", ");
  }

  return apartment.ownerFullName?.trim() || "-";
}

function buildSortedUniqueOptions(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort((a, b) =>
    a.localeCompare(b, "tr", { numeric: true, sensitivity: "base" })
  );
}

type PaymentListPageProps = {
  loading: boolean;
  apartmentOptions: ApartmentOption[];
  paymentMethodOptions: PaymentMethodDefinition[];
  paymentListFilter: PaymentListFilterState;
  setPaymentListFilter: Dispatch<SetStateAction<PaymentListFilterState>>;
  paymentListRows: PaymentListRow[];
  paymentListError: string;
  editingPaymentListId: string | null;
  editingPaymentListSource: PaymentListRow["source"] | null;
  paymentListEditForm: PaymentListEditFormState;
  setPaymentListEditForm: Dispatch<SetStateAction<PaymentListEditFormState>>;
  allowImportedAmountEdit: boolean;
  setAllowImportedAmountEdit: Dispatch<SetStateAction<boolean>>;
  runPaymentListQuery: () => Promise<void>;
  clearPaymentListFilters: () => Promise<void>;
  submitPaymentListRowEdit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  cancelEditPaymentListRow: () => void;
  startEditPaymentListRow: (row: PaymentListRow) => void;
  deletePaymentListRow: (row: PaymentListRow) => Promise<void>;
};

export function PaymentListPage({
  loading,
  apartmentOptions,
  paymentMethodOptions,
  paymentListFilter,
  setPaymentListFilter,
  paymentListRows,
  paymentListError,
  editingPaymentListId,
  editingPaymentListSource,
  paymentListEditForm,
  setPaymentListEditForm,
  allowImportedAmountEdit,
  setAllowImportedAmountEdit,
  runPaymentListQuery,
  clearPaymentListFilters,
  submitPaymentListRowEdit,
  cancelEditPaymentListRow,
  startEditPaymentListRow,
  deletePaymentListRow,
}: PaymentListPageProps) {
  const [headerFilters, setHeaderFilters] = useState<PaymentListHeaderFilterState>(initialHeaderFilters);
  const editFormRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!editingPaymentListId || !editFormRef.current) {
      return;
    }

    editFormRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [editingPaymentListId]);

  const headerFilterOptions = useMemo(() => {
    const paidAtOptions = buildSortedUniqueOptions(paymentListRows.map((row) => formatDateTr(row.paidAt)));
    const doorNoOptions = buildSortedUniqueOptions(
      paymentListRows.map((row) => (row.apartments.length > 0 ? row.apartments.join(", ") : "-"))
    );
    const occupantOptions = buildSortedUniqueOptions(
      paymentListRows.map((row) => resolveOccupantName(row, apartmentOptions))
    );
    const descriptionOptions = buildSortedUniqueOptions(paymentListRows.map((row) => row.description ?? "-"));
    const referenceOptions = buildSortedUniqueOptions(paymentListRows.map((row) => row.reference ?? "-"));
    const createdByOptions = buildSortedUniqueOptions(paymentListRows.map((row) => row.createdByName ?? "-"));
    const createdAtOptions = buildSortedUniqueOptions(paymentListRows.map((row) => formatDateTimeTr(row.createdAt)));

    return {
      paidAt: paidAtOptions,
      doorNo: doorNoOptions,
      occupant: occupantOptions,
      description: descriptionOptions,
      reference: referenceOptions,
      createdBy: createdByOptions,
      createdAt: createdAtOptions,
    };
  }, [apartmentOptions, paymentListRows]);

  const filteredRows = useMemo(() => {
    return paymentListRows.filter((row) => {
      const methodName = paymentMethodOptions.find((x) => x.code === row.method)?.name ?? row.method;
      const sourceLabel = toSourceLabel(row.source);
      const doorNoText = row.apartments.length > 0 ? row.apartments.join(", ") : "-";
      const occupantText = resolveOccupantName(row, apartmentOptions);

      const paidAtText = normalizeFilterText(formatDateTr(row.paidAt));
      const doorNoFilterText = normalizeFilterText(doorNoText);
      const occupantFilterText = normalizeFilterText(occupantText);
      const methodFilterText = normalizeFilterText(methodName);
      const amountFilterText = normalizeFilterText(formatTry(row.totalAmount));
      const descriptionFilterText = normalizeFilterText(row.description ?? "-");
      const referenceFilterText = normalizeFilterText(row.reference ?? "-");
      const sourceFilterText = normalizeFilterText(sourceLabel);
      const createdByFilterText = normalizeFilterText(row.createdByName ?? "-");
      const createdAtFilterText = normalizeFilterText(formatDateTimeTr(row.createdAt));

      return (
        paidAtText.includes(normalizeFilterText(headerFilters.paidAt)) &&
        doorNoFilterText.includes(normalizeFilterText(headerFilters.doorNo)) &&
        occupantFilterText.includes(normalizeFilterText(headerFilters.occupant)) &&
        methodFilterText.includes(normalizeFilterText(headerFilters.method)) &&
        amountFilterText.includes(normalizeFilterText(headerFilters.amount)) &&
        descriptionFilterText.includes(normalizeFilterText(headerFilters.description)) &&
        referenceFilterText.includes(normalizeFilterText(headerFilters.reference)) &&
        sourceFilterText.includes(normalizeFilterText(headerFilters.source)) &&
        createdByFilterText.includes(normalizeFilterText(headerFilters.createdBy)) &&
        createdAtFilterText.includes(normalizeFilterText(headerFilters.createdAt))
      );
    });
  }, [apartmentOptions, headerFilters, paymentListRows, paymentMethodOptions]);

  return (
    <section className="dashboard">
      <div className="card table-card">
        <div className="section-head">
          <h3>Tahsilat Raporu</h3>
          <div className="admin-row">
            <button className="btn btn-primary btn-run" type="button" onClick={() => void runPaymentListQuery()}>
              Calistir
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void clearPaymentListFilters()}>Temizle</button>
          </div>
        </div>
        <div className="payment-list-filter-row compact-row-top-gap payment-list-filter-row-single-line">
          <label>
            Baslangic Tarihi
            <input
              type="date"
              value={paymentListFilter.from}
              onChange={(e) => setPaymentListFilter((prev) => ({ ...prev, from: e.target.value }))}
            />
          </label>
          <label>
            Bitis Tarihi
            <input
              type="date"
              value={paymentListFilter.to}
              onChange={(e) => setPaymentListFilter((prev) => ({ ...prev, to: e.target.value }))}
            />
          </label>
          <label>
            Kaynak
            <select
              value={paymentListFilter.source}
              onChange={(e) =>
                setPaymentListFilter((prev) => ({ ...prev, source: e.target.value as PaymentSourceFilter }))
              }
            >
              <option value="">Hepsi</option>
              <option value="MANUAL">Manuel</option>
              <option value="GMAIL">Gmail</option>
              <option value="BANK_STATEMENT_UPLOAD">Banka Ekstresi Upload</option>
            </select>
          </label>
          <label>
            Aciklama
            <input
              type="text"
              value={paymentListFilter.description}
              onChange={(e) => setPaymentListFilter((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Aciklamada ara"
            />
          </label>
        </div>
        {editingPaymentListId && (
          <form ref={editFormRef} className="admin-form" onSubmit={submitPaymentListRowEdit}>
            <h4>Secili Tahsilat Satirini Duzenle</h4>
            <div className="compact-row">
              <label>
                Tahsilat Tarihi
                <input
                  type="datetime-local"
                  value={paymentListEditForm.paidAt}
                  onChange={(e) => setPaymentListEditForm((prev) => ({ ...prev, paidAt: e.target.value }))}
                  required
                />
              </label>
              <label>
                Tutar
                <input
                  type="text"
                  inputMode="decimal"
                  value={paymentListEditForm.amount}
                  onChange={(e) => setPaymentListEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </label>
              <label>
                Daire
                <select
                  value={paymentListEditForm.apartmentId}
                  onChange={(e) => setPaymentListEditForm((prev) => ({ ...prev, apartmentId: e.target.value }))}
                >
                  <option value="">Degistirme</option>
                  {apartmentOptions.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.blockName} / {apt.doorNo} / {apt.type}
                      {apt.ownerFullName ? ` / ${apt.ownerFullName}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Yontem
                <select
                  value={paymentListEditForm.method}
                  onChange={(e) =>
                    setPaymentListEditForm((prev) => ({ ...prev, method: e.target.value as PaymentMethod }))
                  }
                  required
                >
                  {paymentMethodEnumOptions.map((method) => {
                    const label = paymentMethodOptions.find((x) => x.code === method)?.name ?? method;
                    return (
                      <option key={method} value={method}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
            <label>
              Aciklama
              <input
                value={paymentListEditForm.description}
                onChange={(e) => setPaymentListEditForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
            <label>
              Referans
              <input
                value={paymentListEditForm.reference}
                onChange={(e) => setPaymentListEditForm((prev) => ({ ...prev, reference: e.target.value }))}
              />
            </label>
            {(editingPaymentListSource === "BANK_STATEMENT_UPLOAD" ||
              editingPaymentListSource === "PAYMENT_UPLOAD" ||
              editingPaymentListSource === "GMAIL") && (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={allowImportedAmountEdit}
                  onChange={(e) => setAllowImportedAmountEdit(e.target.checked)}
                />
                Kaynak dosyadan gelen kayitta tutar degisikligine izin ver
              </label>
            )}
            <div className="compact-row">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                Kaydet
              </button>
              <button className="btn btn-ghost" type="button" onClick={cancelEditPaymentListRow}>Temizle</button>
            </div>
          </form>
        )}
        <div className="table-wrap">
          <table className="apartment-list-table report-compact-table payment-list-table">
            <thead>
              <tr>
                <th>Tahsilat Tarihi</th>
                <th>D.No</th>
                <th>Oturan Kisi</th>
                <th>Ynt.</th>
                <th className="col-num">Tutar</th>
                <th>Aciklama</th>
                <th>Referans</th>
                <th>Kaynak</th>
                <th>Kim Girdi</th>
                <th>Giris Zamani</th>
                <th>Islem</th>
              </tr>
              <tr>
                <th>
                  <select
                    value={headerFilters.paidAt}
                    onChange={(e) => setHeaderFilters((prev) => ({ ...prev, paidAt: e.target.value }))}
                    aria-label="Tahsilat tarihi filtresi"
                    title="Tahsilat tarihi filtresi"
                  >
                    <option value="">Hepsi</option>
                    {headerFilterOptions.paidAt.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </th>
                <th>
                  <select
                    value={headerFilters.doorNo}
                    onChange={(e) => setHeaderFilters((prev) => ({ ...prev, doorNo: e.target.value }))}
                    aria-label="Daire numarasi filtresi"
                    title="Daire numarasi filtresi"
                  >
                    <option value="">Hepsi</option>
                    {headerFilterOptions.doorNo.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </th>
                <th>
                  <select
                    value={headerFilters.occupant}
                    onChange={(e) => setHeaderFilters((prev) => ({ ...prev, occupant: e.target.value }))}
                    aria-label="Oturan kisi filtresi"
                    title="Oturan kisi filtresi"
                  >
                    <option value="">Hepsi</option>
                    {headerFilterOptions.occupant.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </th>
                <th>
                  <select
                    value={headerFilters.method}
                    onChange={(e) => setHeaderFilters((prev) => ({ ...prev, method: e.target.value }))}
                    aria-label="Yontem filtresi"
                    title="Yontem filtresi"
                  >
                    <option value="">Hepsi</option>
                    {paymentMethodEnumOptions.map((method) => {
                      const label = paymentMethodOptions.find((x) => x.code === method)?.name ?? method;
                      return (
                        <option key={method} value={label}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </th>
                <th>
                  <span className="small">-</span>
                </th>
                <th>
                  <select
                    value={headerFilters.description}
                    onChange={(e) => setHeaderFilters((prev) => ({ ...prev, description: e.target.value }))}
                    aria-label="Aciklama filtresi"
                    title="Aciklama filtresi"
                  >
                    <option value="">Hepsi</option>
                    {headerFilterOptions.description.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </th>
                <th>
                  <select
                    value={headerFilters.reference}
                    onChange={(e) => setHeaderFilters((prev) => ({ ...prev, reference: e.target.value }))}
                    aria-label="Referans filtresi"
                    title="Referans filtresi"
                  >
                    <option value="">Hepsi</option>
                    {headerFilterOptions.reference.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </th>
                <th>
                  <select
                    value={headerFilters.source}
                    onChange={(e) => setHeaderFilters((prev) => ({ ...prev, source: e.target.value }))}
                    aria-label="Kaynak filtresi"
                    title="Kaynak filtresi"
                  >
                    <option value="">Hepsi</option>
                    <option value="Manuel">Manuel</option>
                    <option value="Banka Ekstresi Upload">Banka Ekstresi Upload</option>
                    <option value="Toplu Tahsilat Upload">Toplu Tahsilat Upload</option>
                  </select>
                </th>
                <th>
                  <select
                    value={headerFilters.createdBy}
                    onChange={(e) => setHeaderFilters((prev) => ({ ...prev, createdBy: e.target.value }))}
                    aria-label="Kim girdi filtresi"
                    title="Kim girdi filtresi"
                  >
                    <option value="">Hepsi</option>
                    {headerFilterOptions.createdBy.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </th>
                <th>
                  <select
                    value={headerFilters.createdAt}
                    onChange={(e) => setHeaderFilters((prev) => ({ ...prev, createdAt: e.target.value }))}
                    aria-label="Giris zamani filtresi"
                    title="Giris zamani filtresi"
                  >
                    <option value="">Hepsi</option>
                    {headerFilterOptions.createdAt.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </th>
                <th>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => setHeaderFilters(initialHeaderFilters)}
                  >
                    Sifirla
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const methodName = paymentMethodOptions.find((x) => x.code === row.method)?.name ?? row.method;
                const sourceLabel = toSourceLabel(row.source);
                const occupantName = resolveOccupantName(row, apartmentOptions);

                return (
                  <tr key={row.id}>
                    <td>{formatDateTr(row.paidAt)}</td>
                    <td>{row.apartments.length > 0 ? row.apartments.join(", ") : "-"}</td>
                    <td>{occupantName}</td>
                    <td>{methodName}</td>
                    <td className="col-num">{formatTry(row.totalAmount)}</td>
                    <td title={row.description ?? "-"}>{row.description ?? "-"}</td>
                    <td title={row.reference ?? "-"}>{row.reference ?? "-"}</td>
                    <td title={sourceLabel}>{sourceLabel}</td>
                    <td title={row.createdByName ?? "-"}>{row.createdByName ?? "-"}</td>
                    <td>{formatDateTimeTr(row.createdAt)}</td>
                    <td className="actions-cell">
                      <button className="btn btn-ghost" type="button" onClick={() => startEditPaymentListRow(row)}>
                        Duzelt
                      </button>
                      <button className="btn btn-danger" type="button" onClick={() => void deletePaymentListRow(row)}>
                        Sil
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="empty">
                    {paymentListError || "Filtreye uygun tahsilat kaydi yok"}
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
