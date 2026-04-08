import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import {
  formatDateTimeTr,
  formatDateTr,
  formatTry,
  type ApartmentOption,
  type StaffOpenAidatReportResponse,
  type StaffOpenAidatReportRow,
  type UploadBatchRow,
} from "../../app/shared";

type StaffOpenAidatReportPageProps = {
  loading: boolean;
  apartmentOptions: ApartmentOption[];
  selectedApartmentId: string;
  setSelectedApartmentId: Dispatch<SetStateAction<string>>;
  rows: StaffOpenAidatReportRow[];
  totals: StaffOpenAidatReportResponse["totals"] | null;
  apartmentSummary: StaffOpenAidatReportResponse["apartment"] | null;
  reportLoading: boolean;
  latestUploadBatches: UploadBatchRow[];
  runQuery: (apartmentId: string, options?: { silent?: boolean }) => Promise<void>;
  sendStatementEmail: (apartmentId: string) => Promise<void>;
  clearFilters: () => void;
};

function toPeriodLabel(periodYear: number, periodMonth: number): string {
  return `${String(periodMonth).padStart(2, "0")}/${periodYear}`;
}

function resolveApartmentDisplayName(apt: ApartmentOption): string {
  const owner = apt.ownerFullName?.trim();
  if (owner) {
    return owner;
  }
  const resident = apt.residentUsers.find((user) => user.fullName.trim().length > 0)?.fullName.trim();
  return resident || "Isim yok";
}

function normalizeBlockLabel(blockName: string): string {
  return blockName.replace(/\s*blok\s*$/i, "").trim();
}

function resolveUploadKindLabel(row: UploadBatchRow): string {
  const isGmail = row.kind === "BANK_STATEMENT_UPLOAD" && row.fileName.toLowerCase().startsWith("gmail:");
  if (isGmail) {
    return "Gmail";
  }
  return row.kind === "BANK_STATEMENT_UPLOAD" ? "Banka Ekstresi Upload" : "Toplu Odeme Upload";
}

function resolveUploadSourceLabel(row: UploadBatchRow): string {
  const isGmail = row.kind === "BANK_STATEMENT_UPLOAD" && row.fileName.toLowerCase().startsWith("gmail:");
  if (isGmail) {
    return "Railway";
  }
  return row.uploadedByName?.trim() || row.uploadedByEmail?.trim() || "-";
}

