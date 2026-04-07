import { Fragment, useState, type Dispatch, type SetStateAction } from "react";
import {
  formatDateTr,
  formatTry,
  type UploadBatchDetailsResponse,
  type UploadBatchKind,
  type UploadBatchRow,
  type UploadBatchUploader,
} from "../../app/shared";

type UploadBatchFilterState = {
  from: string;
  to: string;
  uploadedByUserId: string;
  kind: "" | UploadBatchKind;
  limit: string;
  offset: string;
};

type UploadBatchesPageProps = {
  loading: boolean;
  uploadBatchRows: UploadBatchRow[];
  uploadBatchUploaders: UploadBatchUploader[];
  uploadBatchFilter: UploadBatchFilterState;
  setUploadBatchFilter: Dispatch<SetStateAction<UploadBatchFilterState>>;
  deletingUploadBatchId: string | null;
  fetchUploadBatchDetails: (batchId: string) => Promise<UploadBatchDetailsResponse>;
  runUploadBatchQuery: () => Promise<void>;
  goUploadBatchPage: (direction: "prev" | "next") => Promise<void>;
  clearUploadBatchFilters: () => Promise<void>;
  deleteUploadBatch: (row: UploadBatchRow) => Promise<void>;
};

export function UploadBatchesPage({
  loading,
  uploadBatchRows,
  uploadBatchUploaders,
  uploadBatchFilter,
  setUploadBatchFilter,
  deletingUploadBatchId,
  fetchUploadBatchDetails,
  runUploadBatchQuery,
  goUploadBatchPage,
  clearUploadBatchFilters,
  deleteUploadBatch,
}: UploadBatchesPageProps) {
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [detailsLoadingBatchId, setDetailsLoadingBatchId] = useState<string | null>(null);
  const [detailsByBatchId, setDetailsByBatchId] = useState<Record<string, UploadBatchDetailsResponse>>({});
  const [detailsErrorByBatchId, setDetailsErrorByBatchId] = useState<Record<string, string>>({});

  async function toggleBatchDetails(row: UploadBatchRow): Promise<void> {
    if (expandedBatchId === row.id) {
      setExpandedBatchId(null);
      return;
    }

    setExpandedBatchId(row.id);
    if (detailsByBatchId[row.id]) {
      return;
    }

    setDetailsLoadingBatchId(row.id);
    setDetailsErrorByBatchId((prev) => ({ ...prev, [row.id]: "" }));
    try {
      const details = await fetchUploadBatchDetails(row.id);
      setDetailsByBatchId((prev) => ({ ...prev, [row.id]: details }));
    } catch (err) {
      const text = err instanceof Error ? err.message : "Detaylar alinamadi";
      setDetailsErrorByBatchId((prev) => ({ ...prev, [row.id]: text }));
    } finally {
      setDetailsLoadingBatchId((current) => (current === row.id ? null : current));
    }
  }

  function sortByDateDesc<T extends { id: string }>(rows: T[], getDate: (row: T) => string): T[] {
    return [...rows].sort((a, b) => {
      const diff = new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime();
      if (diff !== 0) {
        return diff;
      }
      return b.id.localeCompare(a.id);
    });
  }

  function cleanPaymentNote(note: string | null): string {
    if (!note) {
      return "-";
    }

    const cleaned = note
      .split("|")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .filter((part) => !/^(BANK_REF|REF)\s*:/i.test(part))
      .map((part) => {
        const match = part.match(/^BANK_DESC\s*:\s*(.*)$/i);
        return match ? (match[1]?.trim() || "") : part;
      })
      .filter((part) => part.length > 0)
      .join(" | ");

    return cleaned || "-";
  }

  function isGmailBatch(row: UploadBatchRow): boolean {
    return row.kind === "BANK_STATEMENT_UPLOAD" && row.fileName.toLowerCase().startsWith("gmail:");
  }

  return (
    <section className="dashboard">
      <div className="card table-card">
        <div className="section-head">
          <h3>Yuklenen Dosyalar</h3>
          <div className="admin-row">
            <button className="btn btn-primary btn-run" type="button" onClick={() => void runUploadBatchQuery()}>
              Calistir
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void goUploadBatchPage("prev")}>
              Onceki Sayfa
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => void goUploadBatchPage("next")}
              disabled={uploadBatchRows.length === 0}
            >
              Sonraki Sayfa
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void clearUploadBatchFilters()}>Temizle</button>
          </div>
        </div>

        <div className="upload-batch-filter-row compact-row-top-gap">
          <label>
            Baslangic Tarihi
            <input
              type="date"
              value={uploadBatchFilter.from}
              onChange={(e) => setUploadBatchFilter((prev) => ({ ...prev, from: e.target.value }))}
            />
          </label>
          <label>
            Bitis Tarihi
            <input
              type="date"
              value={uploadBatchFilter.to}
              onChange={(e) => setUploadBatchFilter((prev) => ({ ...prev, to: e.target.value }))}
            />
          </label>
          <label>
            Yukleyen Kullanici
            <select
              value={uploadBatchFilter.uploadedByUserId}
              onChange={(e) => setUploadBatchFilter((prev) => ({ ...prev, uploadedByUserId: e.target.value }))}
            >
              <option value="">Hepsi</option>
              {uploadBatchUploaders.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} ({user.email})
                </option>
              ))}
            </select>
          </label>
          <label>
            Yukleme Tipi
            <select
              value={uploadBatchFilter.kind}
              onChange={(e) =>
                setUploadBatchFilter((prev) => ({ ...prev, kind: e.target.value as "" | UploadBatchKind }))
              }
            >
              <option value="">Hepsi</option>
              <option value="BANK_STATEMENT_UPLOAD">Banka Ekstresi Upload</option>
              <option value="PAYMENT_UPLOAD">Toplu Odeme Upload</option>
            </select>
          </label>
        </div>

        <div className="table-wrap">
          <table className="apartment-list-table">
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
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {uploadBatchRows.map((row) => (
                <Fragment key={row.id}>
                  <tr>
                    <td>{formatDateTr(row.uploadedAt)}</td>
                    <td>{isGmailBatch(row) ? "Railway" : row.uploadedByName ?? row.uploadedByEmail ?? "-"}</td>
                    <td>
                      {isGmailBatch(row)
                        ? "Gmail"
                        : row.kind === "BANK_STATEMENT_UPLOAD"
                          ? "Banka Ekstresi Upload"
                          : "Toplu Odeme Upload"}
                    </td>
                    <td>{row.fileName}</td>
                    <td className="col-num">{row.totalRows}</td>
                    <td className="col-num">{row.createdPaymentCount}</td>
                    <td className="col-num">{row.createdExpenseCount}</td>
                    <td className="col-num">{row.skippedCount}</td>
                    <td className="actions-cell">
                      <button
                        className="btn btn-ghost"
                        type="button"
                        disabled={loading || detailsLoadingBatchId === row.id}
                        onClick={() => void toggleBatchDetails(row)}
                      >
                        {detailsLoadingBatchId === row.id
                          ? "Yukleniyor..."
                          : expandedBatchId === row.id
                            ? "Gizle"
                            : "Goster"}
                      </button>
                      <button
                        className="btn btn-danger"
                        type="button"
                        disabled={loading || deletingUploadBatchId === row.id}
                        onClick={() => void deleteUploadBatch(row)}
                      >
                        {deletingUploadBatchId === row.id ? "Siliniyor..." : "Sil"}
                      </button>
                    </td>
                  </tr>

                  {expandedBatchId === row.id && (
                    <tr>
                      <td colSpan={9}>
                        <div className="card table-card compact-row-top-gap">
                          <h4>Yukleme Detayi</h4>
                          {detailsLoadingBatchId === row.id && <p className="small">Detaylar yukleniyor...</p>}
                          {detailsLoadingBatchId !== row.id && detailsErrorByBatchId[row.id] && (
                            <p className="small">{detailsErrorByBatchId[row.id]}</p>
                          )}
                          {detailsLoadingBatchId !== row.id && !detailsErrorByBatchId[row.id] && detailsByBatchId[row.id] && (
                            <>
                              {(() => {
                                const sortedPayments = sortByDateDesc(detailsByBatchId[row.id].payments, (x) => x.paidAt).map(
                                  (payment) => ({
                                    id: payment.id,
                                    occurredAt: payment.paidAt,
                                    rowType: "PAYMENT" as const,
                                    amount: payment.totalAmount,
                                    method: payment.method,
                                    reference: payment.reference,
                                    detailMain: payment.apartmentLabels.join(" | ") || "-",
                                    detailText: cleanPaymentNote(payment.note),
                                  })
                                );
                                const sortedExpenses = sortByDateDesc(detailsByBatchId[row.id].expenses, (x) => x.spentAt).map(
                                  (expense) => ({
                                    id: expense.id,
                                    occurredAt: expense.spentAt,
                                    rowType: "EXPENSE" as const,
                                    amount: expense.amount,
                                    method: expense.paymentMethod,
                                    reference: expense.reference,
                                    detailMain: expense.expenseItemName,
                                    detailText: expense.description ?? "-",
                                  })
                                );
                                const combinedRows = [...sortedPayments, ...sortedExpenses].sort((a, b) => {
                                  const diff = new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
                                  if (diff !== 0) {
                                    return diff;
                                  }
                                  return b.id.localeCompare(a.id);
                                });
                                return (
                                  <>
                              <p className="small">
                                Tahsilat: {detailsByBatchId[row.id].payments.length} | Gider: {detailsByBatchId[row.id].expenses.length}
                              </p>

                              <div className="table-wrap compact-row-top-gap">
                                <table className="apartment-list-table">
                                  <thead>
                                    <tr>
                                      <th>Tarih</th>
                                      <th>Tip</th>
                                      <th>Yontem</th>
                                      <th className="col-num">Tutar</th>
                                      <th>Detay</th>
                                      <th>Referans</th>
                                      <th>Aciklama</th>
                                      <th>ID</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {combinedRows.map((entry) => (
                                      <tr
                                        key={`${entry.rowType}-${entry.id}`}
                                        className={entry.rowType === "EXPENSE" ? "upload-batch-detail-expense-row" : undefined}
                                      >
                                        <td>{formatDateTr(entry.occurredAt)}</td>
                                        <td>{entry.rowType === "PAYMENT" ? "Tahsilat" : "Gider"}</td>
                                        <td>{entry.method.replaceAll("_", " ")}</td>
                                        <td className="col-num">{entry.rowType === "EXPENSE" ? formatTry(-entry.amount) : formatTry(entry.amount)}</td>
                                        <td>{entry.detailMain}</td>
                                        <td>{entry.reference ?? "-"}</td>
                                        <td>{entry.detailText}</td>
                                        <td>{entry.id}</td>
                                      </tr>
                                    ))}
                                    {combinedRows.length === 0 && (
                                      <tr>
                                        <td colSpan={8} className="empty">
                                          Bu yuklemeye ait kayit yok
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                                  </>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}

              {uploadBatchRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">
                    Yukleme kaydi yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
