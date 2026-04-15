import { useState, type FormEvent } from "react";
import { type ApartmentOption } from "../../app/shared";

type OpeningEntryType = "ALACAK" | "FAZLA_ODEME";

type OpeningEntryForm = {
  entryType: OpeningEntryType;
  apartmentId: string;
  amount: string;
  entryDate: string;
  reference: string;
  note: string;
};

type OpeningEntryPageProps = {
  loading: boolean;
  apartmentOptions: ApartmentOption[];
  onCreateOpeningEntry: (payload: {
    entryType: OpeningEntryType;
    apartmentId: string;
    amount: string;
    entryDate: string;
    reference: string;
    note: string;
  }) => Promise<void>;
};

export function OpeningEntryPage({
  loading,
  apartmentOptions,
  onCreateOpeningEntry,
}: OpeningEntryPageProps) {
  const [form, setForm] = useState<OpeningEntryForm>({
    entryType: "ALACAK",
    apartmentId: "",
    amount: "",
    entryDate: "",
    reference: "",
    note: "",
  });

  const parseTrDecimal = (value: string): number => {
    const raw = value.trim().replace(/\s+/g, "");
    if (!raw) return Number.NaN;
    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");
    if (hasComma && hasDot) {
      if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
        return Number(raw.replace(/\./g, "").replace(/,/g, "."));
      }
      return Number(raw.replace(/,/g, ""));
    }
    if (hasComma) return Number(raw.replace(/,/g, "."));
    return Number(raw);
  };

  const formatTrDecimal = (value: number): string =>
    new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  function reset(): void {
    setForm({
      entryType: "ALACAK",
      apartmentId: "",
      amount: "",
      entryDate: "",
      reference: "",
      note: "",
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    await onCreateOpeningEntry({ ...form });
    reset();
  }

  const isSubmitDisabled =
    loading ||
    !form.apartmentId ||
    !form.amount.trim() ||
    !form.entryDate;

  return (
    <section className="dashboard opening-entry-page">
      <div className="card admin-form apartment-form-surface">
        <div className="section-head">
          <h3>Açılış Kaydı</h3>
          <p className="small opening-entry-disclaimer">
            ⚠️ Bu sayfa <strong>yalnızca yeni dönem açılışında</strong> kullanılır. Girilen kayıtlar yasal deftere
            yansımaz; kapama ve eşleştirme işlemlerinin doğru çalışması için kullanılır.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <section className="payment-entry-form-section opening-entry-type-section">
            <div className="payment-entry-form-section-head">
              <h4>Kayıt Türü</h4>
              <p className="small">Açılış kaydının türünü seçin</p>
            </div>

            <div className="opening-entry-type-grid">
              <label
                className={`opening-entry-type-card${form.entryType === "ALACAK" ? " opening-entry-type-card-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="entryType"
                  value="ALACAK"
                  checked={form.entryType === "ALACAK"}
                  onChange={() => setForm((prev) => ({ ...prev, entryType: "ALACAK" }))}
                />
                <span className="opening-entry-type-icon">📥</span>
                <span className="opening-entry-type-label">Alacak</span>
                <span className="opening-entry-type-desc small">
                  Ödenmeyen aidatlar ve borçlar — Dairenin bakiyesi eksik
                </span>
              </label>

              <label
                className={`opening-entry-type-card${form.entryType === "FAZLA_ODEME" ? " opening-entry-type-card-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="entryType"
                  value="FAZLA_ODEME"
                  checked={form.entryType === "FAZLA_ODEME"}
                  onChange={() => setForm((prev) => ({ ...prev, entryType: "FAZLA_ODEME" }))}
                />
                <span className="opening-entry-type-icon">📤</span>
                <span className="opening-entry-type-label">Fazla Ödeme</span>
                <span className="opening-entry-type-desc small">
                  Önceki dönemden kalan fazla ödeme — Dairenin alacağı var
                </span>
              </label>
            </div>
          </section>

          <section className="payment-entry-form-section">
            <div className="payment-entry-form-section-head">
              <h4>Kayıt Bilgileri</h4>
            </div>

            <div className="payment-entry-inline-grid payment-entry-inline-grid-bottom">
              <label>
                Daire
                <select
                  value={form.apartmentId}
                  onChange={(e) => setForm((prev) => ({ ...prev, apartmentId: e.target.value }))}
                  required
                >
                  <option value="">Daire seçiniz</option>
                  {apartmentOptions.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.blockName} / {apt.doorNo}
                      {apt.ownerFullName ? ` / ${apt.ownerFullName}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tutar (₺)
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  placeholder="0,00"
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  onBlur={(e) => {
                    const parsed = parseTrDecimal(e.target.value);
                    if (Number.isFinite(parsed) && parsed > 0) {
                      setForm((prev) => ({ ...prev, amount: formatTrDecimal(parsed) }));
                    }
                  }}
                  required
                />
              </label>

              <label>
                İşlem Tarihi
                <input
                  type="date"
                  value={form.entryDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, entryDate: e.target.value }))}
                  required
                />
              </label>

              <label>
                Referans No
                <input
                  type="text"
                  value={form.reference}
                  placeholder="Opsiyonel"
                  onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
                />
              </label>

              <label>
                Açıklama
                <input
                  type="text"
                  value={form.note}
                  placeholder="Opsiyonel"
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                />
              </label>
            </div>
          </section>

          <div className="opening-entry-actions admin-row">
            <button className="btn btn-primary" type="submit" disabled={isSubmitDisabled}>
              {form.entryType === "ALACAK" ? "Alacak Kaydı Oluştur" : "Fazla Ödeme Kaydı Oluştur"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={reset} disabled={loading}>
              Temizle
            </button>
          </div>
        </form>
      </div>

      <div className="card admin-form apartment-form-surface opening-entry-info-card">
        <h4>ℹ️ Kullanım Kılavuzu</h4>
        <ul className="small opening-entry-info-list">
          <li>
            <strong>Alacak</strong>: Önceki dönemden devredilen ödenmemiş aidat veya borçlar için kullanılır. Kayıt
            oluşturulduğunda mevcut açık tahakkuklarla otomatik eşleştirilir.
          </li>
          <li>
            <strong>Fazla Ödeme</strong>: Önceki dönemde gereğinden fazla ödeme yapan daireler için kullanılır. Kayıt,
            gelecekteki tahakkuklara uygulanmak üzere beklemede kalır.
          </li>
          <li>
            Bu kayıtlar <strong>banka bakiyesini etkilemez</strong> ve yasal deftere yansımaz.
          </li>
          <li>
            Açılış kaydı yalnızca <strong>bir kere</strong> yapılmalıdır. Mükerrer kayıt oluşturmaktan kaçının.
          </li>
        </ul>
      </div>
    </section>
  );
}
