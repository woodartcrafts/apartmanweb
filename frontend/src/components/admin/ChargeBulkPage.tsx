import { useState, type FormEvent } from "react";
import {
  monthOptions,
  type ApartmentClassDefinition,
  type ApartmentDutyDefinition,
  type ApartmentType,
  type BulkPricingMode,
  type ChargeTypeDefinition,
  type OccupancyType,
} from "../../app/shared";

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
    apartmentClassId?: string;
    apartmentDutyId?: string;
    occupancyType?: OccupancyType;
    amount?: number;
    amountByType?: { KUCUK: number; BUYUK: number };
    skipIfExists: boolean;
  }) => Promise<void>;
  apartmentClassOptions: ApartmentClassDefinition[];
  apartmentDutyOptions: ApartmentDutyDefinition[];
};

export function ChargeBulkPage({
  loading,
  chargeTypeOptions,
  apartmentClassOptions,
  apartmentDutyOptions,
  onCreateBulkCharge,
}: ChargeBulkPageProps) {
  const [bulkChargeForm, setBulkChargeForm] = useState({
    periodYear: String(new Date().getFullYear()),
    periodMonths: [new Date().getMonth() + 1] as number[],
    chargeTypeId: "",
    dueDateByMonth: {} as Record<string, string>,
    description: "",
    apartmentType: "ALL" as "ALL" | ApartmentType,
    apartmentClassId: "",
    apartmentDutyId: "",
    occupancyType: "ALL" as "ALL" | OccupancyType,
    pricingMode: "UNIFORM" as BulkPricingMode,
    amount: "",
    amountKucuk: "",
    amountBuyuk: "",
    skipIfExists: true,
  });

  const activeChargeTypes = chargeTypeOptions.filter((x) => x.isActive);
  const filteredChargeTypes = activeChargeTypes.length > 0 ? activeChargeTypes : chargeTypeOptions;
  const selectedChargeTypeId = bulkChargeForm.chargeTypeId || filteredChargeTypes[0]?.id || "";

  function getMonthSelectionSummary(): string {
    if (bulkChargeForm.periodMonths.length === 0) {
      return "Ay seciniz";
    }
    if (bulkChargeForm.periodMonths.length === monthOptions.length) {
      return "Tum aylar";
    }
    return bulkChargeForm.periodMonths.join(", ");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    const payload: {
      chargeTypeId: string;
      periodYear: number;
      periodMonths: number[];
      dueDateByMonth: Record<string, string>;
      description?: string;
      apartmentType?: ApartmentType;
      apartmentClassId?: string;
      apartmentDutyId?: string;
      occupancyType?: OccupancyType;
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

    if (bulkChargeForm.apartmentClassId) {
      payload.apartmentClassId = bulkChargeForm.apartmentClassId;
    }

    if (bulkChargeForm.apartmentDutyId) {
      payload.apartmentDutyId = bulkChargeForm.apartmentDutyId;
    }

    if (bulkChargeForm.occupancyType !== "ALL") {
      payload.occupancyType = bulkChargeForm.occupancyType;
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
    <form className="card admin-form charge-bulk-form-surface" onSubmit={(e) => void onSubmit(e)}>
      <h3>Toplu Tahakkuk Olustur</h3>

      <section className="charge-bulk-form-section">
        <div className="charge-bulk-form-section-head">
          <h4>🎯 Donem ve Hedef</h4>
          <p className="small">Toplu tahakkugun hangi donem ve hangi daire grubu icin olusacagini secin.</p>
        </div>

        <div className="charge-bulk-goal-row">
          <div className="charge-bulk-top-row">
            <label>
              Yil
              <input
                type="number"
                value={bulkChargeForm.periodYear}
                onChange={(e) => setBulkChargeForm((prev) => ({ ...prev, periodYear: e.target.value }))}
                required
              />
            </label>

            <div className="filter-dropdown-field charge-bulk-month-filter">
              <span>Ay Secimi (Birden cok secilebilir)</span>
              <details className="filter-dropdown apartment-edit-select-dropdown">
                <summary>{getMonthSelectionSummary()}</summary>
                <div className="filter-dropdown-panel apartment-edit-select-list charge-bulk-month-panel">
                  <label className="bulk-filter-option apartment-edit-select-item">
                    <input
                      type="checkbox"
                      checked={bulkChargeForm.periodMonths.length === monthOptions.length}
                      onChange={(e) =>
                        setBulkChargeForm((prev) => ({
                          ...prev,
                          periodMonths: e.target.checked ? [...monthOptions] : [],
                        }))
                      }
                    />
                    Hepsini Sec
                  </label>

                  {monthOptions.map((month) => {
                    const checked = bulkChargeForm.periodMonths.includes(month);
                    return (
                      <label key={month} className="bulk-filter-option apartment-edit-select-item">
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
                        Ay {month}
                      </label>
                    );
                  })}
                </div>
              </details>
            </div>
          </div>

          <div className="charge-bulk-type-row">
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
            Daire Sinifi
            <select
              value={bulkChargeForm.apartmentClassId}
              onChange={(e) => setBulkChargeForm((prev) => ({ ...prev, apartmentClassId: e.target.value }))}
            >
              <option value="">Tum Siniflar</option>
              {apartmentClassOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Daire Gorevi
            <select
              value={bulkChargeForm.apartmentDutyId}
              onChange={(e) => setBulkChargeForm((prev) => ({ ...prev, apartmentDutyId: e.target.value }))}
            >
              <option value="">Tum Gorevler</option>
              {apartmentDutyOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ev Durumu
            <select
              value={bulkChargeForm.occupancyType}
              onChange={(e) => setBulkChargeForm((prev) => ({ ...prev, occupancyType: e.target.value as "ALL" | OccupancyType }))}
            >
              <option value="ALL">Tum Durumlar</option>
              <option value="OWNER">Ev Sahibi</option>
              <option value="TENANT">Kiraci</option>
            </select>
          </label>
          </div>
        </div>
      </section>

      <section className="charge-bulk-form-section">
        <div className="charge-bulk-form-section-head">
          <h4>💸 Tutar ve Vade</h4>
          <p className="small">Aylik vade tarihleri ve tutar modelini belirleyin.</p>
        </div>

        <div className="charge-bulk-finance-row">
          <label className="charge-bulk-due-dates-field">
            Son Odeme Tarihleri (Ay bazli)
            <div className="month-date-grid charge-bulk-date-grid">
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
            <div className="charge-bulk-amount-split">
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

          <label>
            Aciklama
            <input
              value={bulkChargeForm.description}
              onChange={(e) => setBulkChargeForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Opsiyonel"
            />
          </label>
        </div>
      </section>

      <section className="charge-bulk-form-section">
        <div className="charge-bulk-form-section-head">
          <h4>✅ Islem Kurali</h4>
          <p className="small">Ayni donemde mevcut kayitlar icin davranisi belirleyin.</p>
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={bulkChargeForm.skipIfExists}
            onChange={(e) => setBulkChargeForm((prev) => ({ ...prev, skipIfExists: e.target.checked }))}
          />
          Varsa ayni donem tahakkugunu atla
        </label>
      </section>

      <div className="admin-row">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          Toplu Tahakkuk Baslat
        </button>
      </div>
    </form>
  );
}
