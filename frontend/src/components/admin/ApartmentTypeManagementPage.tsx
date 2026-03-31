import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { apiBase, type ApartmentTypeDefinition } from "../../app/shared";

type ApartmentTypeFormState = {
  code: string;
  name: string;
  isActive: boolean;
};

const initialFormState: ApartmentTypeFormState = {
  code: "",
  name: "",
  isActive: true,
};

export function ApartmentTypeManagementPage({
  onDefinitionsChanged,
}: {
  onDefinitionsChanged?: () => Promise<void> | void;
}) {
  const [rows, setRows] = useState<ApartmentTypeDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const saveNoticeTimerRef = useRef<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ApartmentTypeFormState>(initialFormState);

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
      const data = await adminRequest<ApartmentTypeDefinition[]>("/api/admin/apartment-types");
      setRows(data);
      setMessage("");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Daire tipi listesi alinamadi");
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
      const formData = new FormData(e.currentTarget);
      const code = String(formData.get("code") ?? "").trim().toUpperCase();
      const name = String(formData.get("name") ?? "").trim();
      const isActive = formData.get("isActive") === "on";

      if (!code || !name) {
        setMessage("Daire tipi kodu ve adi zorunlu");
        return;
      }

      if (editingId) {
        await adminRequest(`/api/admin/apartment-types/${editingId}`, {
          method: "PUT",
          payload: { code, name, isActive },
        });
      } else {
        await adminRequest("/api/admin/apartment-types", {
          method: "POST",
          payload: { code, name, isActive },
        });
      }

      await fetchRows();
      await syncParentOptions();
      setEditingId(null);
      setFormState(initialFormState);
      setMessage(editingId ? "Daire tipi guncellendi" : "Daire tipi olusturuldu");
      showSaveNotice(editingId ? "Daire tipi guncellendi" : "Daire tipi olusturuldu");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Daire tipi kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: ApartmentTypeDefinition): void {
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

  async function deleteApartmentType(item: ApartmentTypeDefinition): Promise<void> {
    const accepted = window.confirm(`${item.name} daire tipini silmek istiyor musun?`);
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      await adminRequest<void>(`/api/admin/apartment-types/${item.id}`, { method: "DELETE" });
      if (editingId === item.id) {
        setEditingId(null);
        setFormState(initialFormState);
      }
      await fetchRows();
      await syncParentOptions();
      setMessage("Daire tipi silindi");
      showSaveNotice("Daire tipi silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Daire tipi silinemedi");
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

      <form
        key={`apt-type-${editingId ?? "new"}-${formState.code}-${formState.name}-${formState.isActive ? "1" : "0"}`}
        className="card admin-form"
        onSubmit={onSubmit}
      >
        <h3>{editingId ? "Daire Tipi Degistir" : "Daire Tipi Ekle"}</h3>
        <div className="apartment-class-form-inline">
          <label>
            Kod
            <input name="code" defaultValue={formState.code} placeholder="BUYUK" required />
          </label>
          <label>
            Ad
            <input name="name" defaultValue={formState.name} placeholder="Buyuk Daire" required />
          </label>
        </div>
        <label className="checkbox-row">
          <input name="isActive" type="checkbox" defaultChecked={formState.isActive} />
          Aktif
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {editingId ? "Degisiklikleri Kaydet" : "Tip Ekle"}
        </button>
        {editingId && (
          <button className="btn btn-ghost" type="button" onClick={cancelEdit}>
            Iptal
          </button>
        )}
        {message && <p className="small">{message}</p>}
      </form>

      <div className="card table-card">
        <div className="section-head report-toolbar">
          <h3>Daire Tipi Listesi</h3>
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
                    <button className="btn btn-danger" type="button" onClick={() => void deleteApartmentType(item)}>
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    Daire tipi kaydi yok
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
