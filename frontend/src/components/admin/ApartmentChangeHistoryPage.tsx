import { useMemo, useState } from "react";
import { apiBase, formatDateTimeTr, type ApartmentChangeLogRow, type ApartmentOption } from "../../app/shared";

type ApartmentChangeHistoryPageProps = {
  apartmentOptions: ApartmentOption[];
};

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
  const [apartmentId, setApartmentId] = useState("");
  const [rows, setRows] = useState<ApartmentChangeLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Daire secip gecmisi getirin");

  const selectedApartment = useMemo(
    () => apartmentOptions.find((x) => x.id === apartmentId) ?? null,
    [apartmentOptions, apartmentId]
  );

  async function fetchHistory(): Promise<void> {
    if (!apartmentId) {
      setMessage("Lutfen bir daire secin");
      return;
    }

    setLoading(true);
    setMessage("Degisiklik gecmisi yukleniyor...");
    try {
      const res = await fetch(`${apiBase}/api/admin/apartments/${apartmentId}/change-logs?limit=500`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? "Degisiklik gecmisi alinamadi");
      }

      const data = (await res.json()) as ApartmentChangeLogRow[];
      setRows(data);
      setMessage(`Degisiklik satiri: ${data.length}`);
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
      <div className="card admin-tools">
        <h3>Daire Degisiklik Gecmisi</h3>
        <div className="admin-row">
          <select value={apartmentId} onChange={(e) => setApartmentId(e.target.value)}>
            <option value="">Daire seciniz</option>
            {apartmentOptions.map((apt) => (
              <option key={apt.id} value={apt.id}>
                {apt.blockName}/{apt.doorNo}
                {apt.ownerFullName ? ` - ${apt.ownerFullName}` : ""}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" type="button" onClick={() => void fetchHistory()} disabled={loading}>
            Gecmisi Getir
          </button>
        </div>
        <p className="small">{message}</p>
      </div>

      <div className="card table-card">
        <h3>
          Degisiklikler
          {selectedApartment ? ` - ${selectedApartment.blockName}/${selectedApartment.doorNo}` : ""}
        </h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Degisiklik Tarihi</th>
                <th>Yapan</th>
                <th>Islem</th>
                <th>Alan</th>
                <th>Onceki Bilgi</th>
                <th>Yeni Bilgi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const fields = row.changedFields.length > 0 ? row.changedFields : ["(alan bilgisi yok)"];
                return fields.map((field, index) => {
                  const beforeValue = field === "(alan bilgisi yok)" ? "-" : displayValue(row.before[field]);
                  const afterValue = field === "(alan bilgisi yok)" ? "-" : displayValue(row.after[field]);

                  return (
                    <tr key={`${row.id}-${field}-${index}`}>
                      {index === 0 && (
                        <>
                          <td rowSpan={fields.length}>{formatDateTimeTr(row.changedAt)}</td>
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
                  <td colSpan={6} className="empty">
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
