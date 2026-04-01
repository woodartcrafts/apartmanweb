import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiBase, formatDateTimeTr } from "../../app/shared";

type BuildingProfileResponse = {
  buildingName: string;
  parcelInfo: string;
  address: string;
  totalIndependentSections: number | null;
  updatedAt: string | null;
};

type BuildingInfoFormState = {
  buildingName: string;
  parcelInfo: string;
  address: string;
  totalIndependentSections: string;
};

const initialFormState: BuildingInfoFormState = {
  buildingName: "",
  parcelInfo: "",
  address: "",
  totalIndependentSections: "",
};

export function BuildingInfoPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<BuildingInfoFormState>(initialFormState);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const adminRequest = useCallback(async <T,>(
    endpoint: string,
    options?: { method?: "GET" | "PUT"; payload?: unknown }
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

    return (await response.json()) as T;
  }, []);

  const fetchBuildingProfile = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await adminRequest<BuildingProfileResponse>("/api/admin/building-profile");
      setFormState({
        buildingName: data.buildingName ?? "",
        parcelInfo: data.parcelInfo ?? "",
        address: data.address ?? "",
        totalIndependentSections:
          data.totalIndependentSections !== null && data.totalIndependentSections !== undefined
            ? String(data.totalIndependentSections)
            : "",
      });
      setUpdatedAt(data.updatedAt ?? null);
      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Bina bilgileri alinamadi");
    } finally {
      setLoading(false);
    }
  }, [adminRequest]);

  useEffect(() => {
    void fetchBuildingProfile();
  }, [fetchBuildingProfile]);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);

    try {
      const totalIndependentSectionsRaw = formState.totalIndependentSections.trim();
      const totalIndependentSections = totalIndependentSectionsRaw
        ? Number(totalIndependentSectionsRaw)
        : null;

      if (
        totalIndependentSectionsRaw &&
        (totalIndependentSections === null ||
          !Number.isInteger(totalIndependentSections) ||
          totalIndependentSections <= 0)
      ) {
        throw new Error("Toplam bagimsiz bolum sayisi pozitif tam sayi olmalidir");
      }

      const payload = {
        buildingName: formState.buildingName.trim(),
        parcelInfo: formState.parcelInfo.trim(),
        address: formState.address.trim(),
        totalIndependentSections,
      };

      const saved = await adminRequest<BuildingProfileResponse>("/api/admin/building-profile", {
        method: "PUT",
        payload,
      });

      setUpdatedAt(saved.updatedAt ?? null);
      setMessage("Bina bilgileri kaydedildi");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Bina bilgileri kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  function resetForm(): void {
    setFormState(initialFormState);
    setMessage("");
  }

  return (
    <section className="dashboard compact-management-page">
      <form className="card admin-form" onSubmit={onSubmit}>
        <div className="section-head">
          <h3>Bina Bilgileri</h3>
          <div className="admin-row">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={resetForm} disabled={loading}>
              Temizle
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void fetchBuildingProfile()} disabled={loading}>
              Yenile
            </button>
          </div>
        </div>
        <p className="small">
          Bu ekranda girilen bilgiler toplanti evraklarinda otomatik kullanilir.
        </p>

        <label>
          Bina Adi
          <input
            value={formState.buildingName}
            onChange={(e) => setFormState((prev) => ({ ...prev, buildingName: e.target.value }))}
            placeholder="B Blok"
            maxLength={200}
          />
        </label>

        <label>
          Ada / Parsel
          <input
            value={formState.parcelInfo}
            onChange={(e) => setFormState((prev) => ({ ...prev, parcelInfo: e.target.value }))}
            placeholder="123 / 45"
            maxLength={200}
          />
        </label>

        <label>
          Adres
          <textarea
            rows={3}
            value={formState.address}
            onChange={(e) => setFormState((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="Mahalle, sokak, site adresi"
            maxLength={1000}
          />
        </label>

        <label>
          Toplam Bagimsiz Bolum Sayisi
          <input
            type="number"
            min={1}
            step={1}
            value={formState.totalIndependentSections}
            onChange={(e) => setFormState((prev) => ({ ...prev, totalIndependentSections: e.target.value }))}
            placeholder="40"
          />
        </label>

        {updatedAt && <p className="small">Son guncelleme: {formatDateTimeTr(updatedAt)}</p>}
        {message && <p className="small">{message}</p>}
      </form>
    </section>
  );
}
