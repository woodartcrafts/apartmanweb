import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  apiBase,
  apiFetch,
  formatTry,
  type MobileMatrixApartmentDetailResponse,
  type MobileMatrixChargeKind,
  type MobileMatrixReportResponse,
} from "../../app/shared";

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

function MobileMatrixListView({ request, onOpen }: MobileMatrixReportPageProps & { onOpen: (apartmentId: string) => void }) {
  const [data, setData] = useState<MobileMatrixReportResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

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

  async function downloadPdf(): Promise<void> {
    setPdfBusy(true);
    setError(null);
    try {
      const res = await apiFetch(`${apiBase}/api/admin/reports/apartment-balance-matrix-mobile/pdf`);
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errData.message ?? "PDF indirilemedi");
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `mobil-matrix-raporu-${new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" })}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF indirilemedi");
    } finally {
      setPdfBusy(false);
    }
  }

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
          <div className="mm-sub">{data ? `Son veri tarihi: ${formatDay(data.lastDataAt)}` : "Yukleniyor..."}</div>
        </div>
        <div className="mm-actions">
          <button className="btn" type="button" onClick={() => void load()} disabled={busy}>
            {busy ? "..." : "Yenile"}
          </button>
          <button className="btn btn-primary" type="button" onClick={() => void downloadPdf()} disabled={pdfBusy || !data}>
            {pdfBusy ? "Hazirlaniyor..." : "PDF olarak aktar"}
          </button>
        </div>
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
                <div
                  className="mm-apt-head mm-apt-head-click"
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(row.apartmentId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpen(row.apartmentId);
                    }
                  }}
                >
                  <div className="mm-no">{row.apartmentDoorNo}</div>
                  <div className="mm-name">
                    <div className="mm-name-main">{row.occupant}</div>
                  </div>
                  {hasDebt ? (
                    <div className="mm-amount">{formatTry(row.overdueTotal)}</div>
                  ) : (
                    <div className="mm-amount mm-amount-ok">Borc yok</div>
                  )}
                  <span className="mm-chev" aria-hidden="true">
                    ›
                  </span>
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

function formatDayShort(iso: string): string {
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

function MobileMatrixApartmentView({ request, apartmentId }: { request: MobileMatrixReportPageProps["request"]; apartmentId: string }) {
  const [detail, setDetail] = useState<MobileMatrixApartmentDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    setDetail(null);
    setError(null);
    request<MobileMatrixApartmentDetailResponse>(
      `/api/admin/reports/apartment-balance-matrix-mobile/apartment/${encodeURIComponent(apartmentId)}`
    )
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : "Daire raporu alinamadi"));
    // request kimligi her render'da degisebilir; daire degisince bir kez yuklenir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apartmentId]);

  return (
    <section className="mm-page">
      <div className="mm-head">
        <Link className="btn" to="/admin/reports/mobile-matrix">
          ‹ Rapora don
        </Link>
      </div>

      {error ? <div className="mm-error">{error}</div> : null}
      {!detail && !error ? <div className="mm-sub">Yukleniyor...</div> : null}

      {detail ? (
        <>
          <div className="mm-detail-title">
            <div className="mm-no">{detail.doorNo}</div>
            <div className="mm-name">
              <div className="mm-name-main mm-name-wrap">{detail.occupant}</div>
              <div className="mm-name-sub">Daire {detail.doorNo}</div>
            </div>
          </div>

          {detail.totals.overdue > 0.005 ? (
            <div className="mm-total">
              <span>Geciken</span>
              <b>{formatTry(detail.totals.overdue)}</b>
            </div>
          ) : null}

          <div className="mm-cols">
            <div className="mm-col">
              <div className="mm-col-title">Tahakkuklar</div>
              {detail.charges.length === 0 ? <div className="mm-empty">Kayit yok</div> : null}
              {detail.charges.map((charge) => {
                const state = charge.remaining <= 0.005 ? "paid" : charge.overdue ? "late" : "wait";
                return (
                  <div key={charge.chargeId} className={`mm-cell mm-cell-${state}`}>
                    <div className="mm-cell-top">
                      <span className="mm-cell-date">
                        {MONTH_NAMES[charge.periodMonth - 1] ?? charge.periodMonth} {charge.periodYear}
                      </span>
                      <span className="mm-cell-amt">{formatTry(charge.amount)}</span>
                    </div>
                    <span className={`mm-tag ${KIND_CLASS[charge.kind]}`}>
                      {charge.kind === "DIGER" ? charge.chargeTypeName : KIND_LABEL[charge.kind]}
                    </span>
                    <div className="mm-cell-state">
                      {state === "paid"
                        ? "Odendi"
                        : `${state === "late" ? "Geciken" : "Vadesi gelmedi"}: ${formatTry(charge.remaining)}`}
                    </div>
                  </div>
                );
              })}
              <div className="mm-col-total">
                <span>Toplam</span>
                <b>{formatTry(detail.totals.charged)}</b>
              </div>
            </div>

            <div className="mm-col">
              <div className="mm-col-title">Odemeler</div>
              {detail.payments.length === 0 ? <div className="mm-empty">Odeme yok</div> : null}
              {detail.payments.map((payment) => (
                <div key={payment.paymentId} className="mm-cell mm-cell-pay">
                  <div className="mm-cell-top">
                    <span className="mm-cell-date">{formatDayShort(payment.paidAt)}</span>
                    <span className="mm-cell-amt mm-good">{formatTry(payment.amount)}</span>
                  </div>
                  <div className="mm-pay-desc">{payment.description}</div>
                  <div className="mm-pay-covers">
                    {payment.covers.map((cover, index) => (
                      <div key={`${cover.periodYear}-${cover.periodMonth}-${cover.kind}-${index}`}>
                        {(MONTH_NAMES[cover.periodMonth - 1] ?? cover.periodMonth).toString()}{" "}
                        {cover.kind === "DIGER" ? cover.chargeTypeName : KIND_LABEL[cover.kind]} · {formatTry(cover.amount)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="mm-col-total">
                <span>Toplam</span>
                <b className="mm-good">{formatTry(detail.totals.paid)}</b>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

export function MobileMatrixReportPage({ request }: MobileMatrixReportPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const apartmentId = searchParams.get("daire");

  if (apartmentId) {
    return <MobileMatrixApartmentView request={request} apartmentId={apartmentId} />;
  }
  return <MobileMatrixListView request={request} onOpen={(id) => setSearchParams({ daire: id })} />;
}
