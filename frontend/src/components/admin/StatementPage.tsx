import { useEffect } from "react";
import {
  formatDateTr,
  formatTry,
  type AccountingStatementItem,
  type ApartmentOption,
  type StatementItem,
  type StatementViewMode,
} from "../../app/shared";

type StatementPageProps = {
  activeApartmentId: string;
  setActiveApartmentId: (value: string) => void;
  apartmentOptions: ApartmentOption[];
  fetchApartmentOptions: () => Promise<void>;
  fetchStatement: () => Promise<void>;
  reconcileSelectedApartment: () => Promise<void>;
  loading: boolean;
  statementViewMode: StatementViewMode;
  setStatementViewMode: (value: StatementViewMode) => void;
  totals: {
    amount: number;
    paid: number;
    remaining: number;
  };
  overdueStatementTotals: {
    remaining: number;
    count: number;
  };
  accountingTotals: {
    debit: number;
    credit: number;
    balance: number;
  };
  activeApartmentHeaderText: string;
  sortedStatement: StatementItem[];
  sortedAccountingStatement: AccountingStatementItem[];
  statementCount: number;
  accountingStatementCount: number;
  formatAccountingStatementDescription: (value: string) => string;
  sendStatementPdfEmail?: (apartmentId: string) => Promise<void>;
  canSendStatementPdfEmail?: boolean;
};

