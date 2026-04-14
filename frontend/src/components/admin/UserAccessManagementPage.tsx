import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  apiBase,
  type AdminPageDefinition,
  type AdminPagePermissionMap,
  type AdminUserAccessListResponse,
  type AdminUserAccessRow,
  type UiMessageType,
} from "../../app/shared";
import {
  applyPermissionPreset,
  buildPermissionMap,
  clonePermissionMap,
  updatePermissionCell,
} from "./permissions";

type NewAdminForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

const EMPTY_NEW_ADMIN_FORM: NewAdminForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

type ResetPasswordForm = {
  password: string;
  confirmPassword: string;
};

const EMPTY_RESET_PASSWORD_FORM: ResetPasswordForm = {
  password: "",
  confirmPassword: "",
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isStrongPassword(value: string): boolean {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

function isValidTrPhone(value: string): boolean {
  const normalized = value.replace(/\s+/g, "").trim();
  if (!normalized) return true;
  return /^(\+90|0)?5\d{9}$/.test(normalized);
}

function toFriendlyError(input: unknown, fallback: string): string {
  if (!(input instanceof Error)) {
    return fallback;
  }

  const raw = input.message || fallback;
  if (raw.includes("Invalid request")) return "Form bilgileri gecersiz. Alanlari kontrol edin.";
  if (raw.includes("Bu e-posta") || raw.includes("telefon")) return "Bu e-posta veya telefon zaten kayitli.";
  return raw;
}

export function UserAccessManagementPage() {
  const [loading, setLoading] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [message, setMessage] = useState<{ type: UiMessageType; text: string } | null>(null);

  const [pageDefs, setPageDefs] = useState<AdminPageDefinition[]>([]);
  const [users, setUsers] = useState<AdminUserAccessRow[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [draftPermissions, setDraftPermissions] = useState<AdminPagePermissionMap | null>(null);
  const [resetPasswordForm, setResetPasswordForm] = useState<ResetPasswordForm>(EMPTY_RESET_PASSWORD_FORM);
  const [selectedPasswordVisible, setSelectedPasswordVisible] = useState(false);

  const [newAdminForm, setNewAdminForm] = useState<NewAdminForm>(EMPTY_NEW_ADMIN_FORM);
  const [newAdminPasswordVisible, setNewAdminPasswordVisible] = useState(false);
  const [newAdminPermissionDraft, setNewAdminPermissionDraft] = useState<AdminPagePermissionMap | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [debouncedUserSearch, setDebouncedUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "RESIDENT">("ALL");
  const messageTimerRef = useRef<number | null>(null);

  const adminCount = useMemo(() => users.filter((x) => x.role === "ADMIN").length, [users]);
  const residentCount = useMemo(() => users.filter((x) => x.role === "RESIDENT").length, [users]);
  const messageIsError = message?.type === "error";
  const messageTitle =
    message?.type === "error"
      ? "Islem Basarisiz"
      : message?.type === "info"
        ? "Bilgilendirme"
        : "Islem Tamamlandi";

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const groupedPageDefs = useMemo(() => {
    const groups = new Map<string, Map<string, AdminPageDefinition[]>>();

    for (const page of pageDefs) {
      const parts = page.label.split(" / ").map((part) => part.trim()).filter(Boolean);
      const mainMenu = parts[0] ?? "Diger";
      const subMenu = parts.length >= 3 ? parts[1] : "_direct";

      if (!groups.has(mainMenu)) {
        groups.set(mainMenu, new Map<string, AdminPageDefinition[]>());
      }

      const subGroups = groups.get(mainMenu)!;
      const items = subGroups.get(subMenu) ?? [];
      items.push(page);
      subGroups.set(subMenu, items);
    }

    return Array.from(groups.entries()).map(([mainMenu, subGroups]) => ({
      mainMenu,
      subGroups: Array.from(subGroups.entries()).map(([subMenu, items]) => ({
        subMenu,
        items,
      })),
    }));
  }, [pageDefs]);

  function showMessage(type: UiMessageType, text: string): void {
    setMessage({ type, text });

    if (messageTimerRef.current) {
      window.clearTimeout(messageTimerRef.current);
    }
    messageTimerRef.current = window.setTimeout(() => {
      setMessage(null);
      messageTimerRef.current = null;
    }, 5000);
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedUserSearch(userSearch.trim());
    }, 300);

    return () => window.clearTimeout(handle);
  }, [userSearch]);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        window.clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

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
      throw new Error(errorBody.message ?? "Istek basarisiz");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }, []);

  const fetchUsers = useCallback(async (): Promise<void> => {
    const limit = 200;
    const allRows: AdminUserAccessRow[] = [];
    let total = 0;
    let offset = 0;

    while (true) {
      const params = new URLSearchParams();
      params.set("role", roleFilter);
      if (debouncedUserSearch) {
        params.set("q", debouncedUserSearch);
      }
      params.set("limit", String(limit));
      params.set("offset", String(offset));

      const data = await adminRequest<AdminUserAccessListResponse>(`/api/admin/user-access/users?${params.toString()}`);
      if (offset === 0) {
        total = data.total;
      }

      allRows.push(...data.rows);
      offset += data.rows.length;

      if (data.rows.length === 0 || offset >= total) {
        break;
      }
    }

    setUsers(allRows);
    setTotalUsers(total);

    if (allRows.length === 0) {
      setSelectedUserId("");
      return;
    }

    if (!allRows.some((x) => x.id === selectedUserId)) {
      setSelectedUserId(allRows[0].id);
    }
  }, [adminRequest, roleFilter, debouncedUserSearch, selectedUserId]);

  const reload = useCallback(async (): Promise<void> => {
    const pages = await adminRequest<AdminPageDefinition[]>("/api/admin/user-access/pages");
    setPageDefs(pages);
    setNewAdminPermissionDraft((prev) => prev ?? buildPermissionMap(pages));
    await fetchUsers();
  }, [adminRequest, fetchUsers]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await reload();
      } catch (err) {
        showMessage("error", toFriendlyError(err, "Kullanici yetki verileri alinamadi"));
      } finally {
        setLoading(false);
      }
    })();
  }, [reload]);

  useEffect(() => {
    void (async () => {
      try {
        await fetchUsers();
      } catch (err) {
        showMessage("error", toFriendlyError(err, "Kullanicilar alinamadi"));
      }
    })();
  }, [fetchUsers]);

  useEffect(() => {
    if (!selectedUser) {
      setDraftPermissions(null);
      return;
    }

    setDraftPermissions(selectedUser.permissions ? clonePermissionMap(selectedUser.permissions) : null);
    setResetPasswordForm(EMPTY_RESET_PASSWORD_FORM);
    setSelectedPasswordVisible(false);
  }, [selectedUser]);

  function validateNewAdminForm(): string | null {
    if (!newAdminForm.fullName.trim()) return "Ad Soyad bos olamaz";
    if (!isValidEmail(newAdminForm.email)) return "Gecerli bir e-posta girin";
    if (!isValidTrPhone(newAdminForm.phone)) return "Telefon +90... veya 05... formatinda olmali";
    if (!isStrongPassword(newAdminForm.password)) {
      return "Sifre en az 8 karakter olmali ve harf + rakam icermeli";
    }
    if (newAdminForm.password !== newAdminForm.confirmPassword) {
      return "Sifre ve Sifre Tekrari ayni olmali";
    }
    return null;
  }

  function validateResetPasswordForm(): string | null {
    if (!isStrongPassword(resetPasswordForm.password)) {
      return "Sifre en az 8 karakter olmali ve harf + rakam icermeli";
    }
    if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      return "Sifre ve Sifre Tekrari ayni olmali";
    }
    return null;
  }

  async function saveSelectedUserPermissions(): Promise<void> {
    if (!selectedUser || !draftPermissions) {
      showMessage("error", "Lutfen kullanici secin");
      return;
    }

    setSavingPermissions(true);
    try {
      await adminRequest(`/api/admin/user-access/users/${selectedUser.id}/permissions`, {
        method: "PUT",
        payload: { permissions: draftPermissions },
      });
      await fetchUsers();
      showMessage("success", "Yetkiler kaydedildi");
    } catch (err) {
      showMessage("error", toFriendlyError(err, "Yetkiler kaydedilemedi"));
    } finally {
      setSavingPermissions(false);
    }
  }

  async function createAdminUser(): Promise<void> {
    const formError = validateNewAdminForm();
    if (formError) {
      showMessage("error", formError);
      return;
    }

    if (!newAdminPermissionDraft) {
      showMessage("error", "Yetki matrisi hazir degil");
      return;
    }

    setCreatingUser(true);
    try {
      await adminRequest("/api/admin/user-access/users", {
        method: "POST",
        payload: {
          ...newAdminForm,
          phone: newAdminForm.phone.trim() || undefined,
          permissions: newAdminPermissionDraft,
        },
      });

      setNewAdminForm(EMPTY_NEW_ADMIN_FORM);
      setNewAdminPermissionDraft(buildPermissionMap(pageDefs));
      await fetchUsers();
      showMessage("success", "Yeni admin kullanici olusturuldu");
    } catch (err) {
      showMessage("error", toFriendlyError(err, "Kullanici olusturulamadi"));
    } finally {
      setCreatingUser(false);
    }
  }

  async function resetSelectedUserPassword(): Promise<void> {
    if (!selectedUser) {
      showMessage("error", "Lutfen kullanici secin");
      return;
    }
    if (selectedUser.role !== "ADMIN") {
      showMessage("error", "Bu ekranda sadece ADMIN kullanici sifresi guncellenir");
      return;
    }

    const formError = validateResetPasswordForm();
    if (formError) {
      showMessage("error", formError);
      return;
    }

    const shouldReset = window.confirm(`${selectedUser.fullName} icin sifreyi guncellemek istiyor musunuz?`);
    if (!shouldReset) {
      return;
    }

    setSavingPassword(true);
    try {
      await adminRequest(`/api/admin/user-access/users/${selectedUser.id}/password`, {
        method: "PUT",
        payload: { password: resetPasswordForm.password },
      });
      setResetPasswordForm(EMPTY_RESET_PASSWORD_FORM);
      showMessage("success", "Kullanici sifresi guncellendi");
    } catch (err) {
      showMessage("error", toFriendlyError(err, "Sifre guncellenemedi"));
    } finally {
      setSavingPassword(false);
    }
  }

  async function deleteSelectedUser(): Promise<void> {
    if (!selectedUser) {
      showMessage("error", "Lutfen kullanici secin");
      return;
    }
    if (selectedUser.role !== "ADMIN") {
      showMessage("error", "Bu ekranda sadece ADMIN kullanici silinir");
      return;
    }

    const shouldDelete = window.confirm(`${selectedUser.fullName} kullanicisini silmek istiyor musunuz?`);
    if (!shouldDelete) {
      return;
    }

    setDeletingUser(true);
    try {
      await adminRequest(`/api/admin/user-access/users/${selectedUser.id}`, {
        method: "DELETE",
      });
      setSelectedUserId("");
      await fetchUsers();
      showMessage("success", "Kullanici silindi");
    } catch (err) {
      showMessage("error", toFriendlyError(err, "Kullanici silinemedi"));
    } finally {
      setDeletingUser(false);
    }
  }

  function cancelPermissionChanges(): void {
    if (!selectedUser?.permissions) {
      return;
    }
    setDraftPermissions(clonePermissionMap(selectedUser.permissions));
    showMessage("info", "Yetki degisiklikleri geri alindi");
  }

  function renderPermissionMatrix(
    permissionMap: AdminPagePermissionMap,
    setPermissionMap: Dispatch<SetStateAction<AdminPagePermissionMap | null>>
  ) {
    const keys = Object.keys(permissionMap) as Array<keyof AdminPagePermissionMap>;
    const allVisibleChecked = keys.length > 0 && keys.every((key) => permissionMap[key].visible);
    const allReadChecked = keys.length > 0 && keys.every((key) => permissionMap[key].read);
    const allWriteChecked = keys.length > 0 && keys.every((key) => permissionMap[key].write);
    const allDeleteChecked = keys.length > 0 && keys.every((key) => permissionMap[key].delete);

    function setWholeColumn(column: "visible" | "read" | "write" | "delete", checked: boolean): void {
      setPermissionMap((prev) => {
        if (!prev) {
          return prev;
        }

        let next = prev;
        const columnKeys = Object.keys(prev) as Array<keyof AdminPagePermissionMap>;
        for (const key of columnKeys) {
          next = updatePermissionCell(next, column, checked, key);
        }
        return next;
      });
    }

    return (
      <table className="permission-matrix-table">
        <thead>
          <tr>
            <th>Sayfa</th>
            <th>
              <label className="permission-header-check">
                <input
                  type="checkbox"
                  checked={allVisibleChecked}
                  onChange={(e) => setWholeColumn("visible", e.target.checked)}
                  aria-label="Tum satirlarda Goster secimini degistir"
                />
                <span>Goster</span>
              </label>
            </th>
            <th>
              <label className="permission-header-check">
                <input
                  type="checkbox"
                  checked={allReadChecked}
                  onChange={(e) => setWholeColumn("read", e.target.checked)}
                  aria-label="Tum satirlarda Okuma secimini degistir"
                />
                <span>Okuma</span>
              </label>
            </th>
            <th>
              <label className="permission-header-check">
                <input
                  type="checkbox"
                  checked={allWriteChecked}
                  onChange={(e) => setWholeColumn("write", e.target.checked)}
                  aria-label="Tum satirlarda Yazma secimini degistir"
                />
                <span>Yazma</span>
              </label>
            </th>
            <th>
              <label className="permission-header-check">
                <input
                  type="checkbox"
                  checked={allDeleteChecked}
                  onChange={(e) => setWholeColumn("delete", e.target.checked)}
                  aria-label="Tum satirlarda Silme secimini degistir"
                />
                <span>Silme</span>
              </label>
            </th>
          </tr>
        </thead>
        <tbody>
          {groupedPageDefs.map((group) => (
            <Fragment key={`group-${group.mainMenu}`}>
              <tr key={`group-${group.mainMenu}`} className="permission-main-row">
                <td colSpan={5}>{group.mainMenu}</td>
              </tr>
              {group.subGroups.map((subGroup) => (
                <Fragment key={`subgroup-${group.mainMenu}-${subGroup.subMenu}`}>
                  {subGroup.subMenu !== "_direct" && (
                    <tr className="permission-subgroup-row">
                      <td colSpan={5}>{subGroup.subMenu}</td>
                    </tr>
                  )}
                  {subGroup.items.map((page) => {
                    const row = permissionMap[page.key];
                    const parts = page.label.split(" / ").map((part) => part.trim()).filter(Boolean);
                    const submenuLabel = parts.length >= 3 ? parts.slice(2).join(" / ") : parts.slice(1).join(" / ") || page.label;
                    return (
                      <tr key={page.key}>
                        <td className="permission-submenu-cell">{submenuLabel}</td>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${page.label} goster`}
                            checked={row.visible}
                            onChange={(e) =>
                              setPermissionMap((prev) =>
                                prev ? updatePermissionCell(prev, "visible", e.target.checked, page.key) : prev
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${page.label} okuma`}
                            checked={row.read}
                            onChange={(e) =>
                              setPermissionMap((prev) =>
                                prev ? updatePermissionCell(prev, "read", e.target.checked, page.key) : prev
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${page.label} yazma`}
                            checked={row.write}
                            onChange={(e) =>
                              setPermissionMap((prev) =>
                                prev ? updatePermissionCell(prev, "write", e.target.checked, page.key) : prev
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${page.label} silme`}
                            checked={row.delete}
                            onChange={(e) =>
                              setPermissionMap((prev) =>
                                prev ? updatePermissionCell(prev, "delete", e.target.checked, page.key) : prev
                              )
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <section className="dashboard user-access-page">
      {message && (
        <div className="blocking-modal toast-modal" role="status" aria-live="polite" aria-busy="false">
          <div className={`blocking-modal-card save-notice-modal-card${messageIsError ? " save-notice-modal-card-error" : ""}`}>
            <div className="save-notice-icon" aria-hidden="true">
              {messageIsError ? "!" : "✓"}
            </div>
            <h3>{messageTitle}</h3>
            <p className="small">{message.text}</p>
          </div>
        </div>
      )}

      <div className="card admin-form user-access-page-card user-access-overview-card">
        <div className="section-head">
          <div>
            <h3>Kullanici, Sifre ve Yetkiler</h3>
            <p className="small">Merkezi yonetim paneli: hesap olusturma, sifre islemleri ve detayli menu yetkilendirme.</p>
          </div>
        </div>

        <div className="small user-access-intro">
          Bu ekranda sadece ADMIN kullanicilarin sayfa yetkilerini yonetirsiniz. RESIDENT kullanicilar listede gorunur,
          ancak yetki matrisi uygulanmaz.
        </div>

        <div className="user-access-stats compact-row-top-gap">
          <span className="chip">Toplam: {totalUsers}</span>
          <span className="chip">Admin: {adminCount}</span>
          <span className="chip">Resident: {residentCount}</span>
        </div>

        <div className="form-grid compact-row-top-gap user-access-filter-grid">
          <label>
            Rol Filtresi
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "ALL" | "ADMIN" | "RESIDENT")}>
              <option value="ALL">Tum Roller</option>
              <option value="ADMIN">ADMIN</option>
              <option value="RESIDENT">RESIDENT</option>
            </select>
          </label>
          <label>
            Kullanici Ara
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Ad, e-posta veya telefon"
            />
          </label>
          <label>
            Kullanici
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loading || users.length === 0}
            >
              {users.length === 0 && <option value="">Kullanici yok</option>}
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.role}] {item.fullName} ({item.email})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="guide-list compact-row-top-gap">
          <article className="card">
            <h4>Nasil Calisir?</h4>
            <p className="small">1) Listeden kullanici secin.</p>
            <p className="small">2) ADMIN ise yetki matrisi acilir. RESIDENT ise bilgilendirme gorursunuz.</p>
            <p className="small">3) Goster/Okuma/Yazma/Silme kutularini ayarlayip Yetkileri Kaydet'e basin.</p>
            <p className="small">4) Sifre islemleri sadece secili ADMIN kullanici icin uygulanir.</p>
          </article>
        </div>
      </div>

      <div className="user-access-workspace">
      <div className="card table-card user-access-page-card user-access-action-card">
        <h3>Secili Kullanici Islem Karti</h3>
        <p className="small">Secili hesabin sifresini guncelleyin ve menuleri tek tek yetkilendirin.</p>
        <p className="small">Not: Mevcut sifre goruntulenemez. "Sifreyi Goster" butonu sadece asagida yazdiginiz yeni sifreyi gorunur yapar.</p>

        {selectedUser && draftPermissions ? (
          <>
            <p className="small user-access-selected-meta">
              Secili Rol: <b className="user-access-role-badge">{selectedUser.role}</b>
            </p>

            <div className="form-grid compact-row-top-gap">
              <label>
                Sifre Sifirla
                <input
                  type={selectedPasswordVisible ? "text" : "password"}
                  value={resetPasswordForm.password}
                  onChange={(e) => setResetPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Yeni sifre"
                />
              </label>
              <label>
                Sifre Tekrari
                <input
                  type={selectedPasswordVisible ? "text" : "password"}
                  value={resetPasswordForm.confirmPassword}
                  onChange={(e) => setResetPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Yeni sifre tekrar"
                />
              </label>
            </div>

            <div className="admin-row compact-row-top-gap">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setSelectedPasswordVisible((prev) => !prev)}
              >
                {selectedPasswordVisible ? "Yazdigim Sifreyi Gizle" : "Yazdigim Sifreyi Goster"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => void resetSelectedUserPassword()}
                disabled={savingPassword || selectedUser.role !== "ADMIN"}
              >
                {savingPassword ? "Kaydediliyor..." : "Sifreyi Guncelle"}
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => void deleteSelectedUser()}
                disabled={deletingUser || selectedUser.role !== "ADMIN"}
              >
                {deletingUser ? "Siliniyor..." : "Kullaniciyi Sil"}
              </button>
            </div>

            <div className="table-wrap compact-row-top-gap permission-matrix-wrap">
              <div className="admin-row compact-row-top-gap permission-preset-row">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setDraftPermissions((prev) => (prev ? applyPermissionPreset(prev, "full") : prev))}
                >
                  Tum Yetkiler
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setDraftPermissions((prev) => (prev ? applyPermissionPreset(prev, "readOnly") : prev))}
                >
                  Sadece Goster + Okuma
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setDraftPermissions((prev) => (prev ? applyPermissionPreset(prev, "hidden") : prev))}
                >
                  Tumunu Gizle
                </button>
              </div>
              {renderPermissionMatrix(draftPermissions, setDraftPermissions)}
            </div>

            <div className="admin-row compact-row-top-gap">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void saveSelectedUserPermissions()}
                disabled={savingPermissions}
              >
                {savingPermissions ? "Kaydediliyor..." : "Yetkileri Kaydet"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={cancelPermissionChanges}>
                Degisiklikleri Geri Al
              </button>
            </div>
          </>
        ) : selectedUser ? (
          <p className="small">
            Secili kullanici <b>RESIDENT</b> rolunde. Bu ekranda resident icin sayfa yetkisi duzenlenmez.
          </p>
        ) : (
          <p className="small">Kullanici secin.</p>
        )}
      </div>

      <div className="card table-card user-access-page-card user-access-create-card">
        <h3>Yeni Admin Kullanici</h3>
        <p className="small">Yeni yonetici hesap acin, sifresini tanimlayin ve ilk yetki setini olusturun.</p>
        <div className="form-grid compact-row-top-gap">
          <label>
            Ad Soyad
            <input
              type="text"
              value={newAdminForm.fullName}
              onChange={(e) => setNewAdminForm((prev) => ({ ...prev, fullName: e.target.value }))}
              placeholder="Ad Soyad"
            />
          </label>
          <label>
            E-posta
            <input
              type="email"
              value={newAdminForm.email}
              onChange={(e) => setNewAdminForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="admin@ornek.com"
            />
          </label>
          <label>
            Telefon
            <input
              type="text"
              value={newAdminForm.phone}
              onChange={(e) => setNewAdminForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+90..."
            />
          </label>
          <label>
            Sifre
            <input
              type={newAdminPasswordVisible ? "text" : "password"}
              value={newAdminForm.password}
              onChange={(e) => setNewAdminForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="En az 8 karakter"
            />
          </label>
          <label>
            Sifre Tekrari
            <input
              type={newAdminPasswordVisible ? "text" : "password"}
              value={newAdminForm.confirmPassword}
              onChange={(e) => setNewAdminForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Sifreyi tekrar girin"
            />
          </label>
        </div>

        {newAdminPermissionDraft && (
          <div className="table-wrap compact-row-top-gap permission-matrix-wrap">
            <div className="admin-row compact-row-top-gap permission-preset-row">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setNewAdminPermissionDraft((prev) => (prev ? applyPermissionPreset(prev, "full") : prev))}
              >
                Tum Yetkiler
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  setNewAdminPermissionDraft((prev) => (prev ? applyPermissionPreset(prev, "readOnly") : prev))
                }
              >
                Sadece Goster + Okuma
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setNewAdminPermissionDraft((prev) => (prev ? applyPermissionPreset(prev, "hidden") : prev))}
              >
                Tumunu Gizle
              </button>
            </div>
            {renderPermissionMatrix(newAdminPermissionDraft, setNewAdminPermissionDraft)}
          </div>
        )}

        <div className="admin-row compact-row-top-gap">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setNewAdminPasswordVisible((prev) => !prev)}
          >
            {newAdminPasswordVisible ? "Yazdigim Sifreyi Gizle" : "Yazdigim Sifreyi Goster"}
          </button>
          <button className="btn btn-primary" type="button" onClick={() => void createAdminUser()} disabled={creatingUser}>
            {creatingUser ? "Olusturuluyor..." : "Admin Kullanici Olustur"}
          </button>
        </div>
        <p className="small">Not: Ad Soyad, gecerli e-posta ve en az 8 karakter (harf+rakam) sifre zorunludur.</p>
      </div>
      </div>
    </section>
  );
}
