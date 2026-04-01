import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocation } from "react-router-dom";
import {
  apiBase,
  type ApartmentClassDefinition,
  type ApartmentDutyDefinition,
  type ApartmentOption,
  type ApartmentType,
  type BlockDefinition,
  type OccupancyType,
} from "../../app/shared";

type ApartmentFormState = {
  blockName: string;
  doorNo: string;
  m2: string;
  type: ApartmentType;
  apartmentClassId: string;
  apartmentDutyId: string;
  hasAidat: boolean;
  hasDogalgaz: boolean;
  hasOtherDues: boolean;
  hasIncome: boolean;
  hasExpenses: boolean;
  ownerFullName: string;
  occupancyType: OccupancyType;
  moveInDate: string;
  email1: string;
  email2: string;
  email3: string;
  email4: string;
  phone1: string;
  phone2: string;
  phone3: string;
  phone4: string;
  landlordFullName: string;
  landlordPhone: string;
  landlordEmail: string;
};

const initialFormState: ApartmentFormState = {
  blockName: "",
  doorNo: "",
  m2: "",
  type: "BUYUK",
  apartmentClassId: "",
  apartmentDutyId: "",
  hasAidat: true,
  hasDogalgaz: true,
  hasOtherDues: true,
  hasIncome: true,
  hasExpenses: true,
  ownerFullName: "",
  occupancyType: "OWNER",
  moveInDate: "",
  email1: "",
  email2: "",
  email3: "",
  email4: "",
  phone1: "",
  phone2: "",
  phone3: "",
  phone4: "",
  landlordFullName: "",
  landlordPhone: "",
  landlordEmail: "",
};

