import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { apiBase, type ApartmentDutyDefinition } from "../../app/shared";

type ApartmentDutyFormState = {
  code: string;
  name: string;
  isActive: boolean;
};

const initialFormState: ApartmentDutyFormState = {
  code: "",
  name: "",
  isActive: true,
};

export function ApartmentDutyManagementPage({
  onDefinitionsChanged,
}: {
  onDefinitionsChanged?: () => Promise<void> | void;
}) {
  const [rows, setRows] = useState<ApartmentDutyDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const saveNoticeTimerRef = useRef<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ApartmentDutyFormState>(initialFormState);

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

  const fetchRows = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await adminRequest<ApartmentDutyDefinition[]>("/api/admin/apartment-duties");
      setRows(data);
      setMessage("");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Daire gorevi listesi alinamadi");
    } finally {
      setLoading(false);
    }
  }, [adminRequest]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    return () => {
      if (saveNoticeTimerRef.current !== null) {
        window.clearTimeout(saveNoticeTimerRef.current);
      }
    };
  }, []);

  function showSaveNotice(text: string): void {
    setSaveNotice(text);
    if (saveNoticeTimerRef.current !== null) {
      window.clearTimeout(saveNoticeTimerRef.current);
    }
    saveNoticeTimerRef.current = window.setTimeout(() => {
      setSaveNotice("");
      saveNoticeTimerRef.current = null;
    }, 3000);
  }

  async function syncParentOptions(): Promise<void> {
    if (!onDefinitionsChanged) {
      return;
    }
    await onDefinitionsChanged();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);

    try {
      const code = formState.code.trim().toUpperCase();
      const name = formState.name.trim();
      const isActive = formState.isActive;

      if (!code || !name) {
        setMessage("Daire gorevi kodu ve adi zorunlu");
        return;
      }

      if (editingId) {
        await adminRequest(`/api/admin/apartment-duties/${editingId}`, {
          method: "PUT",
          payload: { code, name, isActive },
        });
      } else {
        await adminRequest("/api/admin/apartment-duties", {
          method: "POST",
          payload: { code, name, isActive },
        });
      }

      await fetchRows();
      await syncParentOptions();
      setEditingId(null);
      setFormState(initialFormState);
      setMessage(editingId ? "Daire gorevi guncellendi" : "Daire gorevi olusturuldu");
      showSaveNotice(editingId ? "Daire gorevi guncellendi" : "Daire gorevi olusturuldu");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Daire gorevi kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: ApartmentDutyDefinition): void {
    setEditingId(item.id);
    setFormState({
      code: item.code,
      name: item.name,
      isActive: item.isActive,
    });
  }

  function cancelEdit(): void {
    setEditingId(null);
    setFormState(initialFormState);
  }

  async function deleteApartmentDuty(item: ApartmentDutyDefinition): Promise<void> {
    const accepted = window.confirm(`${item.name} daire gorevini silmek istiyor musun?`);
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      await adminRequest<void>(`/api/admin/apartment-duties/${item.id}`, { method: "DELETE" });
      if (editingId === item.id) {
        setEditingId(null);
        setFormState(initialFormState);
      }
      await fetchRows();
      await syncParentOptions();
      setMessage("Daire gorevi silindi");
      showSaveNotice("Daire gorevi silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Daire gorevi silinemedi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="dashboard compact-management-page">
      {saveNotice && (
        <div className="blocking-modal" role="status" aria-live="polite" aria-busy="false">
          <div className="blocking-modal-card save-notice-modal-card">
            <div className="save-notice-icon" aria-hidden="true">
              ✓
            </div>
            <h3>Islem Tamamlandi</h3>
            <p className="small">{saveNotice}</p>
          </div>
        </div>
      )}

      <form className="card admin-form" onSubmit={onSubmit}>
        <div className="section-head">
          <h3>{editingId ? "Daire Gorevi Degistir" : "Daire Gorevi Ekle"}</h3>
          <div className="admin-row">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {editingId ? "Degisiklikleri Kaydet" : "Gorev Ekle"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={cancelEdit}>Temizle</button>
          </div>
        </div>
        <div className="apartment-class-form-inline apartment-duty-form-inline">
          <label>
            Kod
            <input
              value={formState.code}
              onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="KAPICI"
              required
            />
          </label>
          <label>
            Ad
            <input
              value={formState.name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Kapici"
              required
            />
          </label>
          <label className="checkbox-row apartment-duty-inline-active">
            <input
              type="checkbox"
              checked={formState.isActive}
              onChange={(e) => setFormState((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            Aktif
          </label>
        </div>
        {message && <p className="small">{message}</p>}
      </form>

      <div className="card table-card">
        <div className="section-head report-toolbar">
          <h3>Daire Gorevi Listesi</h3>
          <button className="btn btn-ghost" type="button" onClick={() => void fetchRows()} disabled={loading}>
            Yenile
          </button>
        </div>
        <div className="table-wrap">
          <table className="filter-table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Ad</th>
                <th>Durum</th>
                <th>Daire Sayisi</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.isActive ? "Aktif" : "Pasif"}</td>
                  <td>{item.apartmentCount}</td>
                  <td className="actions-cell">
                    <button className="btn btn-ghost" type="button" onClick={() => startEdit(item)}>
                      Degistir
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => void deleteApartmentDuty(item)}>
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    Daire gorevi kaydi yok
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
