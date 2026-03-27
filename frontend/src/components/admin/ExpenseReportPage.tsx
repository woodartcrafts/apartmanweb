import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  formatDateTr,
  formatTry,
  paymentMethodEnumOptions,
  type ExpenseItemDefinition,
  type ExpenseReportRow,
  type ExpenseSourceFilter,
  type PaymentMethod,
  type PaymentMethodDefinition,
} from "../../app/shared";

type ExpenseReportFilterState = {
  from: string;
  to: string;
  sources: Array<Exclude<ExpenseSourceFilter, "">>;
  expenseItemIds: string[];
};

type ExpenseReportEditFormState = {
  expenseItemId: string;
  spentAt: string;
  amount: string;
  paymentMethod: PaymentMethod;
  description: string;
  reference: string;
};

type ExpenseReportSummary = {
  rows: Array<{
    expenseItemName: string;
    rowCount: number;
    totalAmount: number;
  }>;
  grandTotal: number;
};

type ExpenseReportSortKey = "spentAt" | "expenseItemName" | "paymentMethod" | "amount" | "description";

type ExpenseReportPageProps = {
  loading: boolean;
  expenseReportFilter: ExpenseReportFilterState;
  setExpenseReportFilter: Dispatch<SetStateAction<ExpenseReportFilterState>>;
  expenseItemOptions: ExpenseItemDefinition[];
  expenseReportItemSummary: ExpenseReportSummary;
  editingExpenseReportId: string | null;
  expenseReportEditForm: ExpenseReportEditFormState;
  setExpenseReportEditForm: Dispatch<SetStateAction<ExpenseReportEditFormState>>;
  paymentMethodOptions: PaymentMethodDefinition[];
  runExpenseReportQuery: () => Promise<void>;
  clearExpenseReportFilters: () => Promise<void>;
  submitExpenseReportRowEdit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  cancelEditExpenseReportRow: () => void;
  toggleExpenseReportSort: (key: ExpenseReportSortKey) => void;
  getExpenseReportSortButtonTitle: (key: ExpenseReportSortKey) => string;
  getExpenseReportSortButtonText: (key: ExpenseReportSortKey) => string;
  sortedExpenseReportRows: ExpenseReportRow[];
  startEditExpenseReportRow: (row: ExpenseReportRow) => void;
  deleteExpenseReportRow: (row: ExpenseReportRow) => Promise<void>;
  expenseReportError: string;
};

