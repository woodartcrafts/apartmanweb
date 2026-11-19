import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTry, type LeftoverNote, type MobileLeftoverReportResponse } from "../../app/shared";

type MobileLeftoverPageProps = {
  request: <T>(endpoint: string, options?: { method?: "GET" | "POST"; payload?: unknown }) => Promise<T>;
};

type Filter = "HEPSI" | "EKSIK" | "FAZLA" | "ONAY";

// Sayfa acik oldukca veriyi bu aralikla kendiliginden yeniler.
const AUTO_REFRESH_MS = 60_000;

const KIND_LABEL: Record<LeftoverNote["kind"], string> = {
  EKSIK: "Az odendi",
  FAZLA: "Fazla odendi",
  ONAY: "Onay bekliyor",
  ILERI: "Onceden odendi",
};

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "HEPSI", label: "Hepsi" },
  { key: "EKSIK", label: "Az odenen" },
  { key: "FAZLA", label: "Fazla odenen" },
  { key: "ONAY", label: "Onay bekleyen" },
];

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

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function MobileLeftoverPage({ request }: MobileLeftoverPageProps) {
  const [data, setData] = useState<MobileLeftoverReportResponse | null>(null);
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
      const next = await requestRef.current<MobileLeftoverReportResponse>("/api/admin/reports/leftover-mobile");
      setData(next);
      setRefreshedAt(new Date());
      setError(null);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Kalan islemler alinamadi");
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

  const visibleApartments = useMemo(() => {
    if (!data) {
      return [];
    }
    return data.apartments
      .map((apartment) => ({
        apartment,
        notes: filter === "HEPSI" ? apartment.notes : apartment.notes.filter((note) => note.kind === filter),
      }))
      .filter((entry) => entry.notes.length > 0);
  }, [data, filter]);

  return (
    <section className="mm-page">
      <div className="mm-head">
        <div style={{ minWidth: 0 }}>
          <h3>Mobil Kalan Islemler</h3>
          <div className="mm-sub">
            {busy && !data
              ? "Yukleniyor..."
              : `Son veri tarihi: ${data ? formatDay(data.lastDataAt) : "-"}${
                  refreshedAt ? ` · Guncellendi ${formatClock(refreshedAt)}` : ""
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
              <span>Az odenen</span>
              <b>{formatTry(data.totals.eksik)}</b>
            </div>
            <div className="ml-card ml-card-fazla">
              <span>Fazla odenen</span>
              <b>{formatTry(data.totals.fazla)}</b>
            </div>
          </div>
          {data.totals.onay > 0 || data.totals.ileri > 0 ? (
            <div className="ml-extra">
              {data.totals.onay > 0 ? <span>Onay bekleyen: <b>{formatTry(data.totals.onay)}</b></span> : null}
              {data.totals.ileri > 0 ? <span>Vadesi gelmemis kalan: <b>{formatTry(data.totals.ileri)}</b></span> : null}
            </div>
          ) : null}

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

          {visibleApartments.length === 0 ? <div className="mm-sub">Gosterilecek kalan islem yok.</div> : null}

          {visibleApartments.map(({ apartment, notes }) => (
            <div key={apartment.doorNo} className="mm-apt">
              <div className="mm-apt-head">
                <div className="mm-no">{apartment.doorNo}</div>
                <div className="mm-name">
                  <div className="mm-name-main">{apartment.name || `Daire ${apartment.doorNo}`}</div>
                </div>
              </div>
              <div className="mm-items">
                {notes.map((note) => (
                  <div key={note.id} className={`ml-note ml-note-${note.kind.toLowerCase()}`}>
                    <div className="ml-note-top">
                      <span className="ml-badge">{KIND_LABEL[note.kind]}</span>
                      <span className="ml-date">{formatDay(note.date)}</span>
                      <b className="ml-amount">{formatTry(note.amount)}</b>
                    </div>
                    <div className="ml-text">{note.text}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      ) : null}
    </section>
  );
}
