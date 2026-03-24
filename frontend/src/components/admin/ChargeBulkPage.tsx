import { useState, type FormEvent } from "react";
import { monthOptions, type ApartmentType, type BulkPricingMode, type ChargeTypeDefinition } from "../../app/shared";

type ChargeBulkPageProps = {
  loading: boolean;
  chargeTypeOptions: ChargeTypeDefinition[];
  onCreateBulkCharge: (payload: {
    chargeTypeId: string;
    periodYear: number;
    periodMonths: number[];
    dueDateByMonth: Record<string, string>;
    description?: string;
    apartmentType?: ApartmentType;
    amount?: number;
    amountByType?: { KUCUK: number; BUYUK: number };
    skipIfExists: boolean;
  }) => Promise<void>;
};

export function ChargeBulkPage({ loading, chargeTypeOptions, onCreateBulkCharge }: ChargeBulkPageProps) {
  const [bulkChargeForm, setBulkChargeForm] = useState({
    periodYear: String(new Date().getFullYear()),
    periodMonths: [new Date().getMonth() + 1] as number[],
    chargeTypeId: "",
    dueDateByMonth: {} as Record<string, string>,
    description: "",
    apartmentType: "ALL" as "ALL" | ApartmentType,
    pricingMode: "UNIFORM" as BulkPricingMode,
    amount: "",
    amountKucuk: "",
    amountBuyuk: "",
    skipIfExists: true,
  });

  const activeChargeTypes = chargeTypeOptions.filter((x) => x.isActive);
  const filteredChargeTypes = activeChargeTypes.length > 0 ? activeChargeTypes : chargeTypeOptions;
  const selectedChargeTypeId = bulkChargeForm.chargeTypeId || filteredChargeTypes[0]?.id || "";

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    const payload: {
      chargeTypeId: string;
      periodYear: number;
      periodMonths: number[];
      dueDateByMonth: Record<string, string>;
      description?: string;
      apartmentType?: ApartmentType;
      amount?: number;
      amountByType?: { KUCUK: number; BUYUK: number };
      skipIfExists: boolean;
    } = {
      chargeTypeId: selectedChargeTypeId,
      periodYear: Number(bulkChargeForm.periodYear),
      periodMonths: bulkChargeForm.periodMonths,
      dueDateByMonth: bulkChargeForm.dueDateByMonth,
      description: bulkChargeForm.description || undefined,
      skipIfExists: bulkChargeForm.skipIfExists,
    };

    if (bulkChargeForm.apartmentType !== "ALL") {
      payload.apartmentType = bulkChargeForm.apartmentType;
    }

    if (bulkChargeForm.pricingMode === "UNIFORM") {
      payload.amount = Number(bulkChargeForm.amount);
    } else {
      payload.amountByType = {
        KUCUK: Number(bulkChargeForm.amountKucuk),
        BUYUK: Number(bulkChargeForm.amountBuyuk),
      };
    }

    await onCreateBulkCharge(payload);
  }

  return (
    <form className="card admin-form" onSubmit={(e) => void onSubmit(e)}>
      <h3>Toplu Tahakkuk Olustur</h3>
      <div className="compact-row">
        <label>
          Yil
          <input
            type="number"
            value={bulkChargeForm.periodYear}
            onChange={(e) => setBulkChargeForm((prev) => ({ ...prev, periodYear: e.target.value }))}
            required
          />
        </label>
      </div>

      <label>
        Ay Secimi (Birden cok secilebilir)
        <div className="month-grid">
          {monthOptions.map((month) => {
            const checked = bulkChargeForm.periodMonths.includes(month);
            return (
              <label key={month} className="month-chip">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setBulkChargeForm((prev) => {
                      const next = e.target.checked
                        ? [...prev.periodMonths, month]
                        : prev.periodMonths.filter((m) => m !== month);
                      return { ...prev, periodMonths: [...new Set(next)].sort((a, b) => a - b) };
                    });
                  }}
                />
                {month}
              </label>
            );
          })}
        </div>
      </label>

      <label>
        Tahakkuk Tipi
        <select
          value={selectedChargeTypeId}
          onChange={(e) => setBulkChargeForm((prev) => ({ ...prev, chargeTypeId: e.target.value }))}
          required
        >
          <option value="">Tahakkuk tipi seciniz</option>
          {filteredChargeTypes.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} ({x.code})
            </option>
          ))}
        </select>
      </label>

      <label>
        Hedef Daire Tipi
        <select
          value={bulkChargeForm.apartmentType}
          onChange={(e) =>
            setBulkChargeForm((prev) => ({
              ...prev,
              apartmentType: e.target.value as "ALL" | ApartmentType,
            }))
          }
        >
          <option value="ALL">Tum Daireler</option>
          <option value="BUYUK">Sadece BUYUK</option>
          <option value="KUCUK">Sadece KUCUK</option>
        </select>
      </label>

      <label>
        Son Odeme Tarihleri (Ay bazli)
        <div className="month-date-grid">
          {bulkChargeForm.periodMonths.length === 0 && <p className="small">Tarih girmek icin once ay secin.</p>}
          {bulkChargeForm.periodMonths.map((month) => (
            <label key={month}>
              Ay {month}
              <input
                type="date"
                value={bulkChargeForm.dueDateByMonth[String(month)] ?? ""}
                onChange={(e) =>
                  setBulkChargeForm((prev) => ({
                    ...prev,
                    dueDateByMonth: {
                      ...prev.dueDateByMonth,
                      [String(month)]: e.target.value,
                    },
                  }))
                }
                required
              />
            </label>
          ))}
        </div>
      </label>

      <label>
        Aciklama
        <input
          value={bulkChargeForm.description}
          onChange={(e) => setBulkChargeForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Opsiyonel"
        />
      </label>

      <label>
        Fiyatlama
        <select
          value={bulkChargeForm.pricingMode}
          onChange={(e) => setBulkChargeForm((prev) => ({ ...prev, pricingMode: e.target.value as BulkPricingMode }))}
        >
          <option value="UNIFORM">Tum daireler ayni tutar</option>
          <option value="BY_TYPE">Kucuk/Buyuk farkli tutar</option>
        </select>
      </label>

      {bulkChargeForm.pricingMode === "UNIFORM" ? (
        <label>
          Ortak Tutar
          <input
            type="number"
            step="0.01"
            value={bulkChargeForm.amount}
            onChange={(e) => setBulkChargeForm((prev) => ({ ...prev, amount: e.target.value }))}
            required
          />
        </label>
      ) : (
        <div className="compact-row">
          <label>
            Kucuk Daire Tutari
            <input
              type="number"
              step="0.01"
              value={bulkChargeForm.amountKucuk}
              onChange={(e) => setBulkChargeForm((prev) => ({ ...prev, amountKucuk: e.target.value }))}
              required
            />
          </label>
          <label>
            Buyuk Daire Tutari
            <input
              type="number"
              step="0.01"
              value={bulkChargeForm.amountBuyuk}
              onChange={(e) => setBulkChargeForm((prev) => ({ ...prev, amountBuyuk: e.target.value }))}
              required
            />
          </label>
        </div>
      )}

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={bulkChargeForm.skipIfExists}
          onChange={(e) => setBulkChargeForm((prev) => ({ ...prev, skipIfExists: e.target.checked }))}
        />
        Varsa ayni donem tahakkugunu atla
      </label>

      <button className="btn btn-primary" type="submit" disabled={loading}>
        Toplu Tahakkuk Baslat
      </button>
    </form>
  );
}