export function StatementPage({
  activeApartmentId,
  setActiveApartmentId,
  apartmentOptions,
  fetchApartmentOptions,
  fetchStatement,
  reconcileSelectedApartment,
  loading,
  statementViewMode,
  setStatementViewMode,
  totals,
  overdueStatementTotals,
  accountingTotals,
  activeApartmentHeaderText,
  sortedStatement,
  sortedAccountingStatement,
  statementCount,
  accountingStatementCount,
  formatAccountingStatementDescription,
  sendStatementPdfEmail,
  canSendStatementPdfEmail,
}: StatementPageProps) {
  useEffect(() => {
    if (apartmentOptions.length === 0 && !loading) {
      void fetchApartmentOptions();
    }
  }, [apartmentOptions.length, fetchApartmentOptions, loading]);

  useEffect(() => {
    if (activeApartmentId.trim()) {
      void fetchStatement();
    }
  }, [activeApartmentId]);

  function formatPaymentDayDiff(
    dueDate: string,
    paidAt: string | null | undefined,
    status: string,
    remaining: number
  ): string {
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) {
      return "-";
    }

    const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();

    if (paidAt) {
      const paid = new Date(paidAt);
      if (Number.isNaN(paid.getTime())) {
        return "-";
      }

      const paidStart = new Date(paid.getFullYear(), paid.getMonth(), paid.getDate()).getTime();
      const diffDays = Math.round((paidStart - dueStart) / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        return `${diffDays} gun gec`;
      }
      if (diffDays < 0) {
        return `${Math.abs(diffDays)} gun erken`;
      }
      return "Tam gununde";
    }

    const isClosed = status === "CLOSED" || remaining <= 0.0001;
    if (isClosed) {
      return "-";
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const overdueDays = Math.floor((todayStart - dueStart) / (1000 * 60 * 60 * 24));

    if (overdueDays > 0) {
      return `${overdueDays} gun gecikmis - Odeme bekleniyor`;
    }

    return "-";
  }

  const lastAccountingCollection = sortedAccountingStatement.reduce<{ date: string; amount: number } | null>((latest, row) => {
    if (row.credit <= 0) {
      return latest;
    }

    if (!latest) {
      return { date: row.date, amount: row.credit };
    }

    return new Date(row.date).getTime() > new Date(latest.date).getTime()
      ? { date: row.date, amount: row.credit }
      : latest;
  }, null);

  const lastClassicCollection = sortedStatement.reduce<{ date: string; amount: number } | null>((latest, row) => {
    if (!row.paidAt || row.paidTotal <= 0) {
      return latest;
    }

    if (!latest) {
      return { date: row.paidAt, amount: row.paidTotal };
    }

    return new Date(row.paidAt).getTime() > new Date(latest.date).getTime()
      ? { date: row.paidAt, amount: row.paidTotal }
      : latest;
  }, null);

  const lastCollection = lastAccountingCollection ?? lastClassicCollection;
  const lastCollectionText = lastCollection
    ? `${formatDateTr(lastCollection.date)} - ${formatTry(lastCollection.amount)}`
    : "-";

  return (
    <section className="statement-page">
      <div className="card admin-tools">
        <div className="section-head">
          <h3>Admin Ekstre Sorgu</h3>
          <div className="admin-row">
            <button className="btn btn-ghost hide-on-mobile" onClick={() => void reconcileSelectedApartment()} disabled={loading}>
              Secilen Daireyi Yeniden Eslestir
            </button>
          </div>
        </div>
        <div className="statement-query-row">
          <select
            title="Ekstre icin daire secimi"
            value={activeApartmentId}
            onChange={(e) => setActiveApartmentId(e.target.value)}
          >
            <option value="">Daire seciniz</option>
            {apartmentOptions.map((apt) => (
              <option key={apt.id} value={apt.id}>
                {apt.doorNo}{apt.ownerFullName ? ` - ${apt.ownerFullName}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {canSendStatementPdfEmail ? (
        <div className="statement-mobile-email-row">
          <select
            title="Ekstre icin daire secimi (mobil)"
            value={activeApartmentId}
            onChange={(e) => setActiveApartmentId(e.target.value)}
            className="statement-mobile-select"
          >
            <option value="">Daire seciniz</option>
            {apartmentOptions.map((apt) => (
              <option key={apt.id} value={apt.id}>
                {apt.doorNo}{apt.ownerFullName ? ` - ${apt.ownerFullName}` : ""}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary statement-pdf-email-btn"
            type="button"
            onClick={() => { if (activeApartmentId) void sendStatementPdfEmail!(activeApartmentId); }}
            disabled={!activeApartmentId || loading}
          >
            Ekstreyi PDF Olarak E-Mail Gonder
          </button>
        </div>
      ) : (
        <div className="statement-mobile-email-row statement-mobile-email-row--readonly">
          <select
            title="Ekstre icin daire secimi (mobil)"
            value={activeApartmentId}
            onChange={(e) => setActiveApartmentId(e.target.value)}
            className="statement-mobile-select"
          >
            <option value="">Daire seciniz</option>
            {apartmentOptions.map((apt) => (
              <option key={apt.id} value={apt.id}>
                {apt.doorNo}{apt.ownerFullName ? ` - ${apt.ownerFullName}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="stats-grid statement-stats-grid">
        {statementViewMode === "CLASSIC" ? (
          <>
            <article className="card stat statement-stat-card">
              <h4>Toplam Borc</h4>
              <p>{formatTry(totals.amount)}</p>
            </article>
            <article className="card stat statement-stat-card">
              <h4>Toplam Odenen</h4>
              <p>{formatTry(totals.paid)}</p>
            </article>
            <article className="card stat statement-stat-card">
              <h4>Kalan</h4>
              <p>{formatTry(totals.remaining)}</p>
            </article>
            <article className="card stat statement-stat-card statement-stat-card-overdue">
              <h4>Geciken Borc</h4>
              <p>{formatTry(overdueStatementTotals.remaining)}</p>
              {overdueStatementTotals.count > 0 ? (
                <span className="small statement-stat-meta">Satir sayisi: {overdueStatementTotals.count}</span>
              ) : null}
            </article>
            <article className="card stat statement-stat-card statement-stat-card-date">
              <h4>Son Tahsilat Tarihi - Tutari</h4>
              <p>{lastCollectionText}</p>
            </article>
          </>
        ) : (
          <>
            <article className="card stat statement-stat-card">
              <h4>Toplam Borc Hareketi</h4>
              <p>{formatTry(accountingTotals.debit)}</p>
            </article>
            <article className="card stat statement-stat-card">
              <h4>Toplam Alacak Hareketi</h4>
              <p>{formatTry(accountingTotals.credit)}</p>
            </article>
            <article className="card stat statement-stat-card">
              <h4>Bakiye</h4>
              <p>{formatTry(accountingTotals.balance)}</p>
            </article>
            <article className="card stat statement-stat-card statement-stat-card-date">
              <h4>Son Tahsilat Tarihi - Tutari</h4>
              <p>{lastCollectionText}</p>
            </article>
          </>
        )}
      </div>

      <div className="card table-card">
        <div className="compact-row">
          <h3 className="statement-title">
            Ekstre
            {activeApartmentHeaderText ? (
              <span className="statement-selected-apartment">Daire {activeApartmentHeaderText}</span>
            ) : null}
          </h3>
          <div className="admin-row">
            <button
              type="button"
              className={statementViewMode === "CLASSIC" ? "btn btn-primary" : "btn btn-ghost"}
              onClick={() => setStatementViewMode("CLASSIC")}
            >
              Kapamali Ekstre
            </button>
            <button
              type="button"
              className={statementViewMode === "ACCOUNTING" ? "btn btn-primary" : "btn btn-ghost"}
              onClick={() => setStatementViewMode("ACCOUNTING")}
            >
              Muhasebe Ekstresi
            </button>
          </div>
        </div>
        <div className="table-wrap">
          {statementViewMode === "CLASSIC" ? (
            <table>
              <thead>
                <tr>
                  <th>Yil</th>
                  <th>Ay</th>
                  <th>Aciklama</th>
                  <th>Son Odeme Tarihi</th>
                  <th>Odenme Tarihi</th>
                  <th>Adat</th>
                  <th className="col-num">Tutar</th>
                  <th className="col-num">Odenen</th>
                  <th className="col-num">Kalan</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {sortedStatement.map((row) => {
                  const isClosed = row.remaining <= 0.0001 || row.status === "CLOSED";
                  let rowClassName = "statement-classic-row-open";

                  if (isClosed) {
                    rowClassName = "statement-classic-row-closed";
                  } else {
                    const due = new Date(row.dueDate);
                    if (!Number.isNaN(due.getTime())) {
                      const todayStart = new Date();
                      todayStart.setHours(0, 0, 0, 0);
                      const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
                      if (dueStart < todayStart.getTime()) {
                        rowClassName = "statement-classic-row-overdue";
                      }
                    }
                  }

                  return (
                    <tr key={row.chargeId} className={rowClassName}>
                    <td>{row.periodYear}</td>
                    <td>{String(row.periodMonth).padStart(2, "0")}</td>
                    <td>{row.type}</td>
                    <td>{formatDateTr(row.dueDate)}</td>
                    <td>{row.status === "CLOSED" ? (row.paidAt ? formatDateTr(row.paidAt) : "-") : "-"}</td>
                    <td>{formatPaymentDayDiff(row.dueDate, row.paidAt, row.status, row.remaining)}</td>
                    <td className="col-num">{formatTry(row.amount)}</td>
                    <td className="col-num">{formatTry(row.paidTotal)}</td>
                    <td className="col-num">{formatTry(row.remaining)}</td>
                    <td>{row.status}</td>
                    </tr>
                  );
                })}
                {statementCount === 0 && (
                  <tr>
                    <td colSpan={10} className="empty">
                      Henuz ekstre verisi yok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="statement-accounting-table">
              <thead>
                <tr>
                  <th>Yil</th>
                  <th>Ay</th>
                  <th>Tarih</th>
                  <th>Hareket</th>
                  <th>Aciklama</th>
                  <th className="col-num">Borc</th>
                  <th className="col-num">Alacak</th>
                  <th className="col-num">Bakiye</th>
                </tr>
              </thead>
              <tbody>
                {sortedAccountingStatement.map((row) => (
                  <tr key={row.movementId}>
                    <td>{row.periodYear ?? new Date(row.date).getFullYear()}</td>
                    <td>{String(row.periodMonth ?? new Date(row.date).getMonth() + 1).padStart(2, "0")}</td>
                    <td>{formatDateTr(row.date)}</td>
                    <td>{row.movementType}</td>
                    <td className="statement-accounting-description">{formatAccountingStatementDescription(row.description)}</td>
                    <td className="col-num">{row.debit > 0 ? formatTry(row.debit) : "-"}</td>
                    <td className="col-num">{row.credit > 0 ? formatTry(row.credit) : "-"}</td>
                    <td className={`col-num${row.balance < 0 ? " col-num-negative" : ""}`}>{formatTry(row.balance)}</td>
                  </tr>
                ))}
                {accountingStatementCount === 0 && (
                  <tr>
                    <td colSpan={8} className="empty">
                      Henuz muhasebe ekstresi verisi yok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
