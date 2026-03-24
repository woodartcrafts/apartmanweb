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
};

export function StatementPage({
  activeApartmentId,
  setActiveApartmentId,
  apartmentOptions,
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
}: StatementPageProps) {
  return (
    <>
      <div className="card admin-tools">
        <h3>Admin Ekstre Sorgu</h3>
        <div className="admin-row">
          <select
            title="Ekstre icin daire secimi"
            value={activeApartmentId}
            onChange={(e) => setActiveApartmentId(e.target.value)}
          >
            <option value="">Daire seciniz</option>
            {apartmentOptions.map((apt) => (
              <option key={apt.id} value={apt.id}>
                {apt.blockName} / {apt.doorNo} / {apt.type}
                {apt.ownerFullName ? ` / ${apt.ownerFullName}` : ""}
              </option>
            ))}
          </select>
          <button className="btn btn-primary statement-fetch-btn" onClick={() => void fetchStatement()} disabled={loading}>
            Ekstre Getir
          </button>
          <button className="btn btn-ghost" onClick={() => void reconcileSelectedApartment()} disabled={loading}>
            Secilen Daireyi Yeniden Eslestir
          </button>
        </div>
      </div>

      <div className="stats-grid statement-stats-grid">
        {statementViewMode === "CLASSIC" ? (
          <>
            <article className="card stat">
              <h4>Toplam Borc</h4>
              <p>{formatTry(totals.amount)}</p>
            </article>
            <article className="card stat">
              <h4>Toplam Odenen</h4>
              <p>{formatTry(totals.paid)}</p>
            </article>
            <article className="card stat">
              <h4>Kalan</h4>
              <p>{formatTry(totals.remaining)}</p>
            </article>
            <article className="card stat">
              <h4>Geciken Borc</h4>
              <p>{formatTry(overdueStatementTotals.remaining)}</p>
              <span className="small">Satir sayisi: {overdueStatementTotals.count}</span>
            </article>
          </>
        ) : (
          <>
            <article className="card stat">
              <h4>Toplam Borc Hareketi</h4>
              <p>{formatTry(accountingTotals.debit)}</p>
            </article>
            <article className="card stat">
              <h4>Toplam Alacak Hareketi</h4>
              <p>{formatTry(accountingTotals.credit)}</p>
            </article>
            <article className="card stat">
              <h4>Bakiye</h4>
              <p>{formatTry(accountingTotals.balance)}</p>
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
                  <th>Odeme Tarihi</th>
                  <th className="col-num">Tutar</th>
                  <th className="col-num">Odenen</th>
                  <th className="col-num">Kalan</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {sortedStatement.map((row) => (
                  <tr
                    key={row.chargeId}
                    className={
                      row.remaining <= 0.0001 || row.status === "CLOSED"
                        ? "statement-classic-row-closed"
                        : "statement-classic-row-open"
                    }
                  >
                    <td>{row.periodYear}</td>
                    <td>{String(row.periodMonth).padStart(2, "0")}</td>
                    <td>{row.type}</td>
                    <td>{formatDateTr(row.dueDate)}</td>
                    <td>{row.status === "CLOSED" ? (row.paidAt ? formatDateTr(row.paidAt) : "-") : "-"}</td>
                    <td className="col-num">{formatTry(row.amount)}</td>
                    <td className="col-num">{formatTry(row.paidTotal)}</td>
                    <td className="col-num">{formatTry(row.remaining)}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
                {statementCount === 0 && (
                  <tr>
                    <td colSpan={9} className="empty">
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
    </>
  );
}
