import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBase, formatDateTimeTr, type ApartmentOption, type ResidentPasswordHistoryRow } from "../../app/shared";

export function ApartmentPasswordManagementPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [apartmentOptions, setApartmentOptions] = useState<ApartmentOption[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState("");

  const [passwordDraftByUserId, setPasswordDraftByUserId] = useState<Record<string, string>>({});
  const [passwordSavingUserId, setPasswordSavingUserId] = useState<string | null>(null);

  const [passwordHistoryByApartmentId, setPasswordHistoryByApartmentId] = useState<
    Record<string, ResidentPasswordHistoryRow[]>
  >({});
  const [passwordHistoryLoadingApartmentId, setPasswordHistoryLoadingApartmentId] = useState<string | null>(null);
  const [passwordHistoryErrorByApartmentId, setPasswordHistoryErrorByApartmentId] = useState<Record<string, string>>({});

  const selectedApartment = useMemo(
    () => apartmentOptions.find((x) => x.id === selectedApartmentId) ?? null,
    [apartmentOptions, selectedApartmentId]
  );

  const adminRequest = useCallback(async <T,>(
    endpoint: string,
    options?: { method?: "GET" | "POST" | "PUT" | "DELETE"; payload?: unknown }
  ): Promise<T> => {
    const method = options?.method ?? "GET";
    const payload = options?.payload;

    const response = await fetch(`${apiBase}${endpoint}`, {
      method,
      headers: {
        ...(payload ? { "Content-Type": "application/json" } : {}),
      },
      credentials: "include",
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as { message?: string };
      if (response.status === 401) {
        throw new Error("Oturum gecersiz veya suresi dolmus. Lutfen tekrar giris yapin");
      }
      throw new Error(errorBody.message ?? "Istek basarisiz");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }, []);

  const fetchApartmentOptions = useCallback(async (): Promise<void> => {
    const data = await adminRequest<ApartmentOption[]>("/api/admin/apartments");
    const sorted = [...data].sort((a, b) => {
      if (a.blockName !== b.blockName) {
        return a.blockName.localeCompare(b.blockName, "tr");
      }
      return a.doorNo.localeCompare(b.doorNo, "tr", { numeric: true });
    });

    setApartmentOptions(sorted);
    if (!selectedApartmentId && sorted.length > 0) {
      setSelectedApartmentId(sorted[0].id);
    }
  }, [adminRequest, selectedApartmentId]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await fetchApartmentOptions();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Daire listesi alinamadi");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchApartmentOptions]);

  useEffect(() => {
    if (!selectedApartment) {
      return;
    }

    setPasswordDraftByUserId((prev) => {
      const next = { ...prev };
      for (const resident of selectedApartment.residentUsers) {
        if (!next[resident.id]) {
          next[resident.id] = "";
        }
      }
      return next;
    });
  }, [selectedApartment]);

  async function setResidentPassword(apartmentId: string, userId: string): Promise<void> {
    const password = (passwordDraftByUserId[userId] ?? "").trim();
    if (!password) {
      setMessage("Sifre bos olamaz");
      return;
    }

    setPasswordSavingUserId(userId);
    try {
      await adminRequest(`/api/admin/apartments/${apartmentId}/resident-password`, {
        method: "POST",
        payload: {
          userId,
          password,
        },
      });

      await fetchApartmentOptions();
      setMessage("Resident sifresi guncellendi");
      setPasswordDraftByUserId((prev) => ({ ...prev, [userId]: "" }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Resident sifresi guncellenemedi");
    } finally {
      setPasswordSavingUserId(null);
    }
  }

  async function togglePasswordHistory(apartmentId: string): Promise<void> {
    if (passwordHistoryByApartmentId[apartmentId]) {
      setPasswordHistoryByApartmentId((prev) => {
        const next = { ...prev };
        delete next[apartmentId];
        return next;
      });
      return;
    }

    setPasswordHistoryLoadingApartmentId(apartmentId);
    setPasswordHistoryErrorByApartmentId((prev) => ({ ...prev, [apartmentId]: "" }));

    try {
      const rows = await adminRequest<ResidentPasswordHistoryRow[]>(
        `/api/admin/apartments/${apartmentId}/resident-password-history`
      );
      setPasswordHistoryByApartmentId((prev) => ({
        ...prev,
        [apartmentId]: rows,
      }));
    } catch (err) {
      setPasswordHistoryErrorByApartmentId((prev) => ({
        ...prev,
        [apartmentId]: err instanceof Error ? err.message : "Sifre gecmisi alinamadi",
      }));
    } finally {
      setPasswordHistoryLoadingApartmentId(null);
    }
  }

  const historyRows = selectedApartment ? passwordHistoryByApartmentId[selectedApartment.id] ?? null : null;

  return (
    <section className="dashboard">
      <div className="card admin-form apartment-password-page-card">
        <h3>Daire Sifre Degistir</h3>
        <div className="admin-row apartment-password-filter-row">
          <label>
            Daire
            <select
              value={selectedApartmentId}
              onChange={(e) => {
                setSelectedApartmentId(e.target.value);
                setMessage("");
              }}
              disabled={loading || apartmentOptions.length === 0}
            >
              {apartmentOptions.length === 0 && <option value="">Daire bulunamadi</option>}
              {apartmentOptions.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  {apartment.blockName}/{apartment.doorNo} - {apartment.ownerFullName ?? "Adsiz"}
                </option>
              ))}
            </select>
          </label>
        </div>
        {message && <p className="small">{message}</p>}
      </div>

      {selectedApartment && (
        <div className="card table-card">
          <h3>
            Resident Sifre Karti ({selectedApartment.blockName}/{selectedApartment.doorNo})
          </h3>

          {selectedApartment.residentUsers.length === 0 ? (
            <p className="small">Bu daireye bagli resident kullanici yok.</p>
          ) : (
            <div className="guide-list compact-row-top-gap resident-password-list">
              {selectedApartment.residentUsers.map((resident) => (
                <article key={resident.id} className="card resident-password-row">
                  <p className="small resident-password-apartment">
                    <b>
                      {selectedApartment.blockName}/{selectedApartment.doorNo}
                    </b>
                  </p>
                  <div className="resident-password-history-action">
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => void togglePasswordHistory(selectedApartment.id)}
                    >
                      {historyRows ? "Gecmisi Gizle" : "Sifre Gecmisi"}
                    </button>
                  </div>
                  <p className="small resident-password-user">
                    <b>{resident.fullName}</b> ({resident.email})
                  </p>
                  <input
                    className="resident-password-input"
                    type="text"
                    value={passwordDraftByUserId[resident.id] ?? ""}
                    onChange={(e) =>
                      setPasswordDraftByUserId((prev) => ({
                        ...prev,
                        [resident.id]: e.target.value,
                      }))
                    }
                    placeholder="Resident sifresi"
                  />
                  <div className="admin-row resident-password-action">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={passwordSavingUserId === resident.id}
                      onClick={() => void setResidentPassword(selectedApartment.id, resident.id)}
                    >
                      {passwordSavingUserId === resident.id ? "Kaydediliyor..." : "Sifreyi Kaydet"}
                    </button>
                  </div>
                  <p className="small resident-password-meta">
                    Son degisim: {resident.lastPasswordChangedAt ? formatDateTimeTr(resident.lastPasswordChangedAt) : "-"}
                    {resident.lastPasswordChangedByName ? ` | ${resident.lastPasswordChangedByName}` : ""}
                  </p>
                </article>
              ))}
            </div>
          )}

          {passwordHistoryLoadingApartmentId === selectedApartment.id && (
            <p className="small">Sifre gecmisi yukleniyor...</p>
          )}
          {passwordHistoryErrorByApartmentId[selectedApartment.id] && (
            <p className="small">{passwordHistoryErrorByApartmentId[selectedApartment.id]}</p>
          )}

          {historyRows && (
            <div className="table-wrap compact-row-top-gap">
              <table>
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Resident</th>
                    <th>Sifre</th>
                    <th>Sebep</th>
                    <th>Degistiren</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDateTimeTr(row.changedAt)}</td>
                      <td>
                        {row.userFullName} ({row.userEmail})
                      </td>
                      <td>Gizli</td>
                      <td>{row.reason}</td>
                      <td>{row.changedByName ? `${row.changedByName} (${row.changedByEmail ?? "-"})` : "Sistem"}</td>
                    </tr>
                  ))}
                  {historyRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty">
                        Sifre gecmisi yok
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