export function ApartmentFormPage() {
  const location = useLocation();
  const apartmentDoorInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const saveNoticeTimerRef = useRef<number | null>(null);

  const [apartmentOptions, setApartmentOptions] = useState<ApartmentOption[]>([]);
  const [blockOptions, setBlockOptions] = useState<BlockDefinition[]>([]);
  const [apartmentClassOptions, setApartmentClassOptions] = useState<ApartmentClassDefinition[]>([]);
  const [apartmentDutyOptions, setApartmentDutyOptions] = useState<ApartmentDutyDefinition[]>([]);

  const [editingApartmentId, setEditingApartmentId] = useState<string | null>(null);
  const [editingApartmentIds, setEditingApartmentIds] = useState<string[]>([]);
  const [formState, setFormState] = useState<ApartmentFormState>(initialFormState);

  const isEditRoute = location.pathname.endsWith("/apartments/edit");

  const selectedApartmentText = useMemo(() => {
    if (editingApartmentIds.length === 0) {
      return "";
    }

    return editingApartmentIds
      .map((id) => {
        const apt = apartmentOptions.find((x) => x.id === id);
        return apt ? `${apt.blockName}/${apt.doorNo}` : null;
      })
      .filter((x): x is string => Boolean(x))
      .join(", ");
  }, [apartmentOptions, editingApartmentIds]);

  const selectedApartmentLabels = useMemo(
    () =>
      editingApartmentIds
        .map((id) => {
          const apt = apartmentOptions.find((x) => x.id === id);
          return apt
            ? { key: `${apt.blockName}/${apt.doorNo}`, label: `${apt.blockName}/${apt.doorNo}`, name: apt.ownerFullName ?? "Adsiz" }
            : null;
        })
        .filter((x): x is { key: string; label: string; name: string } => Boolean(x)),
    [apartmentOptions, editingApartmentIds]
  );

  const allApartmentsSelected = apartmentOptions.length > 0 && editingApartmentIds.length === apartmentOptions.length;

  useEffect(() => {
    if (!isEditRoute || apartmentOptions.length === 0) {
      return;
    }

    const idsRaw = new URLSearchParams(location.search).get("ids") ?? "";
    const requestedIds = idsRaw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    if (requestedIds.length === 0) {
      return;
    }

    const validIds = requestedIds.filter((id) => apartmentOptions.some((x) => x.id === id));
    if (validIds.length === 0) {
      return;
    }

    setEditingApartmentIds(validIds);
    const first = apartmentOptions.find((x) => x.id === validIds[0]);
    if (first) {
      applyApartmentToForm(first, { syncSelection: false });
    }
  }, [apartmentOptions, isEditRoute, location.search]);

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

  function applyApartmentToForm(apartment: ApartmentOption, options?: { syncSelection?: boolean }): void {
    const shouldSyncSelection = options?.syncSelection ?? true;
    setEditingApartmentId(apartment.id);
    if (shouldSyncSelection) {
      setEditingApartmentIds([apartment.id]);
    }

    setFormState({
      blockName: apartment.blockName,
      doorNo: apartment.doorNo,
      m2: apartment.m2 !== null && Number.isFinite(apartment.m2) ? String(apartment.m2) : "",
      type: apartment.type,
      apartmentClassId: apartment.apartmentClassId ?? "",
      apartmentDutyId: apartment.apartmentDutyId ?? "",
      hasAidat: apartment.hasAidat,
      hasDogalgaz: apartment.hasDogalgaz,
      hasOtherDues: apartment.hasOtherDues,
      hasIncome: apartment.hasIncome,
      hasExpenses: apartment.hasExpenses,
      ownerFullName: apartment.ownerFullName ?? "",
      occupancyType: apartment.occupancyType,
      moveInDate: apartment.moveInDate ? apartment.moveInDate.slice(0, 10) : "",
      email1: apartment.email1 ?? "",
      email2: apartment.email2 ?? "",
      email3: apartment.email3 ?? "",
      email4: apartment.email4 ?? "",
      phone1: apartment.phone1 ?? "",
      phone2: apartment.phone2 ?? "",
      phone3: apartment.phone3 ?? "",
      phone4: apartment.phone4 ?? "",
      landlordFullName: apartment.landlordFullName ?? "",
      landlordPhone: apartment.landlordPhone ?? "",
      landlordEmail: apartment.landlordEmail ?? "",
    });
    setWarnings([]);
  }

  function resetCreateMode(notify = false): void {
    setEditingApartmentId(null);
    setEditingApartmentIds([]);
    setWarnings([]);
    setFormState({
      ...initialFormState,
      blockName: blockOptions[0]?.name ?? "",
      apartmentClassId: "",
      apartmentDutyId: "",
    });

    if (notify) {
      setMessage("Duzenleme iptal edildi");
    }
  }

  const fetchApartmentOptions = useCallback(async (): Promise<void> => {
    const data = await adminRequest<ApartmentOption[]>("/api/admin/apartments");
    const sorted = [...data].sort((a, b) => {
      const aNum = Number(a.doorNo);
      const bNum = Number(b.doorNo);

      if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) {
        return aNum - bNum;
      }

      if (a.blockName !== b.blockName) {
        return a.blockName.localeCompare(b.blockName, "tr");
      }

      return a.doorNo.localeCompare(b.doorNo, "tr", { numeric: true });
    });

    setApartmentOptions(sorted);
  }, [adminRequest]);

  const fetchBlockOptions = useCallback(async (): Promise<void> => {
    const data = await adminRequest<BlockDefinition[]>("/api/admin/blocks");
    const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, "tr"));
    setBlockOptions(sorted);

    setFormState((prev) => {
      if (sorted.length === 0) {
        return { ...prev, blockName: "" };
      }

      const exists = sorted.some((x) => x.name === prev.blockName);
      if (exists) {
        return prev;
      }

      return {
        ...prev,
        blockName: sorted[0].name,
      };
    });
  }, [adminRequest]);

  const fetchApartmentClassOptions = useCallback(async (): Promise<void> => {
    const data = await adminRequest<ApartmentClassDefinition[]>("/api/admin/apartment-classes");
    const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, "tr"));
    setApartmentClassOptions(sorted);

    setFormState((prev) => {
      if (prev.apartmentClassId) {
        const exists = sorted.some((x) => x.id === prev.apartmentClassId);
        if (exists) {
          return prev;
        }
      }

      return {
        ...prev,
        apartmentClassId: "",
      };
    });
  }, [adminRequest]);

  const fetchApartmentDutyOptions = useCallback(async (): Promise<void> => {
    const data = await adminRequest<ApartmentDutyDefinition[]>("/api/admin/apartment-duties");
    const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, "tr"));
    setApartmentDutyOptions(sorted);

    setFormState((prev) => {
      if (prev.apartmentDutyId) {
        const exists = sorted.some((x) => x.id === prev.apartmentDutyId);
        if (exists) {
          return prev;
        }
      }

      return {
        ...prev,
        apartmentDutyId: "",
      };
    });
  }, [adminRequest]);

  const loadAllOptions = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      await Promise.all([
        fetchApartmentOptions(),
        fetchBlockOptions(),
        fetchApartmentClassOptions(),
        fetchApartmentDutyOptions(),
      ]);
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Daire verileri alinamadi");
    } finally {
      setLoading(false);
    }
  }, [fetchApartmentClassOptions, fetchApartmentDutyOptions, fetchApartmentOptions, fetchBlockOptions]);

  useEffect(() => {
    void loadAllOptions();
  }, [loadAllOptions]);

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
    }, 5000);
  }

  function clearEditSelectionAfterSave(): void {
    if (!isEditRoute) {
      return;
    }

    setEditingApartmentId(null);
    setEditingApartmentIds([]);
    setWarnings([]);

    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    resetCreateMode(false);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setMessage("Daire kaydediliyor...");

    try {
      const isEditMode = editingApartmentIds.length > 0;
      const sharedPayload = {
        blockName: formState.blockName,
        doorNo: formState.doorNo,
        m2: formState.m2.trim() === "" ? undefined : Number(formState.m2),
        type: formState.type,
        apartmentClassId: formState.apartmentClassId || undefined,
        apartmentDutyId: formState.apartmentDutyId || undefined,
        hasAidat: formState.hasAidat,
        hasDogalgaz: formState.hasDogalgaz,
        hasOtherDues: formState.hasOtherDues,
        hasIncome: formState.hasIncome,
        hasExpenses: formState.hasExpenses,
        ownerFullName: formState.ownerFullName || undefined,
        occupancyType: formState.occupancyType,
        moveInDate: formState.moveInDate || undefined,
        email1: formState.email1 || undefined,
        email2: formState.email2 || undefined,
        email3: formState.email3 || undefined,
        email4: formState.email4 || undefined,
        phone1: formState.phone1 || undefined,
        phone2: formState.phone2 || undefined,
        phone3: formState.phone3 || undefined,
        phone4: formState.phone4 || undefined,
        landlordFullName: formState.landlordFullName || undefined,
        landlordPhone: formState.landlordPhone || undefined,
        landlordEmail: formState.landlordEmail || undefined,
      };

      if (isEditMode && editingApartmentIds.length > 1) {
        const selectedApartments = apartmentOptions.filter((x) => editingApartmentIds.includes(x.id));
        if (selectedApartments.length === 0) {
          throw new Error("Duzenlenecek daire bulunamadi");
        }

        const results = await Promise.allSettled(
          selectedApartments.map((apartment) =>
            adminRequest<{ id: string; warningMessages?: string[] }>(`/api/admin/apartments/${apartment.id}`, {
              method: "PUT",
              payload: {
                ...sharedPayload,
                blockName: apartment.blockName,
                doorNo: apartment.doorNo,
              },
            })
          )
        );

        const success = results.filter(
          (x): x is PromiseFulfilledResult<{ id: string; warningMessages?: string[] }> => x.status === "fulfilled"
        );
        const failCount = results.length - success.length;

        if (success.length === 0) {
          throw new Error("Secili daireler guncellenemedi");
        }

        const mergedWarnings = success.flatMap((x) => x.value.warningMessages ?? []);
        setWarnings(mergedWarnings);

        await loadAllOptions();

        if (mergedWarnings.length > 0) {
          setMessage(
            `${success.length} daire guncellendi${failCount > 0 ? `, ${failCount} daire guncellenemedi` : ""}. Uyari: ${mergedWarnings.join(" | ")}`
          );
        } else {
          setMessage(`${success.length} daire guncellendi${failCount > 0 ? `, ${failCount} daire guncellenemedi` : ""}`);
        }
        showSaveNotice(failCount > 0 ? "Degisiklikler kaydedildi (kismi basarili)" : "Degisiklik kaydedildi");
        clearEditSelectionAfterSave();
        return;
      }

      const targetApartmentId = isEditMode ? editingApartmentIds[0] : null;
      const endpoint = targetApartmentId ? `/api/admin/apartments/${targetApartmentId}` : "/api/admin/apartments";
      const method = targetApartmentId ? "PUT" : "POST";

      const data = await adminRequest<{ id: string; warningMessages?: string[] }>(endpoint, {
        method,
        payload: sharedPayload,
      });

      await loadAllOptions();
      setEditingApartmentId(null);
      setEditingApartmentIds([]);
      setWarnings(data.warningMessages ?? []);
      setFormState((prev) => ({
        ...prev,
        doorNo: "",
        m2: "",
        ownerFullName: "",
        moveInDate: "",
        email1: "",
        email2: "",
        email3: "",
        email4: "",
        phone1: "",
        phone2: "",
        phone3: "",
        phone4: "",
        landlordFullName: "",
        landlordPhone: "",
        landlordEmail: "",
      }));

      if (data.warningMessages && data.warningMessages.length > 0) {
        setMessage(
          `${targetApartmentId ? "Daire guncellendi" : `Daire olusturuldu. Apartment ID: ${data.id}`}. Uyari: ${data.warningMessages.join(" | ")}`
        );
      } else {
        setMessage(targetApartmentId ? "Daire guncellendi" : `Daire olusturuldu. Apartment ID: ${data.id}`);
      }
      showSaveNotice(targetApartmentId ? "Degisiklik kaydedildi" : "Daire olusturuldu ve kaydedildi");
      clearEditSelectionAfterSave();
    } catch (err) {
      console.error(err);
      setWarnings([]);
      setSaveNotice("");
      setMessage(err instanceof Error ? err.message : "Daire kaydi basarisiz");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className={`card admin-form apartment-form-grid apartment-form-surface ${isEditRoute ? "apartment-form-edit" : "apartment-form-create"}`}
      onSubmit={onSubmit}
    >
      {saveNotice && (
        <div className="apt-toast" role="status" aria-live="polite" aria-atomic="true">
          <div className="apt-toast-icon" aria-hidden="true">✓</div>
          <div className="apt-toast-body">
            <strong>Islem Tamamlandi</strong>
            <span>{saveNotice}</span>
          </div>
        </div>
      )}

      <div className="section-head">
        <h3>{isEditRoute ? "Daire Degistir Formu" : editingApartmentId ? "Daire Degistir" : "Daire Ekle"}</h3>
        <div className="admin-row">
          <button className="btn btn-primary" type="submit" disabled={loading || (isEditRoute && editingApartmentIds.length === 0)}>
            {isEditRoute ? "Degisiklikleri Kaydet" : "Daire Ekle"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => resetCreateMode(false)}>
            Temizle
          </button>
        </div>
      </div>

      {isEditRoute && (
        <>
          <div className="apartment-edit-header-row">
          <label>
            Duzenlenecek Daire
            <details className="filter-dropdown apartment-edit-select-dropdown">
              <summary>{editingApartmentIds.length === 0 ? "Daire secin" : `${editingApartmentIds.length} daire secili`}</summary>
              <div className="filter-dropdown-panel apartment-edit-select-list">
                <div className="filter-dropdown-head">
                  <span className="small">Daire Secimi</span>
                </div>
                <label className="bulk-filter-option apartment-edit-select-item">
                  <input
                    type="checkbox"
                    checked={allApartmentsSelected}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        setEditingApartmentIds([]);
                        resetCreateMode(false);
                        return;
                      }

                      const allIds = apartmentOptions.map((x) => x.id);
                      setEditingApartmentIds(allIds);
                      const first = apartmentOptions[0];
                      if (first) {
                        applyApartmentToForm(first, { syncSelection: false });
                      }
                      setMessage(`${allIds.length} daire secildi`);
                    }}
                  />
                  Hepsini Sec
                </label>
                {apartmentOptions.map((apartment) => {
                  const checked = editingApartmentIds.includes(apartment.id);
                  return (
                    <label key={apartment.id} className="bulk-filter-option apartment-edit-select-item">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          if (isChecked) {
                            const next = editingApartmentIds.includes(apartment.id)
                              ? editingApartmentIds
                              : [...editingApartmentIds, apartment.id];
                            setEditingApartmentIds(next);
                            if (!editingApartmentId) {
                              applyApartmentToForm(apartment, { syncSelection: false });
                            }
                            setMessage(`${next.length} daire secildi`);
                            return;
                          }

                          const next = editingApartmentIds.filter((id) => id !== apartment.id);
                          setEditingApartmentIds(next);

                          if (next.length === 0) {
                            resetCreateMode(false);
                            return;
                          }

                          if (editingApartmentId === apartment.id) {
                            const fallback = apartmentOptions.find((x) => x.id === next[0]);
                            if (fallback) {
                              applyApartmentToForm(fallback, { syncSelection: false });
                            }
                          }

                          setMessage(`${next.length} daire secili`);
                        }}
                      />
                      {apartment.blockName}/{apartment.doorNo} - {apartment.ownerFullName ?? "Adsiz"}
                    </label>
                  );
                })}
              </div>
            </details>
          </label>
          {editingApartmentIds.length > 0 && (
            <div className="selected-apartments-strip">
              <span className="small">Secili daireler:</span>
              <div className="selected-apartments-chip-row" title={selectedApartmentText}>
                {selectedApartmentLabels.map((item) => (
                  <span key={item.key} className="selected-apartments-chip">
                    <span className="selected-apartments-chip-door">{item.label}</span>
                    <span className="selected-apartments-chip-name">{item.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {!editingApartmentId && <p className="small apartment-edit-inline-note">Kayit degistirmek icin once daire secin.</p>}
          </div>
        </>
      )}

      {editingApartmentIds.length > 0 && (
        <p className="edit-hint">Duzenleme aktif ({editingApartmentIds.length} daire): Kaydet veya Iptal sec</p>
      )}

      {warnings.length > 0 && (
        <div className="warning-hint warning-list">
          <div className="warning-head">
            <strong>Benzer Kayit Uyarisi</strong>
            <button type="button" className="btn btn-ghost warning-close-btn" onClick={() => setWarnings([])}>
              Kapat
            </button>
          </div>
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}

      <section className="apartment-form-section">
        <div className="apartment-form-section-head">
          <h4>🏢 Temel Bilgiler</h4>
          <p className="small">Dairenin kimlik ve durum bilgileri</p>
        </div>
        <div className="apartment-form-fields">
          <label>
            Blok
            <select
              value={formState.blockName}
              onChange={(e) => setFormState((prev) => ({ ...prev, blockName: e.target.value }))}
              required
            >
              {blockOptions.length === 0 ? (
                <option value="">Once Blok Yonetimi'nden blok ekleyin</option>
              ) : (
                blockOptions.map((block) => (
                  <option key={block.id} value={block.name}>
                    {block.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <label>
            Daire No
            <input
              ref={apartmentDoorInputRef}
              value={formState.doorNo}
              onChange={(e) => setFormState((prev) => ({ ...prev, doorNo: e.target.value }))}
              placeholder="101"
              required
            />
          </label>

          <label>
            m2
            <input
              type="number"
              min={0}
              step="0.01"
              value={formState.m2}
              onChange={(e) => setFormState((prev) => ({ ...prev, m2: e.target.value }))}
              placeholder="120"
            />
          </label>

          <label>
            Daire Tipi
            <select value={formState.type} onChange={(e) => setFormState((prev) => ({ ...prev, type: e.target.value as ApartmentType }))}>
              <option value="BUYUK">BUYUK</option>
              <option value="KUCUK">KUCUK</option>
            </select>
          </label>

          <label>
            Daire Sinifi
            <select value={formState.apartmentClassId} onChange={(e) => setFormState((prev) => ({ ...prev, apartmentClassId: e.target.value }))}>
              <option value="">Sinif Secin</option>
              {apartmentClassOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Daire Gorevi
            <select value={formState.apartmentDutyId} onChange={(e) => setFormState((prev) => ({ ...prev, apartmentDutyId: e.target.value }))}>
              <option value="">Gorev Secin</option>
              {apartmentDutyOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Oturan / Malik
            <input value={formState.ownerFullName} onChange={(e) => setFormState((prev) => ({ ...prev, ownerFullName: e.target.value }))} placeholder="Ad Soyad" />
          </label>

          <label>
            Ev Durumu
            <select
              value={formState.occupancyType}
              onChange={(e) => setFormState((prev) => ({ ...prev, occupancyType: e.target.value as OccupancyType }))}
            >
              <option value="OWNER">Ev Sahibi</option>
              <option value="TENANT">Kiraci</option>
            </select>
          </label>

          <label>
            Tasinma Tarihi
            <input
              type="date"
              value={formState.moveInDate}
              onChange={(e) => setFormState((prev) => ({ ...prev, moveInDate: e.target.value }))}
            />
          </label>
        </div>
        {blockOptions.length === 0 && <p className="small apartment-form-inline-note">Daire eklemek icin once DR &gt; Blok Yonetimi ekranindan blok olusturun.</p>}
      </section>

      <section className="apartment-form-section">
        <div className="apartment-form-section-head">
          <h4>📞 Iletisim</h4>
          <p className="small">Birincil ve alternatif iletisim kanallari</p>
        </div>
        <div className="apartment-form-fields apartment-form-contact-row">
          <label>
            E-posta 1
            <input type="email" value={formState.email1} onChange={(e) => setFormState((prev) => ({ ...prev, email1: e.target.value }))} placeholder="ornek1@mail.com" />
          </label>
          <label>
            E-posta 2
            <input type="email" value={formState.email2} onChange={(e) => setFormState((prev) => ({ ...prev, email2: e.target.value }))} placeholder="ornek2@mail.com" />
          </label>
          <label>
            E-posta 3
            <input type="email" value={formState.email3} onChange={(e) => setFormState((prev) => ({ ...prev, email3: e.target.value }))} placeholder="ornek3@mail.com" />
          </label>
          <label>
            E-posta 4
            <input type="email" value={formState.email4} onChange={(e) => setFormState((prev) => ({ ...prev, email4: e.target.value }))} placeholder="ornek4@mail.com" />
          </label>
        </div>

        <div className="apartment-form-fields apartment-form-contact-row">
          <label>
            Telefon 1
            <input value={formState.phone1} onChange={(e) => setFormState((prev) => ({ ...prev, phone1: e.target.value }))} placeholder="05xx xxx xx xx" />
          </label>
          <label>
            Telefon 2
            <input value={formState.phone2} onChange={(e) => setFormState((prev) => ({ ...prev, phone2: e.target.value }))} placeholder="05xx xxx xx xx" />
          </label>
          <label>
            Telefon 3
            <input value={formState.phone3} onChange={(e) => setFormState((prev) => ({ ...prev, phone3: e.target.value }))} placeholder="05xx xxx xx xx" />
          </label>
          <label>
            Telefon 4
            <input value={formState.phone4} onChange={(e) => setFormState((prev) => ({ ...prev, phone4: e.target.value }))} placeholder="05xx xxx xx xx" />
          </label>
        </div>
      </section>

      {formState.occupancyType === "TENANT" && (
        <section className="apartment-form-section apartment-form-tenant-section">
          <div className="apartment-form-section-head">
            <h4>🏠 Ev Sahibi Bilgisi</h4>
            <p className="small">Kiraci secildiginde doldurulur</p>
          </div>
          <div className="apartment-form-fields">
            <label>
              Daire Sahibi Ad Soyad
              <input
                value={formState.landlordFullName}
                onChange={(e) => setFormState((prev) => ({ ...prev, landlordFullName: e.target.value }))}
                placeholder="Ev sahibi adi soyadi"
              />
            </label>
            <label>
              Daire Sahibi Telefon
              <input
                value={formState.landlordPhone}
                onChange={(e) => setFormState((prev) => ({ ...prev, landlordPhone: e.target.value }))}
                placeholder="05xx xxx xx xx"
              />
            </label>
            <label>
              Daire Sahibi E-posta
              <input
                type="email"
                value={formState.landlordEmail}
                onChange={(e) => setFormState((prev) => ({ ...prev, landlordEmail: e.target.value }))}
                placeholder="evsahibi@mail.com"
              />
            </label>
          </div>
        </section>
      )}

      <section className="apartment-form-section apartment-form-feature-section">
        <div className="apartment-form-section-head">
          <h4>✅ Hizmet ve Islem Ozellikleri</h4>
          <p className="small">Daireye uygulanacak hareket tiplerini secin</p>
        </div>
        <div className="apartment-feature-grid">
          <label className="checkbox-row">
            <input type="checkbox" checked={formState.hasAidat} onChange={(e) => setFormState((prev) => ({ ...prev, hasAidat: e.target.checked }))} />
            Aidat Var
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={formState.hasDogalgaz} onChange={(e) => setFormState((prev) => ({ ...prev, hasDogalgaz: e.target.checked }))} />
            Dogalgaz Var
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={formState.hasOtherDues} onChange={(e) => setFormState((prev) => ({ ...prev, hasOtherDues: e.target.checked }))} />
            Diger Tum Borclar Var
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={formState.hasIncome} onChange={(e) => setFormState((prev) => ({ ...prev, hasIncome: e.target.checked }))} />
            Gelir Var
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={formState.hasExpenses} onChange={(e) => setFormState((prev) => ({ ...prev, hasExpenses: e.target.checked }))} />
            Gider Var
          </label>
        </div>
      </section>

      {message && <p className="small">{message}</p>}
    </form>
  );
}
