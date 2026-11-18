import { useCallback, useEffect, useState } from "react";
import { formatTry, type MobileMatrixChargeKind, type MobileMatrixReportResponse } from "../../app/shared";

type MobileMatrixReportPageProps = {
  request: <T>(endpoint: string, options?: { method?: "GET" | "POST"; payload?: unknown }) => Promise<T>;
};

const MONTH_NAMES = [
  "Ocak",
  "Subat",
  "Mart",
  "Nisan",
  "Mayis",
  "Haziran",
  "Temmuz",
  "Agustos",
  "Eylul",
  "Ekim",
  "Kasim",
  "Aralik",
];

const KIND_LABEL: Record<MobileMatrixChargeKind, string> = {
  AIDAT: "Aidat",
  DOGALGAZ: "Dogalgaz",
  TADILAT: "Tadilat",
  DIGER: "Diger",
};

const KIND_CLASS: Record<MobileMatrixChargeKind, string> = {
  AIDAT: "mm-tag-aidat",
  DOGALGAZ: "mm-tag-gaz",
  TADILAT: "mm-tag-tadilat",
  DIGER: "mm-tag-diger",
};

function formatSnapshot(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function MobileMatrixReportPage({ request }: MobileMatrixReportPageProps) {
  const [data, setData] = useState<MobileMatrixReportResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await request<MobileMatrixReportResponse>("/api/admin/reports/apartment-balance-matrix-mobile");
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rapor alinamadi");
    } finally {
      setBusy(false);
    }
  }, [request]);

  useEffect(() => {
    void load();
    // Sayfa acildiginda bir kez yuklenir; request kimligi her render'da degisebilir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mm-page">
      <div className="mm-head">
        <div>
          <h3>Mobil Matrix Raporu</h3>
          <div className="mm-sub">{data ? `Guncelleme: ${formatSnapshot(data.snapshotAt)}` : "Yukleniyor..."}</div>
        </div>
        <button className="btn" type="button" onClick={() => void load()} disabled={busy}>
          {busy ? "..." : "Yenile"}
        </button>
      </div>

      {error ? <div className="mm-error">{error}</div> : null}

      {data ? (
        <>
          <div className="mm-total">
            <span>Toplam geciken</span>
            <b>{formatTry(data.totals.overdueTotal)}</b>
          </div>

          {data.rows.map((row) => {
            const hasDebt = row.overdueTotal > 0.005;
            return (
              <div key={row.apartmentId} className={`mm-apt${hasDebt ? " mm-apt-bad" : ""}`}>
                <div className="mm-apt-head">
                  <div className="mm-no">{row.apartmentDoorNo}</div>
                  <div className="mm-name">
                    <div className="mm-name-main">{row.occupant}</div>
                    <div className="mm-name-sub">{row.blockName}</div>
                  </div>
                  {hasDebt ? (
                    <div className="mm-amount">{formatTry(row.overdueTotal)}</div>
                  ) : (
                    <div className="mm-amount mm-amount-ok">Borc yok</div>
                  )}
                </div>
                {hasDebt ? (
                  <div className="mm-items">
                    {row.items.map((item, index) => (
                      <div key={`${item.periodYear}-${item.periodMonth}-${item.kind}-${index}`} className="mm-item">
                        <span className="mm-month">
                          {MONTH_NAMES[item.periodMonth - 1] ?? item.periodMonth} {item.periodYear}
                        </span>
                        <span className={`mm-tag ${KIND_CLASS[item.kind]}`}>
                          {item.kind === "DIGER" ? item.chargeTypeName : KIND_LABEL[item.kind]}
                        </span>
                        <span className="mm-item-amount">{formatTry(item.remaining)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </>
      ) : null}
    </section>
  );
}
