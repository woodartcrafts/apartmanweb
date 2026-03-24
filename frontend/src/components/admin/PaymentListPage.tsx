import type { Dispatch, FormEvent, SetStateAction } from "react";
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
};

type PaymentListEditFormState = {
  paidAt: string;
  amount: string;
  method: PaymentMethod;
  description: string;
  reference: string;
  apartmentId: string;
};

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
  return (
    <section className="dashboard">
      <div className="card table-card">
        <div className="section-head">
          <h3>Odeme Listesi</h3>
          <div className="admin-row">
            <button className="btn btn-primary btn-run" type="button" onClick={() => void runPaymentListQuery()}>
              Calistir
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void clearPaymentListFilters()}>
              Temizle
            </button>
          </div>
        </div>
        <div className="payment-list-filter-row compact-row-top-gap">
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
              <option value="BANK_STATEMENT_UPLOAD">Banka Ekstresi Upload</option>
            </select>
          </label>
        </div>
        {editingPaymentListId && (
          <form className="admin-form" onSubmit={submitPaymentListRowEdit}>
            <h4>Secili Odeme Satirini Duzenle</h4>
            <div className="compact-row">
              <label>
                Odeme Tarihi
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
            {(editingPaymentListSource === "BANK_STATEMENT_UPLOAD" || editingPaymentListSource === "PAYMENT_UPLOAD") && (
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
              <button className="btn btn-ghost" type="button" onClick={cancelEditPaymentListRow}>
                Iptal
              </button>
            </div>
          </form>
        )}
        <div className="table-wrap">
          <table className="apartment-list-table report-compact-table payment-list-table">
            <thead>
              <tr>
                <th>Odeme Tarihi</th>
                <th>D.No</th>
                <th>Ynt.</th>
                <th className="col-num">Tutar</th>
                <th>Aciklama</th>
                <th>Referans</th>
                <th>Kaynak</th>
                <th>Kim Girdi</th>
                <th>Giris Zamani</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {paymentListRows.map((row) => {
                const methodName = paymentMethodOptions.find((x) => x.code === row.method)?.name ?? row.method;
                const sourceLabel =
                  row.source === "BANK_STATEMENT_UPLOAD"
                    ? "Banka Ekstresi Upload"
                    : row.source === "PAYMENT_UPLOAD"
                      ? "Toplu Odeme Upload"
                      : "Manuel";

                return (
                  <tr key={row.id}>
                    <td>{formatDateTr(row.paidAt)}</td>
                    <td>{row.apartments.length > 0 ? row.apartments.join(", ") : "-"}</td>
                    <td>{methodName}</td>
                    <td className="col-num">{formatTry(row.totalAmount)}</td>
                    <td>{row.description ?? "-"}</td>
                    <td>{row.reference ?? "-"}</td>
                    <td>{sourceLabel}</td>
                    <td>{row.createdByName ?? "-"}</td>
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
              {paymentListRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="empty">
                    {paymentListError || "Odeme kaydi yok"}
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
