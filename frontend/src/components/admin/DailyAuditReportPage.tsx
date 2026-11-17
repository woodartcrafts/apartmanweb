import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatDateTr,
  formatTry,
  type DailyAuditPaymentLine,
  type DailyAuditReportsResponse,
} from "../../app/shared";

type DailyAuditReportPageProps = {
  request: <T>(endpoint: string, options?: { method?: "GET" | "POST"; payload?: unknown }) => Promise<T>;
};

const REPORT_TIME_ZONE = "Europe/Istanbul";

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: REPORT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDayKey(dayKey: string): string {
  const [year, month, day] = dayKey.split("-");
  return `${day}.${month}.${year}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function PaymentLineTable({ lines, emptyText }: { lines: DailyAuditPaymentLine[]; emptyText: string }) {
  return (
    <div className="table-wrap compact-row-top-gap">
      <table className="apartment-list-table report-compact-table">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Daire</th>
            <th className="col-num">Tutar</th>
            <th>Banka aciklamasi</th>
            <th>Sebep</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={5} className="empty">
                {emptyText}
              </td>
            </tr>
          ) : (
            lines.map((line, index) => (
              <tr key={`${line.paidAt}-${line.doorLabel}-${index}`}>
                <td>{formatDateTr(line.paidAt)}</td>
                <td>{line.doorLabel}</td>
                <td className="col-num">{formatTry(line.amount)}</td>
                <td>{line.description || "-"}</td>
                <td>{line.reason}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function DailyAuditReportPage({ request }: DailyAuditReportPageProps) {
  const [data, setData] = useState<DailyAuditReportsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await request<DailyAuditReportsResponse>("/api/admin/payment-audit/daily-reports");
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rapor listesi alinamadi");
    } finally {
      setBusy(false);
    }
  }, [request]);

  useEffect(() => {
    void load();
    // Sayfa her acildiginda bir kez yuklenir; request kimligi her render'da degisebilir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runNow(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await request<{ dayKey: string }>("/api/admin/payment-audit/daily-reports/run", {
        method: "POST",
        payload: {},
      });
      setSelectedDayKey(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rapor olusturulamadi");
      setBusy(false);
    }
  }

  const reports = useMemo(() => data?.reports ?? [], [data]);
  const selected = useMemo(
    () => reports.find((row) => row.dayKey === selectedDayKey) ?? reports[0] ?? null,
    [reports, selectedDayKey]
  );
  const report = selected?.report ?? null;
  const actionableFindings = useMemo(
    () => (report?.audit.findings ?? []).filter((finding) => finding.severity !== "INFO"),
    [report]
  );

  const scheduleLabel = data ? `${pad2(data.scheduleHour)}:${pad2(data.scheduleMinute)}` : "12:00";

  return (
    <section className="dashboard report-page">
      <div className="card table-card report-page-card">
        <div className="section-head report-toolbar">
          <h3>Gunluk Denetim Raporu</h3>
          <div className="admin-row">
            <button className="btn" type="button" onClick={() => void load()} disabled={busy}>
              Yenile
            </button>
            <button className="btn btn-primary btn-run" type="button" onClick={() => void runNow()} disabled={busy}>
              {busy ? "Calisiyor..." : "Bugunun raporunu simdi olustur"}
            </button>
          </div>
        </div>

        <p className="small">
          Her gun saat {scheduleLabel} Gmail senkronundan sonra sistem kendini kontrol eder ve sonucu buraya yazar.
          Rapor yalnizca okur, hicbir odeme ya da borc kaydini degistirmez. Isaretleme ve duzeltme icin{" "}
          <Link to="/admin/apartment-credits">Fazla Odeme ve Daire Alacaklari</Link> sayfasini kullanin.
        </p>

        {error ? (
          <p className="small text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {data?.overdue ? (
          <p className="small text-danger" role="alert">
            DIKKAT: Bugunun raporu henuz olusmadi (planlanan saat {scheduleLabel}). Zamanlayici calismamis olabilir:
            Railway'de apartmanweb servisini kontrol edin ya da yukaridan "simdi olustur"a basin.
          </p>
        ) : null}

        {data && !data.autoEnabled ? (
          <p className="small text-danger" role="alert">
            Otomatik Gmail senkronu kapali, bu yuzden rapor kendiliginden olusmaz. Yalnizca elle olusturabilirsiniz.
          </p>
        ) : null}

        {!data ? (
          <p className="small">{busy ? "Yukleniyor..." : "Rapor alinamadi."}</p>
        ) : reports.length === 0 ? (
          <p className="small">Henuz kayitli rapor yok. Ilk rapor bir sonraki {scheduleLabel} senkronunda olusur.</p>
        ) : (
          <div className="admin-row compact-row-top-gap" style={{ alignItems: "flex-start", gap: "1.5rem" }}>
            <div style={{ minWidth: "13rem" }}>
              <h4>Gunler</h4>
              <ul className="small" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {reports.map((row) => {
                  const isSelected = row.dayKey === (selected?.dayKey ?? "");
                  return (
                    <li key={row.dayKey}>
                      <button
                        type="button"
                        className={isSelected ? "btn btn-primary" : "btn btn-ghost"}
                        style={{ width: "100%", textAlign: "left" }}
                        onClick={() => setSelectedDayKey(row.dayKey)}
                      >
                        {formatDayKey(row.dayKey)} {" - "}
                        <span className={row.attentionCount > 0 && !isSelected ? "text-danger" : undefined}>
                          {row.attentionCount > 0 ? `${row.attentionCount} konu` : "temiz"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {selected && report ? (
              <div style={{ flex: 1, minWidth: "20rem" }}>
                <h4>
                  {formatDayKey(selected.dayKey)}
                  <span className="small"> (son hesaplama {formatTime(selected.updatedAt)})</span>
                </h4>

                <p className={selected.attentionCount > 0 ? "text-danger" : undefined} role="status">
                  <strong>
                    {selected.attentionCount > 0
                      ? `Bakilmasi gereken ${selected.attentionCount} konu var.`
                      : "Bakilmasi gereken bir sey yok."}
                  </strong>
                </p>

                <h4 className="compact-row-top-gap">Gmail senkronu</h4>
                {report.sync ? (
                  report.sync.failureNote ? (
                    <p className="small text-danger" role="alert">
                      Senkron SORUNLU: {report.sync.failureNote}
                    </p>
                  ) : (
                    <p className="small">
                      {report.sync.importedPaymentCount} yeni odeme, {report.sync.importedExpenseCount} gider islendi (
                      {report.sync.importedBatchCount} dosya, {report.sync.skippedRowCount} satir atlandi). Hata yok.
                    </p>
                  )
                ) : (
                  <p className="small">Bu raporda senkron sonucu yok (rapor elle olusturulmus).</p>
                )}

                <h4 className="compact-row-top-gap">
                  Bakilmasi gereken kayitlar <span className="small">({actionableFindings.length})</span>
                </h4>
                {actionableFindings.length === 0 ? (
                  <p className="small">Bulgu yok.</p>
                ) : (
                  <ul className="small">
                    {actionableFindings.map((finding, index) => (
                      <li
                        key={`${finding.code}-${finding.paymentId ?? finding.chargeId ?? index}`}
                        className={finding.severity === "HIGH" ? "text-danger" : undefined}
                      >
                        {finding.severity === "HIGH" ? "[Onemli] " : "[Orta] "}
                        {finding.message}
                      </li>
                    ))}
                  </ul>
                )}

                <h4 className="compact-row-top-gap">
                  Onay bekleyen odemeler <span className="small">({report.awaiting.length})</span>
                </h4>
                <p className="small">Hicbir borca yazilmadi; sizin onayinizi bekliyor.</p>
                <PaymentLineTable lines={report.awaiting} emptyText="Onay bekleyen odeme yok" />

                <h4 className="compact-row-top-gap">
                  Ortada kalan alacaklar{" "}
                  <span className="small">
                    ({report.pending.count} odeme, toplam {formatTry(report.pending.total)})
                  </span>
                </h4>
                <p className="small">
                  Borca yazilmamis tutarlar; yeni tahakkukta otomatik uygulanir ya da elle yazilir.
                </p>
                <PaymentLineTable lines={report.pending.lines} emptyText="Ortada kalan alacak yok" />
                {report.pending.count > report.pending.lines.length ? (
                  <p className="small">
                    Listede ilk {report.pending.lines.length} kayit gosteriliyor; tamami Fazla Odeme ve Daire Alacaklari
                    sayfasinda.
                  </p>
                ) : null}

                <p className="small compact-row-top-gap">
                  Taranan odeme: son {report.audit.windowDays} gun, {report.audit.scannedPaymentCount} kayit.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
