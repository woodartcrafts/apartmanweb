import { Fragment, useMemo, useState } from "react";
import {
  apiBase,
  formatDateTimeTr,
  type ApartmentClassDefinition,
  type ApartmentDutyDefinition,
  type ApartmentOption,
  type ApartmentType,
  type BlockDefinition,
  type OccupancyType,
  type ResidentPasswordHistoryRow,
} from "../../app/shared";

type ApartmentListSortKey =
  | "blockName"
  | "doorNo"
  | "type"
  | "apartmentClassName"
  | "apartmentDutyName"
  | "hasAidat"
  | "hasDogalgaz"
  | "hasOtherDues"
  | "hasIncome"
  | "hasExpenses"
  | "ownerFullName"
  | "contact";

export function ApartmentListPage({
  blockOptions,
  apartmentClassOptions,
  apartmentDutyOptions,
  onEditApartment,
  onDeleteApartment,
}: {
  blockOptions: BlockDefinition[];
  apartmentClassOptions: ApartmentClassDefinition[];
  apartmentDutyOptions: ApartmentDutyDefinition[];
  onEditApartment: (apartment: ApartmentOption) => void;
  onDeleteApartment: (apartment: ApartmentOption) => Promise<void>;
}) {
  const [rows, setRows] = useState<ApartmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{
    key: ApartmentListSortKey | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });
  const [filter, setFilter] = useState({
    blockName: "",
    type: "" as "" | ApartmentType,
    apartmentClassId: "",
    apartmentDutyId: "",
    occupancyType: "" as "" | OccupancyType,
    ownerKeyword: "",
  });
  const [passwordDraftByUserId, setPasswordDraftByUserId] = useState<Record<string, string>>({});
  const [passwordSavingUserId, setPasswordSavingUserId] = useState<string | null>(null);
  const [passwordHistoryByApartmentId, setPasswordHistoryByApartmentId] = useState<
    Record<string, ResidentPasswordHistoryRow[]>
  >({});
  const [passwordHistoryLoadingApartmentId, setPasswordHistoryLoadingApartmentId] = useState<string | null>(null);
  const [passwordHistoryErrorByApartmentId, setPasswordHistoryErrorByApartmentId] = useState<Record<string, string>>({});

  const getContactText = (row: ApartmentOption): string =>
    [row.phone1, row.phone2, row.phone3, row.email1, row.email2, row.email3].filter(Boolean).join(" | ");

  const sortedRows = useMemo(() => {
    if (!sort.key) {
      return rows;
    }

    const getValue = (row: ApartmentOption): string | number => {
      switch (sort.key) {
        case "blockName":
          return row.blockName;
        case "doorNo":
          return row.doorNo;
        case "type":
          return row.type;
        case "apartmentClassName":
          return row.apartmentClassName ?? row.apartmentClassCode ?? "";
        case "apartmentDutyName":
          return row.apartmentDutyName ?? row.apartmentDutyCode ?? "";
        case "hasAidat":
          return row.hasAidat ? 1 : 0;
        case "hasDogalgaz":
          return row.hasDogalgaz ? 1 : 0;
        case "hasOtherDues":
          return row.hasOtherDues ? 1 : 0;
        case "hasIncome":
          return row.hasIncome ? 1 : 0;
        case "hasExpenses":
          return row.hasExpenses ? 1 : 0;
        case "ownerFullName":
          return row.ownerFullName ?? "";
        case "contact":
          return getContactText(row);
        default:
          return "";
      }
    };

    return [...rows].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);

      let compare = 0;
      if (typeof aValue === "number" && typeof bValue === "number") {
        compare = aValue - bValue;
      } else {
        compare = String(aValue).localeCompare(String(bValue), "tr", {
          numeric: true,
          sensitivity: "base",
        });
      }

      if (compare === 0) {
        compare =
          a.blockName.localeCompare(b.blockName, "tr", { numeric: true }) ||
          a.doorNo.localeCompare(b.doorNo, "tr", { numeric: true }) ||
          a.id.localeCompare(b.id);
      }

      return sort.direction === "asc" ? compare : -compare;
    });
  }, [rows, sort]);

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

  async function runQuery(): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const allRows = await adminRequest<ApartmentOption[]>("/api/admin/apartments");
      const normalizedFilter = {
        blockName: filter.blockName.trim(),
        ownerKeyword: filter.ownerKeyword.trim().toLocaleLowerCase("tr"),
      };

      const filtered = allRows.filter((row) => {
        if (normalizedFilter.blockName && row.blockName !== normalizedFilter.blockName) {
          return false;
        }
        if (filter.type && row.type !== filter.type) {
          return false;
        }
        if (filter.apartmentClassId && row.apartmentClassId !== filter.apartmentClassId) {
          return false;
        }
        if (filter.apartmentDutyId && row.apartmentDutyId !== filter.apartmentDutyId) {
          return false;
        }
        if (filter.occupancyType && row.occupancyType !== filter.occupancyType) {
          return false;
        }

        if (normalizedFilter.ownerKeyword) {
          const searchIn = [
            row.ownerFullName ?? "",
            row.apartmentClassName ?? "",
            row.apartmentDutyName ?? "",
            row.landlordFullName ?? "",
            row.phone1 ?? "",
            row.phone2 ?? "",
            row.phone3 ?? "",
            row.email1 ?? "",
            row.email2 ?? "",
            row.email3 ?? "",
            row.landlordPhone ?? "",
            row.landlordEmail ?? "",
          ]
            .join(" ")
            .toLocaleLowerCase("tr");

          if (!searchIn.includes(normalizedFilter.ownerKeyword)) {
            return false;
          }
        }

        return true;
      });

      const initialSorted = [...filtered].sort((a, b) => {
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

      setRows(initialSorted);
      setPasswordDraftByUserId(
        initialSorted.reduce<Record<string, string>>((acc, apartment) => {
          for (const resident of apartment.residentUsers) {
            acc[resident.id] = resident.currentPasswordPlaintext ?? "Daire123!";
          }
          return acc;
        }, {})
      );
      setHasRun(true);
    } catch (err) {
      console.error(err);
      setRows([]);
      setHasRun(true);
      setError(err instanceof Error ? err.message : "Daire listesi alinamadi");
    } finally {
      setLoading(false);
    }
  }

  function clearFilters(): void {
    setFilter({
      blockName: "",
      type: "",
      apartmentClassId: "",
      apartmentDutyId: "",
      occupancyType: "",
      ownerKeyword: "",
    });
    setRows([]);
    setHasRun(false);
    setError("");
  }

  function toggleSort(key: ApartmentListSortKey): void {
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

  function getSortButtonText(key: ApartmentListSortKey): string {
    if (sort.key !== key) {
      return "↕";
    }
    return sort.direction === "asc" ? "↑" : "↓";
  }

  function getSortButtonTitle(key: ApartmentListSortKey): string {
    if (sort.key !== key) {
      return "Sirala";
    }
    return sort.direction === "asc" ? "Artan siralama" : "Azalan siralama";
  }

  async function handleDelete(apartment: ApartmentOption): Promise<void> {
    await onDeleteApartment(apartment);
    if (hasRun) {
      await runQuery();
    }
  }

  async function setResidentPassword(apartmentId: string, userId: string): Promise<void> {
    const password = (passwordDraftByUserId[userId] ?? "").trim();
    if (!password) {
      setError("Sifre bos olamaz");
      return;
    }

    setPasswordSavingUserId(userId);
    setError("");
    try {
      await adminRequest(`/api/admin/apartments/${apartmentId}/resident-password`, {
        method: "POST",
        payload: {
          userId,
          password,
        },
      });

      if (hasRun) {
        await runQuery();
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Resident sifresi guncellenemedi");
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
    setPasswordHistoryErrorByApartmentId((prev) => ({
      ...prev,
      [apartmentId]: "",
    }));
    try {
      const rows = await adminRequest<ResidentPasswordHistoryRow[]>(
        `/api/admin/apartments/${apartmentId}/resident-password-history`
      );
      setPasswordHistoryByApartmentId((prev) => ({
        ...prev,
        [apartmentId]: rows,
      }));
    } catch (err) {
      console.error(err);
      setPasswordHistoryErrorByApartmentId((prev) => ({
        ...prev,
        [apartmentId]: err instanceof Error ? err.message : "Sifre gecmisi alinamadi",
      }));
    } finally {
      setPasswordHistoryLoadingApartmentId(null);
    }
  }

  return (
    <div className="card table-card">
      <div className="section-head">
        <h3>Daire Listesi</h3>
        <div className="admin-row">
          <button className="btn btn-primary btn-run" type="button" onClick={() => void runQuery()} disabled={loading}>
            Calistir
          </button>
          <button className="btn btn-ghost" type="button" onClick={clearFilters} disabled={loading}>
            Temizle
          </button>
        </div>
      </div>

      <div className="admin-forms-grid apartment-list-filter-grid compact-row-top-gap">
        <label>
          Blok
          <select
            value={filter.blockName}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                blockName: e.target.value,
              }))
            }
          >
            <option value="">Tum Bloklar</option>
            {blockOptions.map((block) => (
              <option key={block.id} value={block.name}>
                {block.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tip
          <select
            value={filter.type}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                type: e.target.value as "" | ApartmentType,
              }))
            }
          >
            <option value="">Tum Tipler</option>
            <option value="BUYUK">BUYUK</option>
            <option value="KUCUK">KUCUK</option>
          </select>
        </label>

        <label>
          Daire Sinifi
          <select
            value={filter.apartmentClassId}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                apartmentClassId: e.target.value,
              }))
            }
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
            value={filter.apartmentDutyId}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                apartmentDutyId: e.target.value,
              }))
            }
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
            value={filter.occupancyType}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                occupancyType: e.target.value as "" | OccupancyType,
              }))
            }
          >
            <option value="">Tum Durumlar</option>
            <option value="OWNER">Ev Sahibi</option>
            <option value="TENANT">Kiraci</option>
          </select>
        </label>

        <label>
          Kisi/Iletisim Ara
          <input
            value={filter.ownerKeyword}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                ownerKeyword: e.target.value,
              }))
            }
            placeholder="Ad, telefon veya e-posta"
          />
        </label>
      </div>

      <div className="table-wrap">
        <table className="apartment-list-table apartment-list-page-table">
          <thead>
            <tr>
              <th>
                <span className="apartment-list-th-head">
                  <span>Blok</span>
                  <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("blockName")} title={getSortButtonTitle("blockName")}>
                    {getSortButtonText("blockName")}
                  </button>
                </span>
              </th>
              <th>
                <span className="apartment-list-th-head">
                  <span>Daire No</span>
                  <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("doorNo")} title={getSortButtonTitle("doorNo")}>
                    {getSortButtonText("doorNo")}
                  </button>
                </span>
              </th>
              <th>
                <span className="apartment-list-th-head">
                  <span>Tip</span>
                  <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("type")} title={getSortButtonTitle("type")}>
                    {getSortButtonText("type")}
                  </button>
                </span>
              </th>
              <th>
                <span className="apartment-list-th-head">
                  <span>Daire Sinifi</span>
                  <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("apartmentClassName")} title={getSortButtonTitle("apartmentClassName")}>
                    {getSortButtonText("apartmentClassName")}
                  </button>
                </span>
              </th>
              <th>
                <span className="apartment-list-th-head">
                  <span>Daire Gorevi</span>
                  <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("apartmentDutyName")} title={getSortButtonTitle("apartmentDutyName")}>
                    {getSortButtonText("apartmentDutyName")}
                  </button>
                </span>
              </th>
              <th>
                <span className="apartment-list-th-head">
                  <span>Aidat</span>
                  <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("hasAidat")} title={getSortButtonTitle("hasAidat")}>
                    {getSortButtonText("hasAidat")}
                  </button>
                </span>
              </th>
              <th>
                <span className="apartment-list-th-head">
                  <span>Dogalgaz</span>
                  <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("hasDogalgaz")} title={getSortButtonTitle("hasDogalgaz")}>
                    {getSortButtonText("hasDogalgaz")}
                  </button>
                </span>
              </th>
              <th>
                <span className="apartment-list-th-head">
                  <span>Diger</span>
                  <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("hasOtherDues")} title={getSortButtonTitle("hasOtherDues")}>
                    {getSortButtonText("hasOtherDues")}
                  </button>
                </span>
              </th>
              <th>
                <span className="apartment-list-th-head">
                  <span>Gelir</span>
                  <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("hasIncome")} title={getSortButtonTitle("hasIncome")}>
                    {getSortButtonText("hasIncome")}
                  </button>
                </span>
              </th>
              <th>
                <span className="apartment-list-th-head">
                  <span>Gider</span>
                  <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("hasExpenses")} title={getSortButtonTitle("hasExpenses")}>
                    {getSortButtonText("hasExpenses")}
                  </button>
                </span>
              </th>
              <th>
                <span className="apartment-list-th-head">
                  <span>Oturan</span>
                  <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("ownerFullName")} title={getSortButtonTitle("ownerFullName")}>
                    {getSortButtonText("ownerFullName")}
                  </button>
                </span>
              </th>
              <th>
                <span className="apartment-list-th-head">
                  <span>Iletisim</span>
                  <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("contact")} title={getSortButtonTitle("contact")}>
                    {getSortButtonText("contact")}
                  </button>
                </span>
              </th>
              <th>Resident Sifre</th>
              <th>Islem</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((apartment) => {
              const historyRows = passwordHistoryByApartmentId[apartment.id] ?? null;
              return (
                <Fragment key={apartment.id}>
                  <tr>
                    <td>{apartment.blockName}</td>
                    <td>{apartment.doorNo}</td>
                    <td>{apartment.type}</td>
                    <td>{apartment.apartmentClassName ?? apartment.apartmentClassCode ?? "-"}</td>
                    <td>{apartment.apartmentDutyName ?? apartment.apartmentDutyCode ?? "-"}</td>
                    <td>{apartment.hasAidat ? "Var" : "Yok"}</td>
                    <td>{apartment.hasDogalgaz ? "Var" : "Yok"}</td>
                    <td>{apartment.hasOtherDues ? "Var" : "Yok"}</td>
                    <td>{apartment.hasIncome ? "Var" : "Yok"}</td>
                    <td>{apartment.hasExpenses ? "Var" : "Yok"}</td>
                    <td>{apartment.ownerFullName ?? "-"}</td>
                    <td>{getContactText(apartment) || "-"}</td>
                    <td>
                      {apartment.residentUsers.length === 0 ? (
                        <span className="small">Resident kullanici yok</span>
                      ) : (
                        <div className="guide-list">
                          {apartment.residentUsers.map((resident) => (
                            <div key={resident.id} className="card">
                              <p className="small">
                                <b>{resident.fullName}</b> ({resident.email})
                              </p>
                              <input
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
                              <div className="admin-row compact-row-top-gap">
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  disabled={passwordSavingUserId === resident.id}
                                  onClick={() => void setResidentPassword(apartment.id, resident.id)}
                                >
                                  {passwordSavingUserId === resident.id ? "Kaydediliyor..." : "Sifreyi Kaydet"}
                                </button>
                              </div>
                              <p className="small">
                                Son degisim: {resident.lastPasswordChangedAt ? formatDateTimeTr(resident.lastPasswordChangedAt) : "-"}
                                {resident.lastPasswordChangedByName ? ` | ${resident.lastPasswordChangedByName}` : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="actions-cell">
                      <button className="btn btn-ghost" type="button" onClick={() => onEditApartment(apartment)}>
                        Degistir
                      </button>
                      <button className="btn btn-ghost" type="button" onClick={() => void togglePasswordHistory(apartment.id)}>
                        {historyRows ? "Gecmisi Gizle" : "Sifre Gecmisi"}
                      </button>
                      <button className="btn btn-danger" type="button" onClick={() => void handleDelete(apartment)}>
                        Sil
                      </button>
                    </td>
                  </tr>
                  {historyRows && (
                    <tr key={`${apartment.id}-history`}>
                      <td colSpan={14}>
                        <div className="table-wrap">
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
                                  <td>{row.userFullName} ({row.userEmail})</td>
                                  <td>{row.passwordPlaintext ?? "-"}</td>
                                  <td>{row.reason}</td>
                                  <td>{row.changedByName ? `${row.changedByName} (${row.changedByEmail ?? "-"})` : "Sistem"}</td>
                                </tr>
                              ))}
                              {historyRows.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="empty">Sifre gecmisi yok</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                  {passwordHistoryLoadingApartmentId === apartment.id && (
                    <tr key={`${apartment.id}-history-loading`}>
                      <td colSpan={14} className="small">Sifre gecmisi yukleniyor...</td>
                    </tr>
                  )}
                  {passwordHistoryErrorByApartmentId[apartment.id] && (
                    <tr key={`${apartment.id}-history-error`}>
                      <td colSpan={14} className="small">{passwordHistoryErrorByApartmentId[apartment.id]}</td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={14} className="empty">
                  {error || (hasRun ? "Filtreye uygun daire kaydi yok" : "Filtreleri secip Calistir'a basin")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
