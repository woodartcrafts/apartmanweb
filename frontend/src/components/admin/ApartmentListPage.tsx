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
  const typeValues: ApartmentType[] = ["BUYUK", "KUCUK"];
  const occupancyValues: OccupancyType[] = ["OWNER", "TENANT"];

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
    blockNames: [] as string[],
    types: [] as ApartmentType[],
    apartmentClassIds: [] as string[],
    apartmentDutyIds: [] as string[],
    occupancyTypes: [] as OccupancyType[],
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

  const dashboardStats = useMemo(() => {
    const total = rows.length;
    const ownerCount = rows.filter((x) => x.occupancyType === "OWNER").length;
    const tenantCount = rows.filter((x) => x.occupancyType === "TENANT").length;
    const noAidatCount = rows.filter((x) => !x.hasAidat).length;
    const residentAccountCount = rows.reduce((acc, item) => acc + item.residentUsers.length, 0);

    return {
      total,
      ownerCount,
      tenantCount,
      noAidatCount,
      residentAccountCount,
    };
  }, [rows]);

  const blockValues = useMemo(() => blockOptions.map((x) => x.name), [blockOptions]);
  const apartmentClassValues = useMemo(() => apartmentClassOptions.map((x) => x.id), [apartmentClassOptions]);
  const apartmentDutyValues = useMemo(() => apartmentDutyOptions.map((x) => x.id), [apartmentDutyOptions]);

  const allBlocksSelected = blockValues.length > 0 && filter.blockNames.length === blockValues.length;
  const allTypesSelected = typeValues.length > 0 && filter.types.length === typeValues.length;
  const allClassesSelected =
    apartmentClassValues.length > 0 && filter.apartmentClassIds.length === apartmentClassValues.length;
  const allDutiesSelected = apartmentDutyValues.length > 0 && filter.apartmentDutyIds.length === apartmentDutyValues.length;
  const allOccupanciesSelected =
    occupancyValues.length > 0 && filter.occupancyTypes.length === occupancyValues.length;

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
        ownerKeyword: filter.ownerKeyword.trim().toLocaleLowerCase("tr"),
      };

      const filtered = allRows.filter((row) => {
        if (filter.blockNames.length > 0 && !filter.blockNames.includes(row.blockName)) {
          return false;
        }
        if (filter.types.length > 0 && !filter.types.includes(row.type)) {
          return false;
        }
        if (filter.apartmentClassIds.length > 0 && !filter.apartmentClassIds.includes(row.apartmentClassId ?? "")) {
          return false;
        }
        if (filter.apartmentDutyIds.length > 0 && !filter.apartmentDutyIds.includes(row.apartmentDutyId ?? "")) {
          return false;
        }
        if (filter.occupancyTypes.length > 0 && !filter.occupancyTypes.includes(row.occupancyType)) {
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
            acc[resident.id] = "";
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
      blockNames: [],
      types: [],
      apartmentClassIds: [],
      apartmentDutyIds: [],
      occupancyTypes: [],
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
      return "|";
    }
    return sort.direction === "asc" ? "^" : "v";
  }

  function getSortButtonTitle(key: ApartmentListSortKey): string {
    if (sort.key !== key) {
      return "Sirala";
    }
    return sort.direction === "asc" ? "Artan siralama" : "Azalan siralama";
  }

  function renderFeatureBadge(active: boolean) {
    return <span className={`apartment-list-flag ${active ? "is-on" : "is-off"}`}>{active ? "Var" : "Yok"}</span>;
  }

  function getSelectionSummary(selectedCount: number, allCount: number, emptyText: string): string {
    if (selectedCount === 0) {
      return emptyText;
    }
    if (allCount > 0 && selectedCount === allCount) {
      return "Hepsi";
    }
    return `${selectedCount} secili`;
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
      const historyRows = await adminRequest<ResidentPasswordHistoryRow[]>(
        `/api/admin/apartments/${apartmentId}/resident-password-history`
      );
      setPasswordHistoryByApartmentId((prev) => ({
        ...prev,
        [apartmentId]: historyRows,
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
    <section className="dashboard report-page apartment-list-report-page">
      <div className="card table-card report-page-card apartment-list-hero-card">
        <div className="section-head report-toolbar">
          <h3>Daire Listesi Raporu</h3>
          <div className="admin-row">
            <button className="btn btn-primary btn-run" type="button" onClick={() => void runQuery()} disabled={loading}>
              {loading ? "Yukleniyor..." : "Calistir"}
            </button>
            <button className="btn btn-ghost" type="button" onClick={clearFilters} disabled={loading}>
              Temizle
            </button>
          </div>
        </div>

        <div className="stats-grid apartment-list-kpi-grid compact-row-top-gap">
          <article className="card stat stat-tone-info">
            <h4>Toplam Daire</h4>
            <p>{dashboardStats.total}</p>
          </article>
          <article className="card stat stat-tone-good">
            <h4>Ev Sahibi</h4>
            <p>{dashboardStats.ownerCount}</p>
          </article>
          <article className="card stat stat-tone-warn">
            <h4>Kiraci</h4>
            <p>{dashboardStats.tenantCount}</p>
          </article>
          <article className="card stat stat-tone-danger">
            <h4>Aidat Muaf</h4>
            <p>{dashboardStats.noAidatCount}</p>
          </article>
          <article className="card stat stat-tone-info">
            <h4>Resident Kullanici</h4>
            <p>{dashboardStats.residentAccountCount}</p>
          </article>
        </div>
      </div>

      <div className="card table-card report-page-card apartment-list-filter-card">
        <div className="admin-forms-grid apartment-list-filter-grid report-filter-grid compact-row-top-gap">
          <label className="filter-dropdown-field apartment-list-filter-tile">
            Blok
            <details className="filter-dropdown apartment-edit-select-dropdown">
              <summary>{getSelectionSummary(filter.blockNames.length, blockValues.length, "Tum Bloklar")}</summary>
              <div className="filter-dropdown-panel apartment-edit-select-list">
                <div className="filter-dropdown-head">
                  <span className="small">Blok Secimi</span>
                </div>
                <label className="bulk-filter-option apartment-edit-select-item">
                  <input
                    type="checkbox"
                    checked={allBlocksSelected}
                    onChange={(e) =>
                      setFilter((prev) => ({
                        ...prev,
                        blockNames: e.target.checked ? blockValues : [],
                      }))
                    }
                  />
                  Hepsini Sec
                </label>
                <div className="bulk-filter-options">
                  {blockOptions.map((block) => {
                    const checked = filter.blockNames.includes(block.name);
                    return (
                      <label key={block.id} className="bulk-filter-option apartment-edit-select-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setFilter((prev) => ({
                              ...prev,
                              blockNames: e.target.checked
                                ? [...prev.blockNames, block.name]
                                : prev.blockNames.filter((x) => x !== block.name),
                            }))
                          }
                        />
                        {block.name}
                      </label>
                    );
                  })}
                </div>
                {allBlocksSelected && <p className="small">Tum bloklar secili</p>}
              </div>
            </details>
          </label>

          <label className="filter-dropdown-field apartment-list-filter-tile">
            Tip
            <details className="filter-dropdown apartment-edit-select-dropdown">
              <summary>{getSelectionSummary(filter.types.length, typeValues.length, "Tum Tipler")}</summary>
              <div className="filter-dropdown-panel apartment-edit-select-list">
                <div className="filter-dropdown-head">
                  <span className="small">Tip Secimi</span>
                </div>
                <label className="bulk-filter-option apartment-edit-select-item">
                  <input
                    type="checkbox"
                    checked={allTypesSelected}
                    onChange={(e) =>
                      setFilter((prev) => ({
                        ...prev,
                        types: e.target.checked ? typeValues : [],
                      }))
                    }
                  />
                  Hepsini Sec
                </label>
                <div className="bulk-filter-options">
                  {typeValues.map((value) => {
                    const checked = filter.types.includes(value);
                    return (
                      <label key={value} className="bulk-filter-option apartment-edit-select-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setFilter((prev) => ({
                              ...prev,
                              types: e.target.checked ? [...prev.types, value] : prev.types.filter((x) => x !== value),
                            }))
                          }
                        />
                        {value}
                      </label>
                    );
                  })}
                </div>
                {allTypesSelected && <p className="small">Tum tipler secili</p>}
              </div>
            </details>
          </label>

          <label className="filter-dropdown-field apartment-list-filter-tile">
            Daire Sinifi
            <details className="filter-dropdown apartment-edit-select-dropdown">
              <summary>{getSelectionSummary(filter.apartmentClassIds.length, apartmentClassValues.length, "Tum Siniflar")}</summary>
              <div className="filter-dropdown-panel apartment-edit-select-list">
                <div className="filter-dropdown-head">
                  <span className="small">Sinif Secimi</span>
                </div>
                <label className="bulk-filter-option apartment-edit-select-item">
                  <input
                    type="checkbox"
                    checked={allClassesSelected}
                    onChange={(e) =>
                      setFilter((prev) => ({
                        ...prev,
                        apartmentClassIds: e.target.checked ? apartmentClassValues : [],
                      }))
                    }
                  />
                  Hepsini Sec
                </label>
                <div className="bulk-filter-options">
                  {apartmentClassOptions.map((item) => {
                    const checked = filter.apartmentClassIds.includes(item.id);
                    return (
                      <label key={item.id} className="bulk-filter-option apartment-edit-select-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setFilter((prev) => ({
                              ...prev,
                              apartmentClassIds: e.target.checked
                                ? [...prev.apartmentClassIds, item.id]
                                : prev.apartmentClassIds.filter((x) => x !== item.id),
                            }))
                          }
                        />
                        {item.code} - {item.name}
                      </label>
                    );
                  })}
                </div>
                {allClassesSelected && <p className="small">Tum siniflar secili</p>}
              </div>
            </details>
          </label>

          <label className="filter-dropdown-field apartment-list-filter-tile">
            Daire Gorevi
            <details className="filter-dropdown apartment-edit-select-dropdown">
              <summary>{getSelectionSummary(filter.apartmentDutyIds.length, apartmentDutyValues.length, "Tum Gorevler")}</summary>
              <div className="filter-dropdown-panel apartment-edit-select-list">
                <div className="filter-dropdown-head">
                  <span className="small">Gorev Secimi</span>
                </div>
                <label className="bulk-filter-option apartment-edit-select-item">
                  <input
                    type="checkbox"
                    checked={allDutiesSelected}
                    onChange={(e) =>
                      setFilter((prev) => ({
                        ...prev,
                        apartmentDutyIds: e.target.checked ? apartmentDutyValues : [],
                      }))
                    }
                  />
                  Hepsini Sec
                </label>
                <div className="bulk-filter-options">
                  {apartmentDutyOptions.map((item) => {
                    const checked = filter.apartmentDutyIds.includes(item.id);
                    return (
                      <label key={item.id} className="bulk-filter-option apartment-edit-select-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setFilter((prev) => ({
                              ...prev,
                              apartmentDutyIds: e.target.checked
                                ? [...prev.apartmentDutyIds, item.id]
                                : prev.apartmentDutyIds.filter((x) => x !== item.id),
                            }))
                          }
                        />
                        {item.code} - {item.name}
                      </label>
                    );
                  })}
                </div>
                {allDutiesSelected && <p className="small">Tum gorevler secili</p>}
              </div>
            </details>
          </label>

          <label className="filter-dropdown-field apartment-list-filter-tile">
            Ev Durumu
            <details className="filter-dropdown apartment-edit-select-dropdown">
              <summary>{getSelectionSummary(filter.occupancyTypes.length, occupancyValues.length, "Tum Durumlar")}</summary>
              <div className="filter-dropdown-panel apartment-edit-select-list">
                <div className="filter-dropdown-head">
                  <span className="small">Ev Durumu Secimi</span>
                </div>
                <label className="bulk-filter-option apartment-edit-select-item">
                  <input
                    type="checkbox"
                    checked={allOccupanciesSelected}
                    onChange={(e) =>
                      setFilter((prev) => ({
                        ...prev,
                        occupancyTypes: e.target.checked ? occupancyValues : [],
                      }))
                    }
                  />
                  Hepsini Sec
                </label>
                <div className="bulk-filter-options">
                  {occupancyValues.map((value) => {
                    const checked = filter.occupancyTypes.includes(value);
                    return (
                      <label key={value} className="bulk-filter-option apartment-edit-select-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setFilter((prev) => ({
                              ...prev,
                              occupancyTypes: e.target.checked
                                ? [...prev.occupancyTypes, value]
                                : prev.occupancyTypes.filter((x) => x !== value),
                            }))
                          }
                        />
                        {value === "OWNER" ? "Ev Sahibi" : "Kiraci"}
                      </label>
                    );
                  })}
                </div>
                {allOccupanciesSelected && <p className="small">Tum durumlar secili</p>}
              </div>
            </details>
          </label>

          <label className="filter-dropdown-field apartment-list-filter-tile">
            Kisi/Iletisim Ara
            <details className="filter-dropdown apartment-edit-select-dropdown">
              <summary>{filter.ownerKeyword.trim() || "Ad, telefon veya e-posta"}</summary>
              <div className="filter-dropdown-panel apartment-edit-select-list">
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
                <div className="bulk-filter-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setFilter((prev) => ({ ...prev, ownerKeyword: "" }))}>
                    Temizle
                  </button>
                </div>
              </div>
            </details>
          </label>
        </div>
      </div>

      <div className="card table-card report-page-card">
        {hasRun && !error && <p className="small apartment-list-run-meta">Filtre sonucu: {rows.length} daire</p>}
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
                    <span>Oturan</span>
                    <button type="button" className="btn btn-ghost apartment-list-sort-btn" onClick={() => toggleSort("ownerFullName")} title={getSortButtonTitle("ownerFullName")}>
                      {getSortButtonText("ownerFullName")}
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
                      <td>{apartment.ownerFullName ?? "-"}</td>
                      <td>{apartment.type}</td>
                      <td>{apartment.apartmentClassName ?? apartment.apartmentClassCode ?? "-"}</td>
                      <td>{apartment.apartmentDutyName ?? apartment.apartmentDutyCode ?? "-"}</td>
                      <td>{renderFeatureBadge(apartment.hasAidat)}</td>
                      <td>{renderFeatureBadge(apartment.hasDogalgaz)}</td>
                      <td>{renderFeatureBadge(apartment.hasOtherDues)}</td>
                      <td>{renderFeatureBadge(apartment.hasIncome)}</td>
                      <td>{renderFeatureBadge(apartment.hasExpenses)}</td>
                      <td>{getContactText(apartment) || "-"}</td>
                      <td>
                        {apartment.residentUsers.length === 0 ? (
                          <span className="small">Resident kullanici yok</span>
                        ) : (
                          <div className="apartment-resident-inline-list">
                            {apartment.residentUsers.map((resident) => (
                              <div key={resident.id} className="apartment-resident-inline">
                                <input
                                  type="text"
                                  value={passwordDraftByUserId[resident.id] ?? ""}
                                  onChange={(e) =>
                                    setPasswordDraftByUserId((prev) => ({
                                      ...prev,
                                      [resident.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={`Resident sifresi (${resident.fullName})`}
                                  title={`${resident.fullName} (${resident.email})`}
                                />
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  disabled={passwordSavingUserId === resident.id}
                                  onClick={() => void setResidentPassword(apartment.id, resident.id)}
                                  title={
                                    `Son degisim: ${
                                      resident.lastPasswordChangedAt ? formatDateTimeTr(resident.lastPasswordChangedAt) : "-"
                                    }${resident.lastPasswordChangedByName ? ` | ${resident.lastPasswordChangedByName}` : ""}`
                                  }
                                >
                                  {passwordSavingUserId === resident.id ? "Kaydediliyor..." : "Kaydet"}
                                </button>
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
                        </td>
                      </tr>
                    )}
                    {passwordHistoryLoadingApartmentId === apartment.id && (
                      <tr key={`${apartment.id}-history-loading`}>
                        <td colSpan={14} className="small">
                          Sifre gecmisi yukleniyor...
                        </td>
                      </tr>
                    )}
                    {passwordHistoryErrorByApartmentId[apartment.id] && (
                      <tr key={`${apartment.id}-history-error`}>
                        <td colSpan={14} className="small">
                          {passwordHistoryErrorByApartmentId[apartment.id]}
                        </td>
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
    </section>
  );
}
