import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTry, type DifferenceItem, type DifferenceReportResponse } from "../../app/shared";

type MobileLeftoverPageProps = {
  request: <T>(endpoint: string, options?: { method?: "GET" | "POST"; payload?: unknown }) => Promise<T>;
};

type Filter = "HEPSI" | "EKSIK" | "FAZLA" | "ONAY";

// Sayfa acik oldukca veriyi bu aralikla kendiliginden yeniler.
const AUTO_REFRESH_MS = 60_000;

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "HEPSI", label: "Hepsi" },
  { key: "EKSIK", label: "Eksik" },
  { key: "FAZLA", label: "Fazla" },
  { key: "ONAY", label: "Onay bekleyen" },
];

function formatDay(iso: string | null, withYear = true): string {
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
    ...(withYear ? { year: "numeric" as const } : {}),
  }).format(date);
}

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

// Kart ustundeki "Daire 12 - " on eki zaten daire basliginda yazili; tekrarini gizler.
function stripDoorPrefix(text: string): string {
  return text.replace(/^Daire \S+ - /, "");
}

function isOriginRow(item: DifferenceItem, row: DifferenceItem["timeline"][number]): boolean {
  return row.kind === "PAYMENT" && row.date === item.origin.date && Math.abs(row.amount - item.origin.paid) < 0.005;
}

export function MobileLeftoverPage({ request }: MobileLeftoverPageProps) {
  const [data, setData] = useState<DifferenceReportResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("HEPSI");
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const requestRef = useRef(request);
  requestRef.current = request;
  const loadingRef = useRef(false);

  // silent=true: otomatik yenilemede ekran "Yukleniyor" diye titremez, eski veri yerinde kalir.
  const load = useCallback(async (silent: boolean) => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    if (!silent) {
      setBusy(true);
    }
    try {
      const next = await requestRef.current<DifferenceReportResponse>("/api/admin/reports/leftover-mobile/differences");
      setData(next);
      setRefreshedAt(new Date());
      setError(null);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Kalan işlemler alınamadı");
      }
    } finally {
      loadingRef.current = false;
      if (!silent) {
        setBusy(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(false);

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    }, AUTO_REFRESH_MS);

    // Telefonda uygulamaya geri donulunce hemen guncelle.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const visibleDifferences = useMemo(() => {
    if (!data || filter === "ONAY") {
      return [];
    }
    return filter === "HEPSI" ? data.differences : data.differences.filter((item) => item.kind === filter);
  }, [data, filter]);

  const showPending = filter === "HEPSI" || filter === "ONAY";

  return (
    <section className="mm-page">
      <div className="mm-head">
        <div style={{ minWidth: 0 }}>
          <h3>Mobil Kalan İşlemler</h3>
          <div className="mm-sub">
            {busy && !data
              ? "Yükleniyor..."
              : `Son veri tarihi: ${data ? formatDay(data.lastDataAt) : "-"}${
                  refreshedAt ? ` · Güncellendi ${formatClock(refreshedAt)}` : ""
                }`}
          </div>
        </div>
        <div className="mm-actions">
          <button className="btn" type="button" onClick={() => void load(false)} disabled={busy}>
            {busy ? "..." : "Yenile"}
          </button>
        </div>
      </div>

      {error ? <div className="mm-error">{error}</div> : null}

      {data ? (
        <>
          <div className="ml-cards">
            <div className="ml-card ml-card-eksik">
              <span>Toplam eksik</span>
              <b>{formatTry(data.totals.eksik)}</b>
              <small>Gelmesi gerekirken gelmeyen</small>
            </div>
            <div className="ml-card ml-card-fazla">
              <span>Toplam fazla</span>
              <b>{formatTry(data.totals.fazla)}</b>
              <small>Gerekenden fazla gelen</small>
            </div>
          </div>

          <details className="ml-help">
            <summary>Bu sayfa nasıl okunur?</summary>
            <ul>
              <li>
                <b>Sadece farkı olan daireler görünür.</b> Fark = şu ana kadar ödenmesi gereken ile gelen ödeme arasındaki
                fark. Vadesi gelmemiş borçlar sayılmaz.
              </li>
              <li>
                <b>Eksik:</b> gelmesi gereken para gelmemiş. <b>Fazla:</b> gerekenden fazla gelmiş, bir sonraki borca
                düşer.
              </li>
              <li>
                <b>Kaynak:</b> her kartın altında farkın <b>ilk hangi ödemede</b> doğduğu yazar. "Ay ay geçmiş"e dokunursan
                borç ve ödemeleri sırayla görürsün, kaynak ödeme işaretlidir.
              </li>
              <li>
                <b>Onay bekleyen:</b> ödeme geldi ama hangi borca ait olduğu belli değil, senin onayını bekliyor.
              </li>
            </ul>
          </details>

          <div className="ml-filters">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`ml-filter${filter === item.key ? " ml-filter-on" : ""}`}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {visibleDifferences.length === 0 && !(showPending && data.pendingApprovals.length > 0) ? (
            <div className="mm-sub">Gösterilecek kalan işlem yok.</div>
          ) : null}

          {visibleDifferences.map((item) => (
            <div key={item.doorNo} className={`mm-apt ml-diff ml-diff-${item.kind.toLowerCase()}`}>
              <div className="mm-apt-head">
                <div className="mm-no">{item.doorNo}</div>
                <div className="mm-name">
                  <div className="mm-name-main">{item.name || `Daire ${item.doorNo}`}</div>
                </div>
                <div className={`ml-diff-amount ml-diff-amount-${item.kind.toLowerCase()}`}>
                  {formatTry(Math.abs(item.diff))}
                  <small>{item.kind === "EKSIK" ? "eksik" : "fazla"}</small>
                </div>
              </div>
              <div className="ml-text">{item.summary}</div>
              <details className="ml-timeline">
                <summary>Ay ay geçmiş</summary>
                <div className="ml-tl-head">
                  <span>Tarih</span>
                  <span>Ne oldu</span>
                  <span>Tutar</span>
                  <span>Durum</span>
                </div>
                {item.timeline.map((row, index) => (
                  <div
                    key={`${row.date}-${index}`}
                    className={`ml-tl-row${isOriginRow(item, row) ? " ml-tl-origin" : ""}`}
                  >
                    <span>{formatDay(row.date, false)}</span>
                    <span className="ml-tl-label">
                      {row.kind === "PAYMENT" ? "Ödeme: " : "Borç: "}
                      {row.label}
                      {isOriginRow(item, row) ? " ← kaynak" : ""}
                    </span>
                    <span className={row.amount >= 0 ? "mm-good" : "mm-bad"}>{formatTry(row.amount)}</span>
                    <span className={row.balance >= 0 ? "mm-good" : "mm-bad"}>{formatTry(row.balance)}</span>
                  </div>
                ))}
              </details>
            </div>
          ))}

          {showPending && data.pendingApprovals.length > 0 ? (
            <>
              <div className="ml-section-title">Onayını bekleyen ödemeler ({formatTry(data.totals.onay)})</div>
              {data.pendingApprovals.map((note) => (
                <div key={note.id} className="mm-apt ml-note ml-note-onay">
                  <div className="ml-note-top">
                    <span className="ml-badge">Daire {note.doorNo}</span>
                    <span className="ml-date">{formatDay(note.date)}</span>
                    <b className="ml-amount">{formatTry(note.amount)}</b>
                  </div>
                  <div className="ml-text">{stripDoorPrefix(note.text)}</div>
                  {note.hint ? <div className="ml-hint">{note.hint}</div> : null}
                </div>
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
