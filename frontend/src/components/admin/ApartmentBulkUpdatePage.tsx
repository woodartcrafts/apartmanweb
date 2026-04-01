import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { apiBase, type ApartmentClassDefinition, type ApartmentType, type BlockDefinition, type OccupancyType } from "../../app/shared";

type BulkFormState = {
  apartmentClassId: string;
  targetType: "" | ApartmentType;
  blockName: string;
  type: "" | ApartmentType;
  occupancyType: "" | OccupancyType;
};

type BulkResult = {
  apartmentClassName: string | null;
  apartmentType: ApartmentType | null;
  matchedCount: number;
  updatedCount: number;
  alreadySameCount: number;
};

const initialFormState: BulkFormState = {
  apartmentClassId: "",
  targetType: "",
  blockName: "",
  type: "",
  occupancyType: "",
};

export function ApartmentBulkUpdatePage({
  apartmentClassOptions,
  blockOptions,
  onAfterUpdate,
}: {
  apartmentClassOptions: ApartmentClassDefinition[];
  blockOptions: BlockDefinition[];
  onAfterUpdate?: () => Promise<void> | void;
}) {
  const [formState, setFormState] = useState<BulkFormState>(initialFormState);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const saveNoticeTimerRef = useRef<number | null>(null);

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

  async function adminRequest<T>(
    endpoint: string,
    options?: { method?: "GET" | "POST" | "PUT" | "DELETE"; payload?: unknown }
  ): Promise<T> {
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
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    const apartmentClassId = formState.apartmentClassId.trim();
    const targetType = formState.targetType;

    if (!apartmentClassId && !targetType) {
      setMessage("Lutfen hedef daire sinifi veya hedef daire tipi secin");
      return;
    }

    if (!confirmed) {
      setMessage("Lutfen toplu degisikligi onay kutusunu isaretleyin");
      return;
    }

    setLoading(true);
    setResult(null);
    setMessage("Toplu daire sinifi/tipi guncellemesi calisiyor...");

    try {
      const response = await adminRequest<BulkResult>("/api/admin/apartments/bulk-update-class", {
        method: "POST",
        payload: {
          apartmentClassId: apartmentClassId || undefined,
          targetType: targetType || undefined,
          blockName: formState.blockName || undefined,
          type: formState.type || undefined,
          occupancyType: formState.occupancyType || undefined,
        },
      });

      setResult(response);
      if (onAfterUpdate) {
        await onAfterUpdate();
      }
      setMessage(
        `Toplu guncelleme tamamlandi. Eslesen: ${response.matchedCount}, guncellenen: ${response.updatedCount}, ayni kalan: ${response.alreadySameCount}`
      );
      showSaveNotice("Toplu guncelleme tamamlandi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Toplu daire sinifi/tipi guncellemesi basarisiz");
    } finally {
      setLoading(false);
    }
  }

  function clearForm(): void {
    setFormState(initialFormState);
    setResult(null);
    setConfirmed(false);
    setMessage("");
  }

  return (
    <section className="dashboard">
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
          <h3>Dairelerde Toplu Sinif / Tip Degisikligi</h3>
          <div className="admin-row">
            <button className="btn btn-primary" type="submit" disabled={loading || !confirmed}>
              Toplu Guncelle
            </button>
            <button className="btn btn-ghost" type="button" onClick={clearForm}>Temizle</button>
          </div>
        </div>
        <p className="small">
          Bu ekran iki adimla calisir: once neyi degistireceginizi secersiniz, sonra hangi dairelerde uygulanacagini filtrelersiniz.
        </p>
        <p className="small">1) "Hedef" alanlarindan en az birini secin. 2) Isterseniz filtre verin. 3) Toplu Guncelle butonuna basin.</p>

        <div className="compact-row-top-gap">
          <h4>1) Hedef Degerler</h4>
          <p className="small">Bu alanda degisecek degeri secersiniz.</p>
          <div className="admin-forms-grid apartment-list-filter-grid compact-row-top-gap">
            <label>
              Hedef Daire Sinifi (Degisecek Deger)
              <select
                value={formState.apartmentClassId}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    apartmentClassId: e.target.value,
                  }))
                }
              >
                <option value="">Sinif degismez</option>
                {(apartmentClassOptions.filter((x) => x.isActive).length > 0
                  ? apartmentClassOptions.filter((x) => x.isActive)
                  : apartmentClassOptions
                ).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Hedef Daire Tipi (Degisecek Deger)
              <select
                value={formState.targetType}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    targetType: e.target.value as "" | ApartmentType,
                  }))
                }
              >
                <option value="">Tip degismez</option>
                <option value="BUYUK">BUYUK</option>
                <option value="KUCUK">KUCUK</option>
              </select>
            </label>
          </div>
        </div>

        <div className="compact-row-top-gap">
          <h4>2) Filtreler (Opsiyonel)</h4>
          <p className="small">Bu alanlar sadece hangi dairelerin degisecegini belirler.</p>
          <div className="admin-forms-grid apartment-list-filter-grid compact-row-top-gap">
            <label>
              Blok Filtresi (Opsiyonel)
              <select
                value={formState.blockName}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    blockName: e.target.value,
                  }))
                }
              >
                <option value="">Tum bloklar</option>
                {blockOptions.map((block) => (
                  <option key={block.id} value={block.name}>
                    {block.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Mevcut Daire Tipi Filtresi (Opsiyonel)
              <select
                value={formState.type}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    type: e.target.value as "" | ApartmentType,
                  }))
                }
              >
                <option value="">Tum tipler</option>
                <option value="BUYUK">BUYUK</option>
                <option value="KUCUK">KUCUK</option>
              </select>
            </label>

            <label>
              Mevcut Ev Durumu Filtresi (Opsiyonel)
              <select
                value={formState.occupancyType}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    occupancyType: e.target.value as "" | OccupancyType,
                  }))
                }
              >
                <option value="">Tum durumlar</option>
                <option value="OWNER">Ev Sahibi</option>
                <option value="TENANT">Kiraci</option>
              </select>
            </label>
          </div>
        </div>

        <p className="small">
          Not: Hedef Daire Sinifi ve Hedef Daire Tipi bos birakilirsa islem baslamaz. Filtreler bos birakilirsa tum dairelere uygulanir.
        </p>

        <div className="warning-hint compact-row-top-gap">
          <strong>Dikkat:</strong> Bu toplu degisiklik cok sayida daireyi etkileyebilir. Islemi uyguladiktan sonra geri alma adimi yoktur.
        </div>

        <label className="checkbox-row compact-row-top-gap">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          Yukaridaki toplu degisikligi onayliyorum.
        </label>

        {result && (
          <div className="compact-row-top-gap">
            <p className="small">
              Hedef sinif: <b>{result.apartmentClassName ?? "Degismez"}</b> | Hedef tip: <b>{result.apartmentType ?? "Degismez"}</b>
            </p>
            <p className="small">
              Eslesen daire: <b>{result.matchedCount}</b> | Guncellenen: <b>{result.updatedCount}</b> | Ayni kalan: <b>{result.alreadySameCount}</b>
            </p>
          </div>
        )}

        {message && <p className="small compact-row-top-gap">{message}</p>}
      </form>
    </section>
  );
}
