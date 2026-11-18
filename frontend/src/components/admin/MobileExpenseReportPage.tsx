import { useCallback, useEffect, useMemo, useState } from "react";
import { dateInputToIso, formatTry, type ExpenseReportRow } from "../../app/shared";

type MobileExpenseReportPageProps = {
  request: <T>(
    endpoint: string,
    options?: { method?: "GET" | "POST"; payload?: unknown; onResponse?: (response: Response) => void }
  ) => Promise<T>;
};

type PeriodKey = "MONTH" | "QUARTER" | "YEAR" | "ALL";

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "MONTH", label: "Bu ay" },
  { key: "QUARTER", label: "Son 3 ay" },
  { key: "YEAR", label: "Bu yil" },
  { key: "ALL", label: "Tumu" },
];

const METHOD_LABEL: Record<string, string> = {
  CASH: "Nakit",
  BANK_TRANSFER: "Banka",
  CREDIT_CARD: "Kredi karti",
  OTHER: "Diger",
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function periodFrom(key: PeriodKey): string | null {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (key === "MONTH") {
    return dateInputToIso(`${year}-${pad2(month + 1)}-01`);
  }
  if (key === "QUARTER") {
    const start = new Date(year, month - 2, 1);
    return dateInputToIso(`${start.getFullYear()}-${pad2(start.getMonth() + 1)}-01`);
  }
  if (key === "YEAR") {
    return dateInputToIso(`${year}-01-01`);
  }
  return null;
}

function formatDay(iso: string): string {
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

export function MobileExpenseReportPage({ request }: MobileExpenseReportPageProps) {
  const [period, setPeriod] = useState<PeriodKey>("YEAR");
  const [rows, setRows] = useState<ExpenseReportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);

  const load = useCallback(
    async (key: PeriodKey) => {
      setBusy(true);
      setError(null);
      setTruncated(false);
      try {
        const params = new URLSearchParams();
        const from = periodFrom(key);
        if (from) {
          params.set("from", from);
        }
        params.set("includeDistributed", "false");
        let cut = false;
        const data = await request<ExpenseReportRow[]>(`/api/admin/expenses/mobile-report?${params.toString()}`, {
          onResponse: (response) => {
            cut = response.headers.get("X-Result-Truncated") === "true";
          },
        });
        setRows(data);
        setTruncated(cut);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gider raporu alinamadi");
      } finally {
        setBusy(false);
      }
    },
    [request]
  );

  useEffect(() => {
    setOpenItem(null);
    void load(period);
    // request kimligi her render'da degisebilir; donem degisince yuklenir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const byItem = useMemo(() => {
    const map = new Map<string, { id: string; name: string; total: number; rows: ExpenseReportRow[] }>();
    for (const row of rows) {
      const entry = map.get(row.expenseItemId) ?? { id: row.expenseItemId, name: row.expenseItemName, total: 0, rows: [] };
      entry.total += row.amount;
      entry.rows.push(row);
      map.set(row.expenseItemId, entry);
    }
    for (const entry of map.values()) {
      // Tarih sirasi: en yeni ustte
      entry.rows.sort((a, b) => new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime());
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [rows]);

  const grandTotal = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows]);
  const maxItemTotal = byItem[0]?.total ?? 0;
  const lastDate = rows.reduce<string | null>(
    (latest, row) => (latest === null || new Date(row.spentAt) > new Date(latest) ? row.spentAt : latest),
    null
  );

  return (
    <section className="me-page">
      <div className="me-head">
        <div>
          <h3>Mobil Gider Raporu</h3>
          <div className="me-sub">{lastDate ? `Son gider tarihi: ${formatDay(lastDate)}` : busy ? "Yukleniyor..." : ""}</div>
        </div>
        <button className="btn" type="button" onClick={() => void load(period)} disabled={busy}>
          {busy ? "..." : "Yenile"}
        </button>
      </div>

      <div className="me-chips">
        {PERIODS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`me-chip${period === item.key ? " me-chip-on" : ""}`}
            onClick={() => setPeriod(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <div className="me-error">{error}</div> : null}
      {truncated ? (
        <div className="me-warn">Kayit sayisi limite takildi, liste eksik olabilir. Daha kisa bir donem secin.</div>
      ) : null}

      <div className="me-total">
        <span>Toplam gider</span>
        <b>{formatTry(grandTotal)}</b>
      </div>

      {!busy && rows.length === 0 && !error ? <div className="me-empty">Bu donemde gider kaydi yok.</div> : null}

      {byItem.length > 0 ? (
        <div className="me-card">
          <div className="me-card-title">Gider kalemleri</div>
          {byItem.map((item) => {
            const open = openItem === item.id;
            return (
              <div key={item.id} className="me-item-wrap">
                <button
                  type="button"
                  className={`me-item${open ? " me-item-on" : ""}`}
                  onClick={() => setOpenItem(open ? null : item.id)}
                  aria-expanded={open}
                >
                  <div className="me-item-top">
                    <span className="me-item-name">{item.name}</span>
                    <span className="me-item-amt">{formatTry(item.total)}</span>
                  </div>
                  <div className="me-bar">
                    <div
                      className="me-bar-fill"
                      style={{ width: `${maxItemTotal > 0 ? Math.max(3, (item.total / maxItemTotal) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="me-item-count">
                    {item.rows.length} kayit <span className="me-item-chev">{open ? "▲" : "▼"}</span>
                  </div>
                </button>
                {open ? (
                  <div className="me-details">
                    {item.rows.map((row) => (
                      <div key={row.id} className="me-row">
                        <div className="me-row-top">
                          <span className="me-row-date">{formatDay(row.spentAt)}</span>
                          <span className="me-row-amt">{formatTry(row.amount)}</span>
                        </div>
                        <div className="me-method">{METHOD_LABEL[row.paymentMethod] ?? row.paymentMethod}</div>
                        {row.description ? <div className="me-row-desc">{row.description}</div> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
