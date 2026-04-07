import { useMemo, useState } from "react";
import {
  formatDateTimeTr,
  formatTry,
  type ApartmentOption,
  type ExpenseItemDefinition,
  type UnclassifiedExpenseRow,
  type UnclassifiedPaymentRow,
} from "../../app/shared";

type UnclassifiedItemsPageProps = {
  loading: boolean;
  pageLoading: boolean;
  paymentRows: UnclassifiedPaymentRow[];
  expenseRows: UnclassifiedExpenseRow[];
  apartmentOptions: ApartmentOption[];
  expenseItemOptions: ExpenseItemDefinition[];
  refresh: () => Promise<void>;
  savePaymentDoorNo: (row: UnclassifiedPaymentRow, doorNo: string) => Promise<void>;
  saveExpenseItem: (row: UnclassifiedExpenseRow, expenseItemId: string) => Promise<void>;
};

type MixedRow =
  | {
      kind: "PAYMENT";
      id: string;
      occurredAt: string;
      amount: number;
      sourceLabel: string;
      description: string;
      reference: string;
      payment: UnclassifiedPaymentRow;
    }
  | {
      kind: "EXPENSE";
      id: string;
      occurredAt: string;
      amount: number;
      sourceLabel: string;
      description: string;
      reference: string;
      expense: UnclassifiedExpenseRow;
    };

function toPaymentSourceLabel(source: UnclassifiedPaymentRow["source"]): string {
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

function toExpenseSourceLabel(source: UnclassifiedExpenseRow["source"]): string {
  if (source === "GMAIL") {
    return "Gmail";
  }
  if (source === "BANK_STATEMENT_UPLOAD") {
    return "Banka Ekstresi Upload";
  }
  if (source === "CHARGE_DISTRIBUTION") {
    return "Tahakkuk Dagitimi";
  }
  return "Manuel";
}

function normalizeDoorNo(value: string): string {
  return value.trim().replace(/\s+/g, "").toLocaleLowerCase("tr");
}

export function UnclassifiedItemsPage({
  loading,
  pageLoading,
  paymentRows,
  expenseRows,
  apartmentOptions,
  expenseItemOptions,
  refresh,
  savePaymentDoorNo,
  saveExpenseItem,
}: UnclassifiedItemsPageProps) {
  const [paymentDoorDrafts, setPaymentDoorDrafts] = useState<Record<string, string>>({});
  const [expenseItemDrafts, setExpenseItemDrafts] = useState<Record<string, string>>({});

  const activeExpenseItems =
    expenseItemOptions.filter((x) => x.isActive).length > 0 ? expenseItemOptions.filter((x) => x.isActive) : expenseItemOptions;

  const rows = useMemo(() => {
    const paymentMapped: MixedRow[] = paymentRows.map((payment) => ({
      kind: "PAYMENT",
      id: payment.id,
      occurredAt: payment.paidAt,
      amount: payment.totalAmount,
      sourceLabel: toPaymentSourceLabel(payment.source),
      description: payment.description ?? "-",
      reference: payment.reference ?? "-",
      payment,
    }));

    const expenseMapped: MixedRow[] = expenseRows.map((expense) => ({
      kind: "EXPENSE",
      id: expense.id,
      occurredAt: expense.spentAt,
      amount: expense.amount,
      sourceLabel: toExpenseSourceLabel(expense.source),
      description: expense.description ?? "-",
      reference: expense.reference ?? "-",
      expense,
    }));

    return [...paymentMapped, ...expenseMapped].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [expenseRows, paymentRows]);

  const apartmentByDoorNo = useMemo(() => {
    const map = new Map<string, ApartmentOption>();
    for (const apt of apartmentOptions) {
      map.set(normalizeDoorNo(apt.doorNo), apt);
    }
    return map;
  }, [apartmentOptions]);

  return (
    <section className="dashboard report-page unclassified-page">
      <div className="card table-card report-page-card">
        <div className="section-head report-toolbar">
          <h3>Siniflandirilamayanlar</h3>
          <div className="admin-row">
            <button className="btn btn-primary btn-run" type="button" onClick={() => void refresh()} disabled={loading || pageLoading}>
              {pageLoading ? "Yukleniyor..." : "Yenile"}
            </button>
          </div>
        </div>

        <p className="small">
          Bu ekranda sadece siniflandirilamayan kayitlar listelenir. Tahsilatta sadece daire no, giderde sadece gider kalemi
          duzeltilir.
        </p>

        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table unclassified-table">
            <thead>
              <tr>
                <th>Tip</th>
                <th>Tarih</th>
                <th className="col-num">Tutar</th>
                <th>Kaynak</th>
                <th>Aciklama</th>
                <th>Referans</th>
                <th>Mevcut</th>
                <th>Duzeltme</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty">Siniflandirilamayan kayit bulunmuyor.</td>
                </tr>
              ) : (
                rows.map((row) => {
                  if (row.kind === "PAYMENT") {
                    const draftDoor = paymentDoorDrafts[row.id] ?? row.payment.apartments[0] ?? "";
                    const matchedApartment = apartmentByDoorNo.get(normalizeDoorNo(draftDoor));
                    const apartmentHint = matchedApartment
                      ? `${matchedApartment.blockName}/${matchedApartment.doorNo}${matchedApartment.ownerFullName ? ` - ${matchedApartment.ownerFullName}` : ""}`
                      : "Daire bulunamadi";

                    return (
                      <tr key={`payment-${row.id}`}>
                        <td>Tahsilat</td>
                        <td>{formatDateTimeTr(row.occurredAt)}</td>
                        <td className="col-num">{formatTry(row.amount)}</td>
                        <td>{row.sourceLabel}</td>
                        <td className="unclassified-col-ellipsis" title={row.description}>{row.description}</td>
                        <td className="unclassified-col-ellipsis" title={row.reference}>{row.reference}</td>
                        <td>{row.payment.apartments.length > 0 ? row.payment.apartments.join(", ") : "-"}</td>
                        <td>
                          <div className="unclassified-inline-edit">
                            <input
                              type="text"
                              placeholder="Daire no"
                              value={draftDoor}
                              onChange={(e) =>
                                setPaymentDoorDrafts((prev) => ({
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
                            disabled={loading || !draftDoor.trim()}
                            onClick={() => void savePaymentDoorNo(row.payment, draftDoor)}
                          >
                            Kaydet
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  const draftExpenseItemId = expenseItemDrafts[row.id] ?? row.expense.expenseItemId;
                  return (
                    <tr key={`expense-${row.id}`}>
                      <td>Gider</td>
                      <td>{formatDateTimeTr(row.occurredAt)}</td>
                      <td className="col-num">{formatTry(row.amount)}</td>
                      <td>{row.sourceLabel}</td>
                      <td className="unclassified-col-ellipsis" title={row.description}>{row.description}</td>
                      <td className="unclassified-col-ellipsis" title={row.reference}>{row.reference}</td>
                      <td>{row.expense.expenseItemName}</td>
                      <td>
                        <div className="unclassified-inline-edit">
                          <select
                            value={draftExpenseItemId}
                            onChange={(e) =>
                              setExpenseItemDrafts((prev) => ({
                                ...prev,
                                [row.id]: e.target.value,
                              }))
                            }
                          >
                            {activeExpenseItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-primary"
                          type="button"
                          disabled={loading || !draftExpenseItemId}
                          onClick={() => void saveExpenseItem(row.expense, draftExpenseItemId)}
                        >
                          Kaydet
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
