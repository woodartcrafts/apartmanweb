import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  paymentMethodEnumOptions,
  type PaymentMethod,
  type PaymentMethodDefinition,
} from "../../app/shared";

type PaymentMethodFormState = {
  code: PaymentMethod;
  name: string;
  isActive: boolean;
};

type PaymentMethodManagementPageProps = {
  loading: boolean;
  editingPaymentMethodId: string | null;
  paymentMethodForm: PaymentMethodFormState;
  setPaymentMethodForm: Dispatch<SetStateAction<PaymentMethodFormState>>;
  paymentMethodOptions: PaymentMethodDefinition[];
  onSubmitPaymentMethod: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  cancelEditPaymentMethod: () => void;
  startEditPaymentMethod: (item: PaymentMethodDefinition) => void;
  deletePaymentMethod: (item: PaymentMethodDefinition) => Promise<void>;
};

export function PaymentMethodManagementPage({
  loading,
  editingPaymentMethodId,
  paymentMethodForm,
  setPaymentMethodForm,
  paymentMethodOptions,
  onSubmitPaymentMethod,
  cancelEditPaymentMethod,
  startEditPaymentMethod,
  deletePaymentMethod,
}: PaymentMethodManagementPageProps) {
  return (
    <section className="dashboard compact-management-page">
      <form className="card admin-form" onSubmit={onSubmitPaymentMethod}>
        <h3>{editingPaymentMethodId ? "Tahsilat Tipi Degistir" : "Tahsilat Tipi Ekle"}</h3>
        <div className="apartment-class-form-inline">
          <label>
            Kod
            <select
              value={paymentMethodForm.code}
              onChange={(e) => setPaymentMethodForm((prev) => ({ ...prev, code: e.target.value as PaymentMethod }))}
            >
              {paymentMethodEnumOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ad
            <input
              value={paymentMethodForm.name}
              onChange={(e) => setPaymentMethodForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Banka Havalesi"
              required
            />
          </label>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={paymentMethodForm.isActive}
            onChange={(e) => setPaymentMethodForm((prev) => ({ ...prev, isActive: e.target.checked }))}
          />
          Aktif
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {editingPaymentMethodId ? "Degisiklikleri Kaydet" : "Tip Ekle"}
        </button>
        {editingPaymentMethodId && (
          <button className="btn btn-ghost" type="button" onClick={cancelEditPaymentMethod}>
            Iptal
          </button>
        )}
      </form>

      <div className="card table-card">
        <h3>Tahsilat Tipi Listesi</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kod</th>
                <th>Ad</th>
                <th>Durum</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {paymentMethodOptions.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.isActive ? "Aktif" : "Pasif"}</td>
                  <td className="actions-cell">
                    <button className="btn btn-ghost" type="button" onClick={() => startEditPaymentMethod(item)}>
                      Degistir
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => void deletePaymentMethod(item)}>
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {paymentMethodOptions.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    Tahsilat tipi yok
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
