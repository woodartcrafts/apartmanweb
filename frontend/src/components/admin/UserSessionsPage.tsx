import { useCallback, useEffect, useState } from "react";
import { apiBase, formatDateTimeTr, type LoginLogRow } from "../../app/shared";

const PAGE_SIZE = 100;

function failReasonLabel(reason: string | null): string {
  if (!reason) return "-";
  if (reason === "USER_NOT_FOUND") return "Kullanici Bulunamadi";
  if (reason === "WRONG_PASSWORD") return "Yanlis Sifre";
  return reason;
}

export function UserSessionsPage() {
  const [rows, setRows] = useState<LoginLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [successFilter, setSuccessFilter] = useState<"" | "true" | "false">("");
  const [userSearch, setUserSearch] = useState("");
  const [offset, setOffset] = useState(0);

  const fetchLogs = useCallback(
    async (currentOffset: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(currentOffset));
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
        if (successFilter !== "") params.set("success", successFilter);
        const res = await fetch(`${apiBase}/api/admin/login-logs?${params.toString()}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}) as unknown)) as { message?: string };
          throw new Error(body.message ?? "Kayitlar alinamadi");
        }
        const data = (await res.json()) as { rows: LoginLogRow[]; total: number };
        setRows(data.rows);
        setTotal(data.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Bir hata olustu");
      } finally {
        setLoading(false);
      }
    },
    [fromDate, toDate, successFilter]
  );

  useEffect(() => {
    setOffset(0);
    fetchLogs(0);
  }, [fetchLogs]);

  function handleSearch() {
    setOffset(0);
    fetchLogs(0);
  }

  function handlePrev() {
    const newOffset = Math.max(0, offset - PAGE_SIZE);
    setOffset(newOffset);
    fetchLogs(newOffset);
  }

  function handleNext() {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    fetchLogs(newOffset);
  }

  const filteredRows = userSearch.trim()
    ? rows.filter((r) => {
        const q = userSearch.trim().toLocaleLowerCase("tr");
        return (
          (r.userFullName ?? "").toLocaleLowerCase("tr").includes(q) ||
          (r.identifier ?? "").toLocaleLowerCase("tr").includes(q) ||
          (r.ipAddress ?? "").includes(q)
        );
      })
    : rows;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <section className="dashboard user-sessions-page">
      <div className="section-head">
        <h2>Kullanici Oturumlari</h2>
        <p className="muted-text">
          Sisteme giris denemeleri ve basarili girislerin kaydini goruntuler.
          Toplam: <strong>{total}</strong>
        </p>
      </div>

      <div className="sessions-filter-row">
        <label>
          Baslangic
          <input
            type="date"
            className="form-control"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>
        <label>
          Bitis
          <input
            type="date"
            className="form-control"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </label>
        <label>
          Sonuc
          <select
            className="form-control"
            value={successFilter}
            onChange={(e) => setSuccessFilter(e.target.value as "" | "true" | "false")}
          >
            <option value="">Tamami</option>
            <option value="true">Basarili</option>
            <option value="false">Basarisiz</option>
          </select>
        </label>
        <label>
          Kullanici / IP Ara
          <input
            type="text"
            className="form-control"
            placeholder="Ad, e-posta, telefon veya IP"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
        </label>
        <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
          {loading ? "Yukleniyor..." : "Filtrele"}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="sessions-table-wrap">
        <table className="data-table sessions-table">
          <thead>
            <tr>
              <th>Tarih / Saat</th>
              <th>Kullanici Adi</th>
              <th>Rol</th>
              <th>Giris Bilgisi</th>
              <th>IP Adresi</th>
              <th>Sonuc</th>
              <th>Hata Sebebi</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="col-empty">
                  Kayit bulunamadi.
                </td>
              </tr>
            )}
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td className="col-datetime">{formatDateTimeTr(row.createdAt)}</td>
                <td>{row.userFullName ?? <span className="sessions-result-dash">-</span>}</td>
                <td>{row.userRole ?? "-"}</td>
                <td className="col-mono">{row.identifier ?? "-"}</td>
                <td className="col-mono">{row.ipAddress ?? "-"}</td>
                <td>
                  {row.success ? (
                    <span className="sessions-result-ok">&#10003; Basarili</span>
                  ) : (
                    <span className="sessions-result-fail">&#10007; Basarisiz</span>
                  )}
                </td>
                <td>{failReasonLabel(row.failReason)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="sessions-pagination">
          <button className="btn btn-ghost" onClick={handlePrev} disabled={offset === 0 || loading}>
            &laquo; Onceki
          </button>
          <span>
            Sayfa {currentPage} / {totalPages}
          </span>
          <button
            className="btn btn-ghost"
            onClick={handleNext}
            disabled={offset + PAGE_SIZE >= total || loading}
          >
            Sonraki &raquo;
          </button>
        </div>
      )}
    </section>
  );
}
