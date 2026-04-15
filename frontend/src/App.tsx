import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { apiBase, userStorageKey, type LoginResponse } from "./app/shared";
import { Silent403Error } from "./errors";
import AdminPage from "./components/AdminPage";
import ResidentPage from "./components/ResidentPage";

function LoginPage({
  onLogin,
  loading,
  message,
}: {
  onLogin: (identifier: string, password: string) => Promise<void>;
  loading: boolean;
  message: string;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    await onLogin(identifier, password);
  }

  return (
    <section className="card login-card">
      <h2>Giris</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Telefon veya E-posta
          <input
            data-testid="login-identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="+90 5xx xxx xx xx veya admin@apartman.local"
            required
          />
        </label>
        <label>
          Sifre
          <input
            data-testid="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            required
          />
        </label>
        <button data-testid="login-submit" disabled={loading} type="submit" className="btn btn-primary">
          {loading ? "Bekleyin..." : "Giris Yap"}
        </button>
      </form>
      <footer className="status-bar">{message}</footer>
    </section>
  );
}


// Silent403Error console'a yazÄ±lmasÄ±n â€” bu hatalar izin eksikliÄŸinden kaynaklanÄ±r, kullanÄ±cÄ±ya gÃ¶sterilmez
const _origConsoleError = console.error.bind(console);
// eslint-disable-next-line no-console
console.error = (...args: unknown[]) => {
  if (args.length > 0 && args[0] instanceof Silent403Error) return;
  _origConsoleError(...args);
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<LoginResponse["user"] | null>(() => {
    const raw = localStorage.getItem(userStorageKey);
    return raw ? (JSON.parse(raw) as LoginResponse["user"]) : null;
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("Lutfen giris yapin");
  const defaultAuthenticatedPath = user?.role === "ADMIN" ? "/admin/reports" : "/resident";

  // Sayfa yenilemede JWT cookie gonderilemiyor olabilir (mobil Safari SameSite sorunu).
  // localStorage'dan kullanici restore edilir edilmez /api/auth/me ile session dogrula
  // ve taze adminPagePermissions al. Basarisizsa logout yap.
  useEffect(() => {
    const raw = localStorage.getItem(userStorageKey);
    if (!raw) return;

    void fetch(`${apiBase}/api/auth/me`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          setUser(null);
          localStorage.removeItem(userStorageKey);
          setAuthMessage("Oturum suresi doldu. Lutfen tekrar giris yapin.");
          return;
        }
        const data = (await res.json()) as LoginResponse;
        setUser(data.user);
        const { adminPagePermissions: _dropped, ...userForStorage } = data.user;
        localStorage.setItem(userStorageKey, JSON.stringify(userForStorage));
      })
      .catch(() => {
        // Ag sorunu varsa mevcut localStorage kullanicisini koru â€” sunucu cevap veremiyordur.
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isAdmin = user?.role === "ADMIN";
  const residentDoorNo =
    user?.role === "RESIDENT"
      ? ((user.apartmentDoorNo ?? "").trim() || "-")
      : "";

  useEffect(() => {
    const dropdownSelector = "details.filter-dropdown";

    const closeOtherFilterDropdowns = (active?: HTMLDetailsElement): void => {
      const detailsElements = Array.from(
        document.querySelectorAll<HTMLDetailsElement>(dropdownSelector)
      );

      for (const details of detailsElements) {
        if (details !== active) {
          details.open = false;
        }
      }
    };

    const onToggle = (event: Event): void => {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement)) {
        return;
      }

      if (!target.matches(dropdownSelector) || !target.open) {
        return;
      }

      closeOtherFilterDropdowns(target);
    };

    const onDocumentClick = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (target instanceof Element) {
        const clickedDropdown = target.closest(dropdownSelector);
        if (clickedDropdown) {
          return;
        }
      }

      closeOtherFilterDropdowns();
    };

    document.addEventListener("toggle", onToggle, true);
    document.addEventListener("click", onDocumentClick);

    return () => {
      document.removeEventListener("toggle", onToggle, true);
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  async function handleLogin(identifier: string, password: string): Promise<void> {
    setAuthLoading(true);
    setAuthMessage("Giris yapiliyor...");

    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ identifier, password }),
      });

      const errorPayload = (await res.clone().json().catch(() => null)) as { message?: string } | null;

      if (!res.ok) {
        if (res.status === 429) {
          setAuthMessage(errorPayload?.message ?? "Cok fazla deneme yaptiniz. Lutfen biraz bekleyip tekrar deneyin.");
          return;
        }

        if (res.status === 401) {
          setAuthMessage(errorPayload?.message ?? "Giris basarisiz. Telefon/e-posta veya sifreyi kontrol et.");
          return;
        }

        throw new Error(errorPayload?.message ?? `Login failed (${res.status})`);
      }

      const data = (await res.json()) as LoginResponse;
      setUser(data.user);
      // adminPagePermissions localStorage'a yazÄ±lmaz: backend her istekte zaten
      // DB'den kontrol eder; istemci tarafÄ±nda izin yapÄ±sÄ±nÄ± aÃ§Ä±ÄŸa Ã§Ä±karmaya gerek yok.
      const { adminPagePermissions: _dropped, ...userForStorage } = data.user;
      localStorage.setItem(userStorageKey, JSON.stringify(userForStorage));
      setAuthMessage(`Hos geldin ${data.user.fullName}`);
      navigate(data.user.role === "ADMIN" ? "/admin/reports" : "/resident");
    } catch (err) {
      console.error(err);
      setAuthMessage("Giris basarisiz. Telefon/e-posta veya sifreyi kontrol et.");
    } finally {
      setAuthLoading(false);
    }
  }

  function logout(): void {
    void fetch(`${apiBase}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {
      // best-effort logout request; local cleanup always continues
    });

    setUser(null);
    localStorage.removeItem(userStorageKey);
    setAuthMessage("Cikis yapildi");
    navigate("/");
  }

  function openCurrentScreenInNewTab(): void {
    const targetPath = `${location.pathname}${location.search}${location.hash}`;
    const width = Math.max(1100, window.screen.availWidth);
    const height = Math.max(760, window.screen.availHeight);
    const left = 0;
    const top = 0;

    const features = [
      "popup=yes",
      "noopener=yes",
      "noreferrer=yes",
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
    ].join(",");

    const opened = window.open(targetPath, "_blank", features);
    if (opened) {
      opened.focus();
      return;
    }

    // Fallback: if popup is blocked, continue with a normal new tab.
    window.open(targetPath, "_blank", "noopener,noreferrer");
  }

  const isStaffOpenAidatRoute = location.pathname === "/admin/reports/staff-open-aidat";
  const isStaffContactEditRoute = location.pathname === "/admin/reports/staff-contact-edit";
  const isMobileStaffRoute = isStaffOpenAidatRoute || isStaffContactEditRoute;

  return (
    <div className={`page${isMobileStaffRoute ? " page-mobile-staff-open-aidat" : ""}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="hero">
        <h1>
          ApartmanWeb MVP
          <span className="hero-title-suffix"> | Tahakkuk ve Ekstre Paneli</span>
        </h1>
        {user && (
          <div className="hero-actions">
            {user.role === "ADMIN" && (
              <NavLink className="btn btn-ghost" to="/admin/reports">
                Admin Panel
              </NavLink>
            )}
            <NavLink className="btn btn-ghost" to="/resident">
              Resident Panel
            </NavLink>
            {isAdmin && (
              <NavLink className="btn btn-ghost" to="/admin/guide/manual">
                Kullanim Kilavuzu
              </NavLink>
            )}
            <button className="btn btn-ghost hero-new-screen-btn" type="button" onClick={openCurrentScreenInNewTab}>
              Yeni Ekran Ac
            </button>
            <span className={user.role === "RESIDENT" ? "resident-user-line" : "small"}>
              {user.role === "RESIDENT" ? `Sn. ${user.fullName} + Daire No: ${residentDoorNo}` : user.fullName}
            </span>
            <button className="btn btn-danger" onClick={logout}>
              Cikis
            </button>
          </div>
        )}
      </header>

      <div className="app-shell">
        <main className="workspace">
          <Routes>
            <Route path="/" element={<Navigate to={user ? defaultAuthenticatedPath : "/login"} replace />} />
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to={defaultAuthenticatedPath} replace />
                ) : (
                  <LoginPage onLogin={handleLogin} loading={authLoading} message={authMessage} />
                )
              }
            />
            <Route
              path="/admin/*"
              element={user?.role === "ADMIN" ? <AdminPage user={user} onSessionExpired={logout} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/resident"
              element={
                user ? (
                  <ResidentPage
                    user={user}
                    onSessionExpired={logout}
                    onResidentDoorNo={(doorNo) => {
                      setUser((prev) => {
                        if (!prev || prev.role !== "RESIDENT" || prev.apartmentDoorNo === doorNo) {
                          return prev;
                        }
                        const nextUser = { ...prev, apartmentDoorNo: doorNo };
                        localStorage.setItem(userStorageKey, JSON.stringify(nextUser));
                        return nextUser;
                      });
                    }}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/no-access"
              element={
                user ? (
                  <div className="no-access-page">
                    <h2>Yetkisiz Erisim</h2>
                    <p>Hesabiniza atanmis erisilebilir bir sayfa bulunmuyor.</p>
                    <p>Lutfen yonetici ile iletisime gecin.</p>
                    <button className="btn btn-danger no-access-btn" onClick={logout}>Cikis Yap</button>
                  </div>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to={user ? defaultAuthenticatedPath : "/login"} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;

