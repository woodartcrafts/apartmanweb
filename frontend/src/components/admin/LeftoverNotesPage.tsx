import { useCallback, useEffect, useState } from "react";
import { formatTry, type LeftoverNote, type LeftoverNotesResponse } from "../../app/shared";

type LeftoverNotesPageProps = {
  request: <T>(endpoint: string, options?: { method?: "GET" | "POST"; payload?: unknown }) => Promise<T>;
};

const KIND_LABEL: Record<LeftoverNote["kind"], string> = {
  EKSIK: "Eksik kaldi",
  FAZLA: "Fazla geldi",
  ONAY: "Onay bekliyor",
  ILERI: "Onceden odendi",
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

export function LeftoverNotesPage({ request }: LeftoverNotesPageProps) {
  const [days, setDays] = useState("60");
  const [data, setData] = useState<LeftoverNotesResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (selectedDays: string) => {
      setBusy(true);
      setError(null);
      try {
        setData(await request<LeftoverNotesResponse>(`/api/admin/reports/leftover-notes?days=${encodeURIComponent(selectedDays)}`));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Notlar alinamadi");
      } finally {
        setBusy(false);
      }
    },
    [request]
  );

  useEffect(() => {
    void load(days);
    // request kimligi her render'da degisebilir; secim degisince yeniden yuklenir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <section className="ln-page">
      <div className="ln-head">
        <div style={{ minWidth: 0 }}>
          <h3>Kalan Islemler Notlari</h3>
          <div className="ln-sub">
            Eksik kalan, fazla gelen ve onay bekleyen odemeler. Son veri tarihi: {data ? formatDay(data.lastDataAt) : "-"}
          </div>
        </div>
        <div className="ln-actions">
          <select value={days} onChange={(event) => setDays(event.target.value)} disabled={busy}>
            <option value="30">Son 30 gun</option>
            <option value="60">Son 60 gun</option>
            <option value="180">Son 180 gun</option>
            <option value="all">Tumu</option>
          </select>
          <button className="btn" type="button" onClick={() => void load(days)} disabled={busy}>
            {busy ? "..." : "Yenile"}
          </button>
        </div>
      </div>

      {error ? <div className="ln-error">{error}</div> : null}

      {data ? (
        <>
          <div className="ln-summary">
            <span>Toplam eksik: <b>{formatTry(data.totals.eksik)}</b></span>
            <span>Toplam fazla: <b>{formatTry(data.totals.fazla)}</b></span>
            <span>Onay bekleyen: <b>{formatTry(data.totals.onay)}</b></span>
            <span>Vadesi gelmemis kalan: <b>{formatTry(data.totals.ileri)}</b></span>
          </div>

          {data.notes.length === 0 ? <div className="ln-empty">Bu aralikta kalan islem yok.</div> : null}

          {data.notes.map((note) => (
            <div key={note.id} className={`ln-note ln-note-${note.kind.toLowerCase()}`}>
              <div className="ln-note-top">
                <span className="ln-badge">{KIND_LABEL[note.kind]}</span>
                <span className="ln-date">{formatDay(note.date)}</span>
                <b className="ln-amount">{formatTry(note.amount)}</b>
              </div>
              <div className="ln-text">{note.text}</div>
            </div>
          ))}
        </>
      ) : null}
    </section>
  );
}