export function ExpenseReportPage({
  loading,
  expenseReportFilter,
  setExpenseReportFilter,
  expenseItemOptions,
  expenseReportItemSummary,
  editingExpenseReportId,
  expenseReportEditForm,
  setExpenseReportEditForm,
  paymentMethodOptions,
  runExpenseReportQuery,
  clearExpenseReportFilters,
  submitExpenseReportRowEdit,
  cancelEditExpenseReportRow,
  toggleExpenseReportSort,
  getExpenseReportSortButtonTitle,
  getExpenseReportSortButtonText,
  sortedExpenseReportRows,
  startEditExpenseReportRow,
  deleteExpenseReportRow,
  expenseReportError,
}: ExpenseReportPageProps) {
  const sourceValues: Array<Exclude<ExpenseSourceFilter, "">> = ["MANUAL", "BANK_STATEMENT_UPLOAD", "CHARGE_DISTRIBUTION"];
  const activeExpenseItems =
    expenseItemOptions.filter((x) => x.isActive).length > 0 ? expenseItemOptions.filter((x) => x.isActive) : expenseItemOptions;

  const allSourcesSelected = sourceValues.length > 0 && expenseReportFilter.sources.length === sourceValues.length;
  const allExpenseItemsSelected =
    activeExpenseItems.length > 0 && expenseReportFilter.expenseItemIds.length === activeExpenseItems.length;

  function getSelectionSummary(selectedCount: number, allCount: number, emptyText: string): string {
    if (selectedCount === 0) {
      return emptyText;
    }
    if (allCount > 0 && selectedCount === allCount) {
      return "Hepsi";
    }
    return `${selectedCount} secili`;
  }

  function sourceLabel(value: Exclude<ExpenseSourceFilter, "">): string {
    if (value === "MANUAL") {
      return "Manuel";
    }
    if (value === "BANK_STATEMENT_UPLOAD") {
      return "Banka Ekstresi Upload";
    }
    return "Tahakkuk (Gider)";
  }

  return (
    <section className="dashboard">
      <div className="card table-card">
        <div className="section-head">
          <h3>Gider Raporu</h3>
          <div className="admin-row">
            <button
              data-testid="expense-report-run-trigger"
              className="btn btn-primary btn-run"
              type="button"
              onClick={() => void runExpenseReportQuery()}
            >
              Calistir
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void clearExpenseReportFilters()}>
              Temizle
            </button>
          </div>
        </div>
        <div className="upload-batch-filter-row compact-row-top-gap">
          <label>
            Baslangic Tarihi
            <input
              data-testid="expense-report-from"
              type="date"
              value={expenseReportFilter.from}
              onChange={(e) => setExpenseReportFilter((prev) => ({ ...prev, from: e.target.value }))}
            />
          </label>
          <label>
            Bitis Tarihi
            <input
              data-testid="expense-report-to"
              type="date"
              value={expenseReportFilter.to}
              onChange={(e) => setExpenseReportFilter((prev) => ({ ...prev, to: e.target.value }))}
            />
          </label>
          <label>
            Kaynak
            <details className="filter-dropdown apartment-edit-select-dropdown">
              <summary>{getSelectionSummary(expenseReportFilter.sources.length, sourceValues.length, "Hepsi")}</summary>
              <div className="filter-dropdown-panel apartment-edit-select-list">
                <label className="bulk-filter-option apartment-edit-select-item">
                  <input
                    type="checkbox"
                    checked={allSourcesSelected}
                    onChange={(e) =>
                      setExpenseReportFilter((prev) => ({
                        ...prev,
                        sources: e.target.checked ? sourceValues : [],
                      }))
                    }
                  />
                  Hepsini Sec
                </label>
                {sourceValues.map((value) => {
                  const checked = expenseReportFilter.sources.includes(value);
                  return (
                    <label key={value} className="bulk-filter-option apartment-edit-select-item">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setExpenseReportFilter((prev) => ({
                            ...prev,
                            sources: e.target.checked
                              ? [...prev.sources, value]
                              : prev.sources.filter((x) => x !== value),
                          }))
                        }
                      />
                      {sourceLabel(value)}
                    </label>
                  );
                })}
              </div>
            </details>
          </label>
          <label>
            Gider Kalemi
            <details className="filter-dropdown apartment-edit-select-dropdown">
              <summary>{getSelectionSummary(expenseReportFilter.expenseItemIds.length, activeExpenseItems.length, "Hepsi")}</summary>
              <div className="filter-dropdown-panel apartment-edit-select-list">
                <label className="bulk-filter-option apartment-edit-select-item">
                  <input
                    type="checkbox"
                    checked={allExpenseItemsSelected}
                    onChange={(e) =>
                      setExpenseReportFilter((prev) => ({
                        ...prev,
                        expenseItemIds: e.target.checked ? activeExpenseItems.map((item) => item.id) : [],
                      }))
                    }
                  />
                  Hepsini Sec
                </label>
                {activeExpenseItems.map((item) => {
                  const checked = expenseReportFilter.expenseItemIds.includes(item.id);
                  return (
                    <label key={item.id} className="bulk-filter-option apartment-edit-select-item">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setExpenseReportFilter((prev) => ({
                            ...prev,
                            expenseItemIds: e.target.checked
                              ? [...prev.expenseItemIds, item.id]
                              : prev.expenseItemIds.filter((x) => x !== item.id),
                          }))
                        }
                      />
                      {item.name} ({item.code})
                    </label>
                  );
                })}
              </div>
            </details>
          </label>
        </div>

        <section className="expense-report-summary compact-row-top-gap">
          <div className="expense-report-summary-head">
            <h4>Gider Kalemi Bazli Toplamlar</h4>
            <span className="small">
              Kalem: {expenseReportItemSummary.rows.length} | Toplam: {formatTry(expenseReportItemSummary.grandTotal)}
            </span>
          </div>

          {expenseReportItemSummary.rows.length === 0 ? (
            <p className="small">Ozet gormek icin filtre secip Calistir butonuna basin.</p>
          ) : (
            <div className="table-wrap">
              <table className="apartment-list-table report-compact-table expense-report-summary-table">
                <thead>
                  <tr>
                    <th className="col-num">Sira</th>
                    <th>Gider Kalemi</th>
                    <th className="col-num">Kayit Adedi</th>
                    <th className="col-num">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseReportItemSummary.rows.map((item, index) => (
                    <tr key={`${item.expenseItemName}-${index}`}>
                      <td className="col-num">{index + 1}</td>
                      <td>{item.expenseItemName}</td>
                      <td className="col-num">{item.rowCount}</td>
                      <td className="col-num">{formatTry(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="expense-report-summary-total-row">
                    <td colSpan={3}>Gider Toplami</td>
                    <td className="col-num">{formatTry(expenseReportItemSummary.grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {editingExpenseReportId && (
          <form className="admin-form" onSubmit={submitExpenseReportRowEdit}>
            <h4>Secili Gider Satirini Duzenle</h4>
            <div className="compact-row">
              <label>
                Gider Kalemi
                <select
                  value={expenseReportEditForm.expenseItemId}
                  onChange={(e) => setExpenseReportEditForm((prev) => ({ ...prev, expenseItemId: e.target.value }))}
                  required
                >
                  <option value="">Gider kalemi seciniz</option>
                  {(expenseItemOptions.filter((x) => x.isActive).length > 0
                    ? expenseItemOptions.filter((x) => x.isActive)
                    : expenseItemOptions
                  ).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Gider Tarihi
                <input
                  type="date"
                  value={expenseReportEditForm.spentAt}
                  onChange={(e) => setExpenseReportEditForm((prev) => ({ ...prev, spentAt: e.target.value }))}
                  required
                />
              </label>
            </div>
            <div className="compact-row">
              <label>
                Tutar
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseReportEditForm.amount}
                  onChange={(e) => setExpenseReportEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </label>
              <label>
                Odeme Araci
                <select
                  value={expenseReportEditForm.paymentMethod}
                  onChange={(e) =>
                    setExpenseReportEditForm((prev) => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))
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
                value={expenseReportEditForm.description}
                onChange={(e) => setExpenseReportEditForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
            <label>
              Referans
              <input
                value={expenseReportEditForm.reference}
                onChange={(e) => setExpenseReportEditForm((prev) => ({ ...prev, reference: e.target.value }))}
              />
            </label>
            <div className="compact-row">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                Kaydet
              </button>
              <button className="btn btn-ghost" type="button" onClick={cancelEditExpenseReportRow}>
                Iptal
              </button>
            </div>
          </form>
        )}
        <div className="table-wrap">
          <table data-testid="expense-report-table" className="apartment-list-table report-compact-table expense-report-table">
            <thead>
              <tr>
                <th>
                  <span className="expense-th-head">
                    <span>Gider Tarihi</span>
                    <button
                      type="button"
                      className="btn btn-ghost expense-sort-btn"
                      onClick={() => toggleExpenseReportSort("spentAt")}
                      title={getExpenseReportSortButtonTitle("spentAt")}
                    >
                      {getExpenseReportSortButtonText("spentAt")}
                    </button>
                  </span>
                </th>
                <th>
                  <span className="expense-th-head">
                    <span>Gider Kalemi</span>
                    <button
                      type="button"
                      className="btn btn-ghost expense-sort-btn"
                      onClick={() => toggleExpenseReportSort("expenseItemName")}
                      title={getExpenseReportSortButtonTitle("expenseItemName")}
                    >
                      {getExpenseReportSortButtonText("expenseItemName")}
                    </button>
                  </span>
                </th>
                <th>
                  <span className="expense-th-head">
                    <span>Odeme Araci</span>
                    <button
                      type="button"
                      className="btn btn-ghost expense-sort-btn"
                      onClick={() => toggleExpenseReportSort("paymentMethod")}
                      title={getExpenseReportSortButtonTitle("paymentMethod")}
                    >
                      {getExpenseReportSortButtonText("paymentMethod")}
                    </button>
                  </span>
                </th>
                <th className="col-num">
                  <span className="expense-th-head">
                    <span>Tutar</span>
                    <button
                      type="button"
                      className="btn btn-ghost expense-sort-btn"
                      onClick={() => toggleExpenseReportSort("amount")}
                      title={getExpenseReportSortButtonTitle("amount")}
                    >
                      {getExpenseReportSortButtonText("amount")}
                    </button>
                  </span>
                </th>
                <th>
                  <span className="expense-th-head">
                    <span>Aciklama</span>
                    <button
                      type="button"
                      className="btn btn-ghost expense-sort-btn"
                      onClick={() => toggleExpenseReportSort("description")}
                      title={getExpenseReportSortButtonTitle("description")}
                    >
                      {getExpenseReportSortButtonText("description")}
                    </button>
                  </span>
                </th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenseReportRows.map((row) => {
                const methodName = paymentMethodOptions.find((x) => x.code === row.paymentMethod)?.name ?? row.paymentMethod;

                return (
                  <tr key={row.id}>
                    <td>{formatDateTr(row.spentAt)}</td>
                    <td>{row.expenseItemName}</td>
                    <td>{methodName}</td>
                    <td className="col-num">{formatTry(row.amount)}</td>
                    <td className="expense-report-description" title={row.description ?? "-"}>{row.description ?? "-"}</td>
                    <td className="actions-cell">
                      <button className="btn btn-ghost" type="button" onClick={() => startEditExpenseReportRow(row)}>
                        Duzelt
                      </button>
                      <button className="btn btn-danger" type="button" onClick={() => void deleteExpenseReportRow(row)}>
                        Sil
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sortedExpenseReportRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    {expenseReportError || "Gider kaydi yok"}
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
