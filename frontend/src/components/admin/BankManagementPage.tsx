import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { BankDefinition } from "../../app/shared";

type BankFormState = {
  name: string;
  isActive: boolean;
};

type BankBranchFormState = {
  bankId: string;
  name: string;
  branchCode: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  phone: string;
  email: string;
  address: string;
  representativeName: string;
  representativePhone: string;
  representativeEmail: string;
  notes: string;
  isActive: boolean;
};

type BankBranchRow = BankDefinition["branches"][number];

type BankManagementPageProps = {
  editingBankId: string | null;
  editingBankBranchId: string | null;
  bankForm: BankFormState;
  setBankForm: Dispatch<SetStateAction<BankFormState>>;
  bankBranchForm: BankBranchFormState;
  setBankBranchForm: Dispatch<SetStateAction<BankBranchFormState>>;
  bankOptions: BankDefinition[];
  loading: boolean;
  onSubmitBank: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  onSubmitBankBranch: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  cancelEditBank: () => void;
  cancelEditBankBranch: () => void;
  startEditBank: (bank: BankDefinition) => void;
  deleteBank: (bank: BankDefinition) => Promise<void>;
  startEditBankBranch: (branch: BankBranchRow) => void;
  deleteBankBranch: (branch: BankBranchRow) => Promise<void>;
};

