import { useMemo, useState } from "react";
import { apiBase, formatDateTimeTr, type ApartmentChangeLogRow, type ApartmentOption } from "../../app/shared";

type ApartmentChangeHistoryPageProps = {
  apartmentOptions: ApartmentOption[];
};

type ChangeHistorySortKey = "changedAt" | "apartment" | "actor" | "action" | "field" | "before" | "after";

const FIELD_LABELS: Record<string, string> = {
  blockName: "Blok",
  doorNo: "Daire No",
  type: "Tip",
  apartmentClassId: "Daire Sinifi ID",
  apartmentClassCode: "Daire Sinifi Kodu",
  apartmentClassName: "Daire Sinifi",
  apartmentDutyId: "Daire Gorevi ID",
  apartmentDutyCode: "Daire Gorevi Kodu",
  apartmentDutyName: "Daire Gorevi",
  hasAidat: "Aidat Aktif",
  hasDogalgaz: "Dogalgaz Aktif",
  hasOtherDues: "Diger Borclar Aktif",
  hasIncome: "Gelir Aktif",
  hasExpenses: "Gider Aktif",
  ownerFullName: "Oturan/Malik",
  occupancyType: "Ev Durumu",
  moveInDate: "Tasinma Tarihi",
  email1: "E-Posta 1",
  email2: "E-Posta 2",
  email3: "E-Posta 3",
  phone1: "Telefon 1",
  phone2: "Telefon 2",
  phone3: "Telefon 3",
  landlordFullName: "Ev Sahibi",
  landlordPhone: "Ev Sahibi Telefon",
  landlordEmail: "Ev Sahibi E-Posta",
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "Evet" : "Hayir";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((x) => displayValue(x)).join(", ") : "-";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function ApartmentChangeHistoryPage({ apartmentOptions }: ApartmentChangeHistoryPageProps) {
  const [selectedApartmentIds, setSelectedApartmentIds] = useState<string[]>([]);
  const [changedAtFrom, setChangedAtFrom] = useState("");
  const [changedAtTo, setChangedAtTo] = useState("");
  const [rows, setRows] = useState<ApartmentChangeLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Daire secip gecmisi getirin");
  const [sort, setSort] = useState<{ key: ChangeHistorySortKey; direction: "asc" | "desc" }>({
    key: "changedAt",
    direction: "desc",
  });

  const selectedApartments = useMemo(
    () => apartmentOptions.filter((x) => selectedApartmentIds.includes(x.id)),
    [apartmentOptions, selectedApartmentIds]
  );

  const allApartmentIds = useMemo(() => apartmentOptions.map((x) => x.id), [apartmentOptions]);
  const areAllApartmentsSelected = apartmentOptions.length > 0 && selectedApartmentIds.length === apartmentOptions.length;

  const apartmentLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const apt of apartmentOptions) {
      map.set(apt.id, `${apt.blockName}/${apt.doorNo}${apt.ownerFullName ? ` - ${apt.ownerFullName}` : ""}`);
    }
    return map;
  }, [apartmentOptions]);

  const selectedApartmentSummary = useMemo(() => {
    if (selectedApartments.length === 0) {
      return "";
    }
    if (selectedApartments.length <= 3) {
      return selectedApartments.map((x) => `${x.blockName}/${x.doorNo}`).join(", ");
    }
    return `${selectedApartments.length} daire secili`;
  }, [selectedApartments]);

  function getSortButtonText(key: ChangeHistorySortKey): string {
    if (sort.key !== key) {
      return "|";
    }
    return sort.direction === "asc" ? "^" : "v";
  }

  function getSortButtonTitle(key: ChangeHistorySortKey): string {
    if (sort.key !== key) {
      return "Sirala";
    }
    return sort.direction === "asc" ? "Artan siralama" : "Azalan siralama";
  }

  function toggleSort(key: ChangeHistorySortKey): void {
    setSort((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        key,
        direction: "asc",
      };
    });
  }

  const sortedRows = useMemo(() => {
    const getFirstField = (row: ApartmentChangeLogRow) => row.changedFields[0] ?? "(alan bilgisi yok)";
    const getFieldLabel = (row: ApartmentChangeLogRow) => {
      const field = getFirstField(row);
      return FIELD_LABELS[field] ?? field;
    };
    const getBeforeValue = (row: ApartmentChangeLogRow) => {
      const field = getFirstField(row);
      return field === "(alan bilgisi yok)" ? "-" : displayValue(row.before[field]);
    };
    const getAfterValue = (row: ApartmentChangeLogRow) => {
      const field = getFirstField(row);
      return field === "(alan bilgisi yok)" ? "-" : displayValue(row.after[field]);
    };

    const list = [...rows];
    list.sort((a, b) => {
      let compare = 0;
      switch (sort.key) {
        case "changedAt": {
          compare = new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime();
          break;
        }
        case "apartment": {
          const aText = apartmentLabelById.get(a.apartmentId) ?? "";
          const bText = apartmentLabelById.get(b.apartmentId) ?? "";
          compare = aText.localeCompare(bText, "tr", { sensitivity: "base", numeric: true });
          break;
        }
        case "actor": {
          const aText = a.changedByName ?? a.changedByEmail ?? "";
          const bText = b.changedByName ?? b.changedByEmail ?? "";
          compare = aText.localeCompare(bText, "tr", { sensitivity: "base", numeric: true });
          break;
        }
        case "action": {
          compare = a.action.localeCompare(b.action, "tr", { sensitivity: "base", numeric: true });
          break;
        }
        case "field": {
          compare = getFieldLabel(a).localeCompare(getFieldLabel(b), "tr", { sensitivity: "base", numeric: true });
          break;
        }
        case "before": {
          compare = getBeforeValue(a).localeCompare(getBeforeValue(b), "tr", { sensitivity: "base", numeric: true });
          break;
        }
        case "after": {
          compare = getAfterValue(a).localeCompare(getAfterValue(b), "tr", { sensitivity: "base", numeric: true });
          break;
        }
      }

      if (compare === 0) {
        compare = a.id.localeCompare(b.id, "tr", { sensitivity: "base", numeric: true });
      }

      return sort.direction === "asc" ? compare : -compare;
    });
    return list;
  }, [apartmentLabelById, rows, sort.direction, sort.key]);

  async function fetchHistory(): Promise<void> {
    if (selectedApartmentIds.length === 0) {
      setMessage("Lutfen en az bir daire secin");
      return;
    }
    if (changedAtFrom && changedAtTo && changedAtFrom > changedAtTo) {
      setMessage("Degisiklik tarihi araliginda baslangic tarihi, bitis tarihinden buyuk olamaz");
      return;
    }

    setLoading(true);
    setMessage("Degisiklik gecmisi yukleniyor...");
    try {
      const results = await Promise.allSettled(
        selectedApartmentIds.map(async (apartmentId) => {
          const res = await fetch(`${apiBase}/api/admin/apartments/${apartmentId}/change-logs?limit=500`, {
            credentials: "include",
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as { message?: string };
            throw new Error(body.message ?? "Degisiklik gecmisi alinamadi");
          }
          return (await res.json()) as ApartmentChangeLogRow[];
        })
      );

      const successRows = results
        .filter((x): x is PromiseFulfilledResult<ApartmentChangeLogRow[]> => x.status === "fulfilled")
        .flatMap((x) => x.value)
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

      const fromTime = changedAtFrom ? new Date(`${changedAtFrom}T00:00:00`).getTime() : null;
      const toTime = changedAtTo ? new Date(`${changedAtTo}T23:59:59.999`).getTime() : null;

      const filteredRows = successRows.filter((row) => {
        const changedAtMs = new Date(row.changedAt).getTime();
        if (fromTime !== null && changedAtMs < fromTime) {
          return false;
        }
        if (toTime !== null && changedAtMs > toTime) {
          return false;
        }
        return true;
      });

      const failedCount = results.filter((x) => x.status === "rejected").length;

      setRows(filteredRows);
      setMessage(
        failedCount > 0
          ? `Degisiklik satiri: ${filteredRows.length} (Hata alinan daire: ${failedCount})`
          : `Degisiklik satiri: ${filteredRows.length}`
      );
    } catch (err) {
      console.error(err);
      setRows([]);
      setMessage(err instanceof Error ? err.message : "Degisiklik gecmisi alinamadi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="dashboard">
      <div className="card admin-tools apartment-history-tools">
        <h3>Daire Degisiklik Gecmisi</h3>
        <div className="admin-row">
          <label className="filter-dropdown-field">
            Daireler
            <details className="filter-dropdown apartment-edit-select-dropdown">
              <summary>{selectedApartmentIds.length === 0 ? "Daire seciniz" : `${selectedApartmentIds.length} daire secili`}</summary>
              <div className="filter-dropdown-panel apartment-edit-select-list">
                <label className="bulk-filter-option apartment-edit-select-item">
                  <input
                    type="checkbox"
                    checked={areAllApartmentsSelected}
                    onChange={(e) => setSelectedApartmentIds(e.target.checked ? allApartmentIds : [])}
                  />
                  Hepsini Sec
                </label>
                {apartmentOptions.map((apt) => {
                  const checked = selectedApartmentIds.includes(apt.id);
                  return (
                    <label key={apt.id} className="bulk-filter-option apartment-edit-select-item">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setSelectedApartmentIds((prev) =>
                            isChecked ? (prev.includes(apt.id) ? prev : [...prev, apt.id]) : prev.filter((id) => id !== apt.id)
                          );
                        }}
                      />
                      {apt.blockName}/{apt.doorNo}
                      {apt.ownerFullName ? ` - ${apt.ownerFullName}` : ""}
                    </label>
                  );
                })}
              </div>
            </details>
          </label>
          <label className="apartment-history-date-field">
            Degisiklik Tarihi
            <div className="apartment-history-date-grid">
              <input type="date" value={changedAtFrom} onChange={(e) => setChangedAtFrom(e.target.value)} />
              <input type="date" value={changedAtTo} onChange={(e) => setChangedAtTo(e.target.value)} />
            </div>
          </label>
          <button className="btn btn-primary" type="button" onClick={() => void fetchHistory()} disabled={loading}>
            Calistir
          </button>
        </div>
        {selectedApartmentSummary && <p className="small">Secili daireler: {selectedApartmentSummary}</p>}
        <p className="small">{message}</p>
      </div>

      <div className="card table-card">
        <h3>
          Degisiklikler
          {selectedApartmentSummary ? ` - ${selectedApartmentSummary}` : ""}
        </h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <span className="apartment-list-th-head">
                    <span>Degisiklik Tarihi</span>
                    <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("changedAt")} title={getSortButtonTitle("changedAt")}>
                      {getSortButtonText("changedAt")}
                    </button>
                  </span>
                </th>
                <th>
                  <span className="apartment-list-th-head">
                    <span>Daire</span>
                    <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("apartment")} title={getSortButtonTitle("apartment")}>
                      {getSortButtonText("apartment")}
                    </button>
                  </span>
                </th>
                <th>
                  <span className="apartment-list-th-head">
                    <span>Yapan</span>
                    <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("actor")} title={getSortButtonTitle("actor")}>
                      {getSortButtonText("actor")}
                    </button>
                  </span>
                </th>
                <th>
                  <span className="apartment-list-th-head">
                    <span>Islem</span>
                    <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("action")} title={getSortButtonTitle("action")}>
                      {getSortButtonText("action")}
                    </button>
                  </span>
                </th>
                <th>
                  <span className="apartment-list-th-head">
                    <span>Alan</span>
                    <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("field")} title={getSortButtonTitle("field")}>
                      {getSortButtonText("field")}
                    </button>
                  </span>
                </th>
                <th>
                  <span className="apartment-list-th-head">
                    <span>Onceki Bilgi</span>
                    <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("before")} title={getSortButtonTitle("before")}>
                      {getSortButtonText("before")}
                    </button>
                  </span>
                </th>
                <th>
                  <span className="apartment-list-th-head">
                    <span>Yeni Bilgi</span>
                    <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("after")} title={getSortButtonTitle("after")}>
                      {getSortButtonText("after")}
                    </button>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const fields = row.changedFields.length > 0 ? row.changedFields : ["(alan bilgisi yok)"];
                return fields.map((field, index) => {
                  const beforeValue = field === "(alan bilgisi yok)" ? "-" : displayValue(row.before[field]);
                  const afterValue = field === "(alan bilgisi yok)" ? "-" : displayValue(row.after[field]);

                  return (
                    <tr key={`${row.id}-${field}-${index}`}>
                      {index === 0 && (
                        <>
                          <td rowSpan={fields.length}>{formatDateTimeTr(row.changedAt)}</td>
                          <td rowSpan={fields.length}>{apartmentLabelById.get(row.apartmentId) ?? "-"}</td>
                          <td rowSpan={fields.length}>{row.changedByName ?? row.changedByEmail ?? "-"}</td>
                          <td rowSpan={fields.length}>{row.action}</td>
                        </>
                      )}
                      <td>{FIELD_LABELS[field] ?? field}</td>
                      <td>{beforeValue}</td>
                      <td>{afterValue}</td>
                    </tr>
                  );
                });
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    Kayit bulunamadi
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
