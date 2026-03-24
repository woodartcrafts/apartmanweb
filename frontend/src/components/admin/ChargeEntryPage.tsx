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
    apartmentId: string;
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
    apartmentId: "",
    chargeTypeId: "",
    periodYear: String(new Date().getFullYear()),
  });
  const [formError, setFormError] = useState("");

  const [chargeEntries, setChargeEntries] = useState<ChargeEntryFormRow[]>([
    {
      periodMonth: String(new Date().getMonth() + 1),
      amount: "",
      dueDate: "",
      description: "",
    },
  ]);

  const firstApartmentId = apartmentOptions[0]?.id ?? "";
  const firstActiveChargeTypeId = (chargeTypeOptions.find((x) => x.isActive) ?? chargeTypeOptions[0])?.id ?? "";
  const selectedApartmentId = chargeForm.apartmentId || firstApartmentId;
  const selectedChargeTypeId = chargeForm.chargeTypeId || firstActiveChargeTypeId;

  function addChargeEntry(): void {
    setChargeEntries((prev) => [
      ...prev,
      {
        periodMonth: String(new Date().getMonth() + 1),
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
        apartmentId: selectedApartmentId,
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
        periodMonth: String(new Date().getMonth() + 1),
        amount: "",
        dueDate: "",
        description: "",
      },
    ]);
  }

  return (
    <form className="card admin-form" onSubmit={(e) => void onSubmit(e)}>
      <h3>Tahakkuk Girisi</h3>
      <label>
        Apartment
        <select
          value={selectedApartmentId}
          onChange={(e) => setChargeForm((prev) => ({ ...prev, apartmentId: e.target.value }))}
          required
        >
          <option value="">Daire seciniz</option>
          {apartmentOptions.map((apt) => (
            <option key={apt.id} value={apt.id}>
              {apt.blockName} / {apt.doorNo} / {apt.type}
              {apt.ownerFullName ? ` / ${apt.ownerFullName}` : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="compact-row">
        <label>
          Yil
          <input
            type="number"
            value={chargeForm.periodYear}
            onChange={(e) => setChargeForm((prev) => ({ ...prev, periodYear: e.target.value }))}
            required
          />
        </label>
      </div>
      <label>
        Tip
        <select
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
      <div className="card charge-entry-panel">
        <div className="charge-entry-header">
          <h4 className="charge-entry-title">Tahakkuk Satirlari</h4>
          <button className="btn btn-ghost" type="button" onClick={addChargeEntry}>
            Satir Ekle
          </button>
        </div>
        <p className="small charge-entry-help">Ayni daire icin birden fazla ay, farkli son odeme tarihi ve farkli aciklama girebilirsin.</p>

        {chargeEntries.map((entry, index) => (
          <div key={`${index}-${entry.periodMonth}`} className="card charge-entry-row-card">
            <div className="charge-entry-row-head">
              <strong>Satir {index + 1}</strong>
              <button className="btn btn-danger" type="button" onClick={() => removeChargeEntry(index)} disabled={chargeEntries.length <= 1}>
                Sil
              </button>
            </div>

            <div className="compact-row">
              <label>
                Ay
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={entry.periodMonth}
                  onChange={(e) => updateChargeEntry(index, "periodMonth", e.target.value)}
                  required
                />
              </label>
              <label>
                Tutar
                <input
                  type="number"
                  step="0.01"
                  value={entry.amount}
                  onChange={(e) => updateChargeEntry(index, "amount", e.target.value)}
                  required
                />
              </label>
            </div>

            <label>
              Son Odeme Tarihi
              <input
                type="date"
                value={entry.dueDate}
                onChange={(e) => updateChargeEntry(index, "dueDate", e.target.value)}
                required
              />
            </label>

            <label>
              Aciklama
              <input
                value={entry.description}
                onChange={(e) => updateChargeEntry(index, "description", e.target.value)}
                placeholder="Opsiyonel"
              />
            </label>
          </div>
        ))}
      </div>
      {formError ? <p className="small-error">{formError}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={loading}>
        Tahakkuk Kaydet
      </button>
    </form>
  );
}
