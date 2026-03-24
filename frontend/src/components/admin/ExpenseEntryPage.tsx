import { useState, type FormEvent } from "react";
import {
  type ExpenseItemDefinition,
  type PaymentMethod,
  type PaymentMethodDefinition,
} from "../../app/shared";

type ExpenseFormState = {
  expenseItemId: string;
  spentAt: string;
  amount: string;
  paymentMethod: PaymentMethod;
  description: string;
  reference: string;
};

type ExpenseEntryPageProps = {
  loading: boolean;
  expenseItemOptions: ExpenseItemDefinition[];
  paymentMethodOptions: PaymentMethodDefinition[];
  onSubmitExpense: (payload: ExpenseFormState) => Promise<void>;
};

export function ExpenseEntryPage({
  loading,
  expenseItemOptions,
  paymentMethodOptions,
  onSubmitExpense,
}: ExpenseEntryPageProps) {
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>({
    expenseItemId: "",
    spentAt: "",
    amount: "",
    paymentMethod: "CASH",
    description: "",
    reference: "",
  });
  const activeOrAllExpenseItems =
    expenseItemOptions.filter((x) => x.isActive).length > 0
      ? expenseItemOptions.filter((x) => x.isActive)
      : expenseItemOptions;
  const activeOrAllMethods =
    paymentMethodOptions.filter((x) => x.isActive).length > 0
      ? paymentMethodOptions.filter((x) => x.isActive)
      : paymentMethodOptions;
  const selectedExpenseItemId = expenseForm.expenseItemId || activeOrAllExpenseItems[0]?.id || "";
  const selectedPaymentMethod = expenseForm.paymentMethod || activeOrAllMethods[0]?.code || "CASH";

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    await onSubmitExpense({
      ...expenseForm,
      expenseItemId: selectedExpenseItemId,
      paymentMethod: selectedPaymentMethod,
    });
    setExpenseForm((prev) => ({
      ...prev,
      spentAt: "",
      amount: "",
      description: "",
      reference: "",
    }));
  }

  return (
    <section className="dashboard">
      <form className="card admin-form" onSubmit={(e) => void onSubmit(e)}>
        <h3>Gider Girisi</h3>
        <label>
          Gider Kalemi
          <select
            value={selectedExpenseItemId}
            onChange={(e) => setExpenseForm((prev) => ({ ...prev, expenseItemId: e.target.value }))}
            required
          >
            <option value="">Kalem seciniz</option>
            {activeOrAllExpenseItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tarih
          <input
            type="date"
            value={expenseForm.spentAt}
            onChange={(e) => setExpenseForm((prev) => ({ ...prev, spentAt: e.target.value }))}
            required
          />
        </label>
        <label>
          Tutar
          <input
            type="number"
            step="0.01"
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
            required
          />
        </label>
        <label>
          Odeme Araci
          <select
            value={selectedPaymentMethod}
            onChange={(e) => setExpenseForm((prev) => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))}
          >
            {activeOrAllMethods.map((item) => (
              <option key={item.id} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Aciklama
          <input
            value={expenseForm.description}
            onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Opsiyonel"
          />
        </label>
        <label>
          Referans
          <input
            value={expenseForm.reference}
            onChange={(e) => setExpenseForm((prev) => ({ ...prev, reference: e.target.value }))}
            placeholder="Fis no, EFT no vb."
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          Gideri Kaydet
        </button>
      </form>
    </section>
  );
}
