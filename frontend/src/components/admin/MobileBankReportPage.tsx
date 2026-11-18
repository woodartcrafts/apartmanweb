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

function formatRate(rate: number): string {
  return `%${rate.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;
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

  const openDeposits = data?.deposits.filter((deposit) => !deposit.matured) ?? [];
  const maturedDeposits = data?.deposits.filter((deposit) => deposit.matured) ?? [];

  function renderDeposit(deposit: MobileBankReportResponse["deposits"][number]) {
    return (
      <div key={deposit.id} className={`mb-dep${deposit.matured ? " mb-dep-matured" : ""}`}>
        <div className="mb-dep-top">
          <div className="mb-dep-bank">
            {deposit.bankName}
            {deposit.branchName ? <span className="mb-dep-branch"> · {deposit.branchName}</span> : null}
          </div>
          <b className="mb-dep-amt">{formatTry(deposit.principalAmount)}</b>
        </div>
        <div className="mb-dep-line">
          <span>Faiz</span>
          <span>{formatRate(deposit.annualInterestRate)} yillik</span>
        </div>
        <div className="mb-dep-line">
          <span>Vade</span>
          <span>
            {formatDay(deposit.startDate)} – {formatDay(deposit.endDate)}
          </span>
        </div>
        <div className="mb-dep-line">
          <span>Kalan</span>
          <span className={deposit.matured ? "mb-late" : ""}>{deposit.matured ? "Vadesi doldu" : `${deposit.daysLeft} gun`}</span>
        </div>
        <div className="mb-dep-line">
          <span>Net faiz</span>
          <span>{formatTry(deposit.netInterest)}</span>
        </div>
        <div className="mb-dep-line mb-dep-line-strong">
          <span>Vade sonu net tutar</span>
          <span>{formatTry(deposit.netMaturityAmount)}</span>
        </div>
      </div>
    );
  }

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
            <span>Toplam (banka + vadeli anapara)</span>
            <b>{formatTry(data.totals.grandTotal)}</b>
          </div>

          <div className="mb-card">
            <span>Banka bakiyesi (vadesiz)</span>
            <b>{formatTry(data.bankBalance)}</b>
          </div>

          <div className="mb-section">
            <div className="mb-section-title">
              <span>Vadeli mevduat</span>
              <b>{formatTry(data.totals.depositPrincipal)}</b>
            </div>
            {openDeposits.length === 0 ? <div className="mm-empty">Vadesi devam eden vadeli mevduat yok</div> : null}
            {openDeposits.map(renderDeposit)}
            {openDeposits.length > 0 ? (
              <div className="mb-section-total">
                <span>Vade sonu net toplam</span>
                <b>{formatTry(data.totals.depositNetMaturity)}</b>
              </div>
            ) : null}
          </div>

          {maturedDeposits.length > 0 ? (
            <div className="mb-section mb-section-muted">
              <div className="mb-section-title">
                <span>Vadesi dolan kayitlar</span>
              </div>
              <div className="mb-note">Toplama dahil degildir; bankada kapanip vadesiz bakiyeye gecmis olabilir.</div>
              {maturedDeposits.map(renderDeposit)}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
