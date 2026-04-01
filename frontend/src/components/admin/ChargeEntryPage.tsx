import { useState, type FormEvent } from "react";
import { dateInputToIso, type ApartmentOption, type ChargeTypeDefinition } from "../../app/shared";

type ChargeEntryFormRow = {
  periodMonth: string;
  amount: string;
  dueDate: string;
  description: string;
};

type ChargeEntryPageProps = {
  loading: boolean;
  apartmentOptions: ApartmentOption[];
  chargeTypeOptions: ChargeTypeDefinition[];
  onCreateCharge: (payload: {
    apartmentIds: string[];
    chargeTypeId: string;
    periodYear: number;
    entries: Array<{
      periodMonth: number;
      amount: number;
      dueDate: string;
      description?: string;
    }>;
  }) => Promise<void>;
};

export function ChargeEntryPage({ loading, apartmentOptions, chargeTypeOptions, onCreateCharge }: ChargeEntryPageProps) {
  const [chargeForm, setChargeForm] = useState({
    apartmentIds: [] as string[],
    chargeTypeId: "",
    periodYear: String(new Date().getFullYear()),
  });
  const [formError, setFormError] = useState("");

  const [chargeEntries, setChargeEntries] = useState<ChargeEntryFormRow[]>([
    {
      periodMonth: "",
      amount: "",
      dueDate: "",
      description: "",
    },
  ]);

  const apartmentValues = apartmentOptions.map((apt) => apt.id);
  const allApartmentsSelected =
    apartmentValues.length > 0 && chargeForm.apartmentIds.length === apartmentValues.length;
  const firstActiveChargeTypeId = (chargeTypeOptions.find((x) => x.isActive) ?? chargeTypeOptions[0])?.id ?? "";
  const selectedChargeTypeId = chargeForm.chargeTypeId || firstActiveChargeTypeId;

  function resetForm(): void {
    setFormError("");
    setChargeForm({
      apartmentIds: [],
      chargeTypeId: "",
      periodYear: String(new Date().getFullYear()),
    });
    setChargeEntries([
      {
        periodMonth: "",
        amount: "",
        dueDate: "",
        description: "",
      },
    ]);
  }

  function getApartmentSelectionSummary(): string {
    if (chargeForm.apartmentIds.length === 0) {
      return "Daire seciniz";
    }
    if (allApartmentsSelected) {
      return "Hepsi";
    }
    return `${chargeForm.apartmentIds.length} secili`;
  }

  function addChargeEntry(): void {
    setChargeEntries((prev) => [
      ...prev,
      {
        periodMonth: "",
        amount: "",
        dueDate: "",
        description: "",
      },
    ]);
  }

  function removeChargeEntry(index: number): void {
    setChargeEntries((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  function updateChargeEntry(index: number, field: keyof ChargeEntryFormRow, value: string): void {
    setChargeEntries((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFormError("");

    if (chargeEntries.length === 0) {
      setFormError("En az bir tahakkuk satiri ekleyin");
      return;
    }

    if (chargeForm.apartmentIds.length === 0) {
      setFormError("En az bir daire seciniz");
      return;
    }

    let entries: Array<{
      periodMonth: number;
      amount: number;
      dueDate: string;
      description?: string;
    }>;

    try {
      entries = chargeEntries.map((entry, index) => {
        if (!entry.periodMonth || !entry.amount || !entry.dueDate) {
          throw new Error(`Satir ${index + 1}: ay, tutar ve son odeme tarihi zorunlu`);
        }

        return {
          periodMonth: Number(entry.periodMonth),
          amount: Number(entry.amount),
          dueDate: dateInputToIso(entry.dueDate),
          description: entry.description || undefined,
        };
      });

      await onCreateCharge({
        apartmentIds: chargeForm.apartmentIds,
        chargeTypeId: selectedChargeTypeId,
        periodYear: Number(chargeForm.periodYear),
        entries,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Tahakkuk olusturulamadi");
      return;
    }

    setChargeEntries([
      {
        periodMonth: "",
        amount: "",
        dueDate: "",
        description: "",
      },
    ]);
  }

  return (
    <form className="card admin-form charge-entry-form-surface" onSubmit={(e) => void onSubmit(e)}>
      <div className="section-head">
        <h3>Tahakkuk Girisi</h3>
        <div className="admin-row">
          <button data-testid="charge-submit" className="btn btn-primary" type="submit" disabled={loading}>
            Tahakkuk Kaydet
          </button>
          <button className="btn btn-ghost" type="button" onClick={resetForm} disabled={loading}>
            Temizle
          </button>
        </div>
      </div>

      <section className="charge-entry-form-section">
        <div className="charge-entry-form-section-head">
          <h4>🏢 Tahakkuk Hedefi</h4>
          <p className="small">Daire secimi, yil ve tahakkuk tipi bilgileri</p>
        </div>

        <div className="charge-entry-top-row">
          <div className="filter-dropdown-field charge-entry-apartment-filter">
            <span>Daire No</span>
            <details data-testid="charge-apartment-dropdown" className="filter-dropdown apartment-edit-select-dropdown">
              <summary data-testid="charge-apartment-summary">{getApartmentSelectionSummary()}</summary>
              <div className="filter-dropdown-panel apartment-edit-select-list">
                <label className="bulk-filter-option apartment-edit-select-item">
                  <input
                    data-testid="charge-apartment-select-all"
                    type="checkbox"
                    checked={allApartmentsSelected}
                    onChange={(e) =>
                      setChargeForm((prev) => ({
                        ...prev,
                        apartmentIds: e.target.checked ? apartmentValues : [],
                      }))
                    }
                  />
                  Hepsini Sec
                </label>
                {apartmentOptions.map((apt) => {
                  const checked = chargeForm.apartmentIds.includes(apt.id);
                  return (
                    <label key={apt.id} className="bulk-filter-option apartment-edit-select-item">
                      <input
                        data-testid="charge-apartment-option"
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setChargeForm((prev) => ({
                            ...prev,
                            apartmentIds: e.target.checked
                              ? [...prev.apartmentIds, apt.id]
                              : prev.apartmentIds.filter((x) => x !== apt.id),
                          }))
                        }
                      />
                      {apt.blockName} / {apt.doorNo} / {apt.type}
                      {apt.ownerFullName ? ` / ${apt.ownerFullName}` : ""}
                    </label>
                  );
                })}
              </div>
            </details>
          </div>

          <label>
            Yil
            <input
              data-testid="charge-period-year"
              type="number"
              value={chargeForm.periodYear}
              onChange={(e) => setChargeForm((prev) => ({ ...prev, periodYear: e.target.value }))}
              required
            />
          </label>

          <label>
            Tip
            <select
              data-testid="charge-type-select"
              value={selectedChargeTypeId}
              onChange={(e) => setChargeForm((prev) => ({ ...prev, chargeTypeId: e.target.value }))}
              required
            >
              <option value="">Tahakkuk tipi seciniz</option>
              {chargeTypeOptions
                .filter((x) => x.isActive)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} ({x.code})
                  </option>
                ))}
            </select>
          </label>
        </div>
      </section>

      <section className="charge-entry-form-section">
        <div className="charge-entry-header">
          <div>
            <h4 className="charge-entry-title">🧾 Tahakkuk Satirlari</h4>
            <p className="small charge-entry-help">Ayni daire icin birden fazla ay, farkli son odeme tarihi ve farkli aciklama girebilirsin.</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={addChargeEntry}>
            Satir Ekle
          </button>
        </div>

        <div className="card charge-entry-panel">
          {chargeEntries.map((entry, index) => (
            <div key={`${index}-${entry.periodMonth}`} className="card charge-entry-row-card">
              <div className="charge-entry-row-fields">
                <label>
                  Ay
                  <select
                    data-testid={`charge-row-${index}-month`}
                    value={entry.periodMonth}
                    onChange={(e) => updateChargeEntry(index, "periodMonth", e.target.value)}
                    required
                  >
                    <option value="">Ay seciniz</option>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = String(i + 1);
                      return (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label>
                  Tutar
                  <input
                    data-testid={`charge-row-${index}-amount`}
                    type="number"
                    step="0.01"
                    value={entry.amount}
                    onChange={(e) => updateChargeEntry(index, "amount", e.target.value)}
                    required
                  />
                </label>

                <label>
                  Son Odeme Tarihi
                  <input
                    data-testid={`charge-row-${index}-due-date`}
                    type="date"
                    value={entry.dueDate}
                    onChange={(e) => updateChargeEntry(index, "dueDate", e.target.value)}
                    required
                  />
                </label>

                <label>
                  Aciklama
                  <input
                    data-testid={`charge-row-${index}-description`}
                    value={entry.description}
                    onChange={(e) => updateChargeEntry(index, "description", e.target.value)}
                    placeholder="Opsiyonel"
                  />
                </label>

                <div className="charge-entry-row-delete">
                  <button className="btn btn-danger" type="button" onClick={() => removeChargeEntry(index)} disabled={chargeEntries.length <= 1}>
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {formError ? <p className="small-error">{formError}</p> : null}
    </form>
  );
}
