import { useState } from "react";
import {
  formatDateTr,
  formatTry,
  type CashCashflowResponse,
} from "../../app/shared";

type CashCashflowPageProps = {
  loading: boolean;
  pageLoading: boolean;
  data: CashCashflowResponse | null;
  from: string;
  to: string;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
  refresh: (params?: { from?: string; to?: string }) => Promise<void>;
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

function formatPeriod(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}

export function CashCashflowPage({
  loading,
  pageLoading,
  data,
  from,
  to,
  setFrom,
  setTo,
  refresh,
}: CashCashflowPageProps) {
  const [busy, setBusy] = useState(false);

  async function onRun(): Promise<void> {
    setBusy(true);
    try {
      await refresh({ from, to });
    } finally {
      setBusy(false);
    }
  }

  async function onClear(): Promise<void> {
    setFrom("");
    setTo("");
    setBusy(true);
    try {
      await refresh({ from: "", to: "" });
    } finally {
      setBusy(false);
    }
  }

  const cash = data?.cash;
  const bank = data?.bankBalance;

  return (
    <section className="dashboard report-page cash-cashflow-page">
      <div className="card table-card report-page-card">
        <div className="section-head report-toolbar">
          <h3>Nakit Tahsilat ve Odemeler</h3>
          <div className="admin-row">
            <button
              className="btn btn-primary btn-run"
              type="button"
              onClick={() => void onRun()}
              disabled={loading || pageLoading || busy}
            >
              {pageLoading || busy ? "Yukleniyor..." : "Sorgula"}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => void onClear()}
              disabled={loading || pageLoading || busy}
            >
              Temizle
            </button>
          </div>
        </div>

        <p className="small">
          Nakit yontemiyle yapilan tahsilatlari ve nakit gider odemelerini listeler.
          Alt bolumde banka bakiyesi formulu gosterilir: acilis + banka girenler -
          banka cikanlar.
        </p>

        <div className="report-filter-grid compact-row-top-gap">
          <label>
            Baslangic
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Bitis
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>

        {data?.truncated ? (
          <p className="small" role="alert">
            DIKKAT: kayit sayisi limite takildi, liste eksik olabilir.
          </p>
        ) : null}

        <div className="stats-grid reports-home-stats-grid compact-row-top-gap">
          <article className="card stat stat-tone-good">
            <h4>Nakit Tahsilat</h4>
            <p>{formatTry(cash?.inTotal ?? 0)}</p>
            <span className="small">{cash?.collectionCount ?? 0} kayit</span>
          </article>
          <article className="card stat stat-tone-warn">
            <h4>Nakit Odeme</h4>
            <p>{formatTry(cash?.outTotal ?? 0)}</p>
            <span className="small">{cash?.expenseCount ?? 0} kayit</span>
          </article>
          <article className="card stat stat-tone-info">
            <h4>Nakit Net</h4>
            <p>{formatTry(cash?.net ?? 0)}</p>
            <span className="small">tahsilat - odeme</span>
          </article>
        </div>

        <h4 className="compact-row-top-gap">Banka Bakiyesi</h4>
        <p className="small">
          Acilis + banka girenler − banka cikanlar = bakiye. Bu bolum tum donemi
          kapsar (tarih filtresi uygulanmaz).
        </p>
        <div className="stats-grid reports-home-stats-grid compact-row-top-gap">
          <article className="card stat">
            <h4>Acilis</h4>
            <p>{formatTry(bank?.openingBalance ?? 0)}</p>
          </article>
          <article className="card stat stat-tone-good">
            <h4>Banka Girenler</h4>
            <p>{formatTry(bank?.bankInTotal ?? 0)}</p>
          </article>
          <article className="card stat stat-tone-warn">
            <h4>Banka Cikanlar</h4>
            <p>{formatTry(bank?.bankOutTotal ?? 0)}</p>
          </article>
          <article
            className={`card stat ${
              (bank?.estimatedBalance ?? 0) < 0
                ? "stat-tone-danger"
                : (bank?.estimatedBalance ?? 0) < 50000
                  ? "stat-tone-warn"
                  : "stat-tone-good"
            }`}
          >
            <h4>Bakiye</h4>
            <p>{formatTry(bank?.estimatedBalance ?? 0)}</p>
            <span className="small">
              {formatTry(bank?.openingBalance ?? 0)} + {formatTry(bank?.bankInTotal ?? 0)} −{" "}
              {formatTry(bank?.bankOutTotal ?? 0)}
            </span>
          </article>
        </div>

        <h4 className="compact-row-top-gap">
          Nakit Tahsilatlar
          <span className="small"> ({cash?.collectionCount ?? 0})</span>
        </h4>
        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Daire</th>
                <th className="col-num">Tutar</th>
                <th className="col-num">Islenen</th>
                <th>Aciklama</th>
                <th>Tahakkuklar</th>
                <th>Kaydeden</th>
              </tr>
            </thead>
            <tbody>
              {(cash?.collections.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Nakit tahsilat yok
                  </td>
                </tr>
              ) : (
                cash?.collections.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTr(row.paidAt)}</td>
                    <td>
                      {row.apartments.length > 0
                        ? row.apartments.map((apt) => apt.label).join(", ")
                        : row.doorNo
                          ? `Daire ${row.doorNo}`
                          : "-"}
                    </td>
                    <td className="col-num">{formatTry(row.amount)}</td>
                    <td className="col-num">{formatTry(row.allocatedAmount)}</td>
                    <td>{row.description ?? "-"}</td>
                    <td>
                      {row.allocations.length === 0
                        ? "-"
                        : row.allocations
                            .map(
                              (item) =>
                                `${item.apartmentLabel} ${item.chargeTypeName} ${formatPeriod(
                                  item.periodYear,
                                  item.periodMonth
                                )} (${formatTry(item.amount)})`
                            )
                            .join("; ")}
                    </td>
                    <td>{row.createdByName ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <h4 className="compact-row-top-gap">
          Nakit Odemeler
          <span className="small"> ({cash?.expenseCount ?? 0})</span>
        </h4>
        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Gider Kalemi</th>
                <th className="col-num">Tutar</th>
                <th>Aciklama</th>
                <th>Referans</th>
                <th>Kaydeden</th>
              </tr>
            </thead>
            <tbody>
              {(cash?.expenses.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">
                    Nakit odeme yok
                  </td>
                </tr>
              ) : (
                cash?.expenses.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTr(row.spentAt)}</td>
                    <td>{row.expenseItemName}</td>
                    <td className="col-num">{formatTry(row.amount)}</td>
                    <td>{row.description ?? "-"}</td>
                    <td>{row.reference ?? "-"}</td>
                    <td>{row.createdByName ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data ? (
          <p className="small compact-row-top-gap">
            Snapshot: {formatDateTr(data.snapshotAt)}
            {from || to ? ` · Filtre: ${from || "…"} → ${to || "…"}` : " · Tum kayitlar"}
          </p>
        ) : null}
      </div>
    </section>
  );
}