export function StaffOpenAidatReportPage({
  loading,
  apartmentOptions,
  selectedApartmentId,
  setSelectedApartmentId,
  rows,
  apartmentSummary,
  reportLoading,
  latestUploadBatches,
  runQuery,
  sendStatementEmail,
  clearFilters,
}: StaffOpenAidatReportPageProps) {
  const selectableApartments = useMemo(
    () =>
      apartmentOptions
        .sort((a, b) => {
          const blockCompare = a.blockName.localeCompare(b.blockName, "tr");
          if (blockCompare !== 0) {
            return blockCompare;
          }
          return a.doorNo.localeCompare(b.doorNo, "tr", { numeric: true });
        }),
    [apartmentOptions]
  );

  const runQueryRef = useRef(runQuery);
  useEffect(() => {
    runQueryRef.current = runQuery;
  }, [runQuery]);

  useEffect(() => {
    if (!selectedApartmentId) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void runQueryRef.current(selectedApartmentId, { silent: true });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [selectedApartmentId]);

  const selectedApartmentOption = useMemo(
    () => apartmentOptions.find((apt) => apt.id === selectedApartmentId) ?? null,
    [apartmentOptions, selectedApartmentId]
  );

  const summaryName =
    apartmentSummary?.apartmentOwnerName?.trim() ||
    (selectedApartmentOption ? resolveApartmentDisplayName(selectedApartmentOption) : "");

  const overdueRows = useMemo(() => rows.filter((row) => row.overdueDays > 0), [rows]);
  const overdueTotal = useMemo(
    () => overdueRows.reduce((sum, row) => sum + row.remaining, 0),
    [overdueRows]
  );
  const emptyStateText = !selectedApartmentId
    ? "Lutfen daire secin."
    : reportLoading || loading
      ? "Secilen daire verileri yukleniyor..."
      : apartmentSummary
        ? "Secilen daire icin acik borc bulunmuyor."
        : "Secilen daire bilgisi yukleniyor...";

  return (
    <section className="dashboard report-page staff-open-aidat-page">
      <div className="card table-card report-page-card staff-open-aidat-card-shell" aria-busy={reportLoading}>
        <div className="section-head report-toolbar">
          <h3>Gorevli Mobil Acik Borc Raporu</h3>
        </div>
        <div className={`staff-open-aidat-content${reportLoading ? " is-loading" : ""}`}>
          <div className="upload-batch-filter-row compact-row-top-gap report-filter-grid staff-open-aidat-filter-grid">
            <label>
              Daire Secimi
              <select
                value={selectedApartmentId}
                onChange={(e) => {
                  const nextApartmentId = e.target.value;
                  setSelectedApartmentId(nextApartmentId);
                  if (!nextApartmentId) {
                    clearFilters();
                  }
                }}
                disabled={reportLoading || loading}
              >
                <option value="">Daire secin</option>
                {selectableApartments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {normalizeBlockLabel(apt.blockName)} - {apt.doorNo} ({resolveApartmentDisplayName(apt)})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {apartmentSummary ? (
            <div className="stats-grid report-summary-grid compact-row-top-gap">
              <article className="stat-card staff-open-aidat-apartment-card">
                <button
                  className="staff-open-aidat-email-trigger"
                  type="button"
                  onClick={() => void sendStatementEmail(selectedApartmentId)}
                  disabled={!selectedApartmentId || loading || reportLoading}
                >
                  <span className="stat-label">Ekstre E-mail Gonder</span>
                  <strong>
                    Daire {normalizeBlockLabel(apartmentSummary.blockName)} - {apartmentSummary.apartmentDoorNo}
                    {summaryName ? ` (${summaryName})` : ""}
                  </strong>
                </button>
              </article>
              {overdueRows.length > 0 ? (
                <article className="stat-card">
                  <span className="stat-label">Geciken Borc</span>
                  <strong>
                    {overdueRows.length} kayit - {formatTry(overdueTotal)}
                  </strong>
                </article>
              ) : null}
            </div>
          ) : null}

          <div className="staff-open-aidat-list compact-row-top-gap">
            {rows.length === 0 ? (
              <p className="small">{emptyStateText}</p>
            ) : (
              rows.map((row) => (
                <article
                  key={row.chargeId}
                  className={`staff-open-aidat-card${row.overdueDays > 0 ? " staff-open-aidat-card-overdue" : ""}`}
                >
                  <header className="staff-open-aidat-card-head">
                    <strong>{`${toPeriodLabel(row.periodYear, row.periodMonth)} - ${row.chargeTypeName}`}</strong>
                    <span>{row.overdueDays > 0 ? `${row.overdueDays} gun gecikme` : "Vadesi gelmedi"}</span>
                  </header>
                  <dl className="staff-open-aidat-meta">
                    <div>
                      <dt>Vade Tarihi</dt>
                      <dd>{formatDateTr(row.dueDate)}</dd>
                    </div>
                    <div className="staff-open-aidat-meta-right">
                      <dt>Kalan Tutar</dt>
                      <dd className="staff-open-aidat-remaining">{formatTry(row.remaining)}</dd>
                    </div>
                  </dl>
                </article>
              ))
            )}
          </div>

          <div className="card table-card compact-row-top-gap staff-open-aidat-upload-card">
            <div className="section-head">
              <h4>Son 10 Yukleme Kaydi</h4>
            </div>
            {latestUploadBatches.length === 0 ? (
              <p className="small">Yukleme kaydi bulunmuyor.</p>
            ) : (
              <div className="table-wrap staff-open-aidat-upload-table-wrap">
                <table className="apartment-list-table staff-open-aidat-upload-table">
                  <thead>
                    <tr>
                      <th>Yukleme Zamani</th>
                      <th>Yukleyen</th>
                      <th>Yukleme Tipi</th>
                      <th>Dosya</th>
                      <th className="col-num">Toplam Satir</th>
                      <th className="col-num">Tahsilat</th>
                      <th className="col-num">Gider</th>
                      <th className="col-num">Atlanan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestUploadBatches.map((row) => (
                      <tr key={row.id}>
                        <td>{formatDateTimeTr(row.uploadedAt)}</td>
                        <td>{resolveUploadSourceLabel(row)}</td>
                        <td>{resolveUploadKindLabel(row)}</td>
                        <td>{row.fileName}</td>
                        <td className="col-num">{row.totalRows}</td>
                        <td className="col-num">{row.createdPaymentCount}</td>
                        <td className="col-num">{row.createdExpenseCount}</td>
                        <td className="col-num">{row.skippedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {reportLoading ? (
          <div className="staff-open-aidat-loading-overlay" role="status" aria-live="polite" aria-busy="true">
            <div className="staff-open-aidat-loading-pill">Veriler yukleniyor...</div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
