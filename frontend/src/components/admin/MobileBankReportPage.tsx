import { useCallback, useEffect, useState } from "react";
import { formatTry, type MobileBankReportResponse } from "../../app/shared";

type MobileBankReportPageProps = {
  request: <T>(endpoint: string, options?: { method?: "GET" | "POST"; payload?: unknown }) => Promise<T>;
};

function formatDay(iso: string | null): string {
  if (!iso) {
    return "-";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function MobileBankReportPage({ request }: MobileBankReportPageProps) {
  const [data, setData] = useState<MobileBankReportResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await request<MobileBankReportResponse>("/api/admin/reports/bank-balance-mobile"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Banka raporu alinamadi");
    } finally {
      setBusy(false);
    }
  }, [request]);

  useEffect(() => {
    void load();
    // request kimligi her render'da degisebilir; sayfa acilinca bir kez yuklenir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mm-page">
      <div className="mm-head">
        <div style={{ minWidth: 0 }}>
          <h3>Mobil Banka Raporu</h3>
          <div className="mm-sub">{data ? `Son veri tarihi: ${formatDay(data.lastDataAt)}` : busy ? "Yukleniyor..." : ""}</div>
        </div>
        <div className="mm-actions">
          <button className="btn" type="button" onClick={() => void load()} disabled={busy}>
            {busy ? "..." : "Yenile"}
          </button>
        </div>
      </div>

      {error ? <div className="mm-error">{error}</div> : null}

      {data ? (
        <>
          <div className="mb-card mb-card-total">
            <span>Toplam (banka + vadeli)</span>
            <b>{formatTry(data.totals.grandTotal)}</b>
          </div>

          <div className="mb-card">
            <span>Banka bakiyesi (vadesiz)</span>
            <b>{formatTry(data.bankBalance)}</b>
          </div>

          <div className="mb-card">
            <span>Vadeli mevduat</span>
            <b>{formatTry(data.totals.depositPrincipal)}</b>
          </div>
        </>
      ) : null}
    </section>
  );
}