export function BankManagementPage({
  editingBankId,
  editingBankBranchId,
  bankForm,
  setBankForm,
  bankBranchForm,
  setBankBranchForm,
  bankOptions,
  loading,
  onSubmitBank,
  onSubmitBankBranch,
  cancelEditBank,
  cancelEditBankBranch,
  startEditBank,
  deleteBank,
  startEditBankBranch,
  deleteBankBranch,
}: BankManagementPageProps) {
  function clearBankForm(): void {
    if (editingBankId) {
      cancelEditBank();
      return;
    }
    setBankForm({ name: "", isActive: true });
  }

  function clearBankBranchForm(): void {
    if (editingBankBranchId) {
      cancelEditBankBranch();
      return;
    }
    setBankBranchForm({
      bankId: "",
      name: "",
      branchCode: "",
      accountName: "",
      accountNumber: "",
      iban: "",
      phone: "",
      email: "",
      address: "",
      representativeName: "",
      representativePhone: "",
      representativeEmail: "",
      notes: "",
      isActive: true,
    });
  }

  const bankBranches = bankOptions
    .flatMap((bank) => bank.branches)
    .sort((a, b) => {
      const bankCompare = a.bankName.localeCompare(b.bankName, "tr");
      if (bankCompare !== 0) {
        return bankCompare;
      }
      return a.name.localeCompare(b.name, "tr");
    });

  return (
    <section className="dashboard compact-management-page bank-management-page">
      <form className="card admin-form apartment-form-surface bank-form-surface" onSubmit={onSubmitBank}>
        <div className="section-head">
          <h3>{editingBankId ? "Banka Degistir" : "Banka Ekle"}</h3>
          <div className="admin-row">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {editingBankId ? "Degisiklikleri Kaydet" : "Banka Ekle"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={clearBankForm}>
              Temizle
            </button>
          </div>
        </div>
        <p className="small">Banka kartini olusturun, sonrasinda bu bankaya sube ekleyin.</p>
        <div className="bank-form-row">
          <label>
            Banka Adi
            <input
              value={bankForm.name}
              onChange={(e) => setBankForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ornek: Ziraat"
              required
            />
          </label>
          <label className="checkbox-row bank-form-active">
            <input
              type="checkbox"
              checked={bankForm.isActive}
              onChange={(e) => setBankForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            Aktif
          </label>
        </div>
      </form>

      <div className="card table-card bank-table-card">
        <div className="section-head">
          <h3>Banka Listesi</h3>
          <p className="small">Toplam {bankOptions.length} banka</p>
        </div>
        <div className="table-wrap">
          <table className="filter-table">
            <thead>
              <tr>
                <th>Banka</th>
                <th>Sube</th>
                <th>Durum</th>
                <th>Sube Sayisi</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {bankOptions.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.branches.length > 0 ? item.branches.map((branch) => branch.name).join(", ") : "-"}</td>
                  <td>{item.isActive ? "Aktif" : "Pasif"}</td>
                  <td>{item.branchCount}</td>
                  <td className="actions-cell">
                    <button className="btn btn-ghost" type="button" onClick={() => startEditBank(item)}>
                      Degistir
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => void deleteBank(item)}>
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {bankOptions.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    Banka kaydi yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <form className="card admin-form apartment-form-surface bank-branch-form-surface" onSubmit={onSubmitBankBranch}>
        <div className="section-head">
          <h3>{editingBankBranchId ? "Sube Degistir" : "Sube Ekle"}</h3>
          <div className="admin-row">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {editingBankBranchId ? "Degisiklikleri Kaydet" : "Sube Ekle"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={clearBankBranchForm}>
              Temizle
            </button>
          </div>
        </div>
        <p className="small">Sube kartini adim adim doldurun. Sadece gerekli alanlari doldurup kaydedebilirsiniz.</p>

        <div className="bank-branch-grid">
          <div className="apartment-form-section">
            <div className="apartment-form-section-head">
              <h4>Temel Bilgiler</h4>
            </div>
            <div className="bank-branch-fields bank-branch-fields-core">
              <label>
                Banka
                <select
                  value={bankBranchForm.bankId}
                  onChange={(e) => setBankBranchForm((prev) => ({ ...prev, bankId: e.target.value }))}
                  required
                >
                  <option value="">Banka seciniz</option>
                  {bankOptions.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sube Adi
                <input
                  value={bankBranchForm.name}
                  onChange={(e) => setBankBranchForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ornek: Cengelkoy"
                  required
                />
              </label>
              <label>
                Sube Kodu
                <input
                  value={bankBranchForm.branchCode}
                  onChange={(e) => setBankBranchForm((prev) => ({ ...prev, branchCode: e.target.value }))}
                  placeholder="0012"
                />
              </label>
              <label className="checkbox-row bank-branch-active">
                <input
                  type="checkbox"
                  checked={bankBranchForm.isActive}
                  onChange={(e) => setBankBranchForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Aktif
              </label>
            </div>
          </div>

          <div className="apartment-form-section">
            <div className="apartment-form-section-head">
              <h4>Hesap Bilgileri</h4>
            </div>
            <div className="bank-branch-fields bank-branch-fields-account">
              <label>
                Hesap Adi
                <input
                  value={bankBranchForm.accountName}
                  onChange={(e) => setBankBranchForm((prev) => ({ ...prev, accountName: e.target.value }))}
                  placeholder="Ornek: Apartman Isletme Hesabi"
                />
              </label>
              <label>
                Hesap Numarasi
                <input
                  value={bankBranchForm.accountNumber}
                  onChange={(e) => setBankBranchForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
                  placeholder="12345678"
                />
              </label>
              <label>
                IBAN
                <input
                  value={bankBranchForm.iban}
                  onChange={(e) => setBankBranchForm((prev) => ({ ...prev, iban: e.target.value }))}
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                />
              </label>
            </div>
          </div>

          <div className="apartment-form-section">
            <div className="apartment-form-section-head">
              <h4>Iletisim ve Temsilci</h4>
            </div>
            <div className="bank-branch-fields bank-branch-fields-contact">
              <label>
                Telefon
                <input
                  value={bankBranchForm.phone}
                  onChange={(e) => setBankBranchForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="0212 000 00 00"
                />
              </label>
              <label>
                E-posta
                <input
                  value={bankBranchForm.email}
                  onChange={(e) => setBankBranchForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="sube@banka.com"
                />
              </label>
              <label>
                Musteri Temsilcisi
                <input
                  value={bankBranchForm.representativeName}
                  onChange={(e) => setBankBranchForm((prev) => ({ ...prev, representativeName: e.target.value }))}
                  placeholder="Ad Soyad"
                />
              </label>
              <label>
                Temsilci Telefon
                <input
                  value={bankBranchForm.representativePhone}
                  onChange={(e) => setBankBranchForm((prev) => ({ ...prev, representativePhone: e.target.value }))}
                  placeholder="05xx xxx xx xx"
                />
              </label>
              <label>
                Temsilci E-posta
                <input
                  value={bankBranchForm.representativeEmail}
                  onChange={(e) => setBankBranchForm((prev) => ({ ...prev, representativeEmail: e.target.value }))}
                  placeholder="temsilci@banka.com"
                />
              </label>
              <label>
                Adres
                <input
                  value={bankBranchForm.address}
                  onChange={(e) => setBankBranchForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Sube adresi"
                />
              </label>
            </div>
          </div>
        </div>

        <label>
          Not
          <textarea
            value={bankBranchForm.notes}
            onChange={(e) => setBankBranchForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={3}
            placeholder="Ek bilgi"
          />
        </label>

      </form>

      <div className="card table-card bank-table-card">
        <div className="section-head">
          <h3>Sube Listesi</h3>
          <p className="small">Toplam {bankBranches.length} sube</p>
        </div>
        <div className="table-wrap">
          <table className="filter-table">
            <thead>
              <tr>
                <th>Banka</th>
                <th>Sube</th>
                <th>Kod</th>
                <th>Hesap Adi</th>
                <th>Hesap No</th>
                <th>Telefon</th>
                <th>E-posta</th>
                <th>Temsilci</th>
                <th>Durum</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {bankBranches.map((item) => (
                <tr key={item.id}>
                  <td>{item.bankName}</td>
                  <td>{item.name}</td>
                  <td>{item.branchCode ?? "-"}</td>
                  <td>{item.accountName ?? "-"}</td>
                  <td>{item.accountNumber ?? "-"}</td>
                  <td>{item.phone ?? "-"}</td>
                  <td>{item.email ?? "-"}</td>
                  <td>{item.representativeName ?? "-"}</td>
                  <td>{item.isActive ? "Aktif" : "Pasif"}</td>
                  <td className="actions-cell">
                    <button className="btn btn-ghost" type="button" onClick={() => startEditBankBranch(item)}>
                      Degistir
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => void deleteBankBranch(item)}>
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {bankBranches.length === 0 && (
                <tr>
                  <td colSpan={10} className="empty">
                    Sube kaydi yok
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
