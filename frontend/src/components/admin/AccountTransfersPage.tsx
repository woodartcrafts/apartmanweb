import { useMemo, useState } from "react";
import { formatDateTr, formatTry, type AccountTransferDirection, type AccountTransferRow } from "../../app/shared";

type AccountTransfersPageProps = {
  loading: boolean;
  rows: AccountTransferRow[];
  filter: { from: string; to: string };
  setFilter: React.Dispatch<React.SetStateAction<{ from: string; to: string }>>;
  refresh: () => Promise<void>;
};

export function AccountTransfersPage({ loading, rows, filter, setFilter, refresh }: AccountTransfersPageProps) {
  const [directionFilter, setDirectionFilter] = useState<"" | AccountTransferDirection>("");

  const filteredRows = useMemo(() => {
    if (!directionFilter) {
      return rows;
    }
    return rows.filter((row) => row.direction === directionFilter);
  }, [directionFilter, rows]);

  const totalIn = useMemo(
    () =>
      Number(
        filteredRows
          .filter((row) => row.movementType === "PAYMENT")
          .reduce((sum, row) => sum + row.amount, 0)
          .toFixed(2)
      ),
    [filteredRows]
  );

  const totalOut = useMemo(
    () =>
      Number(
        filteredRows
          .filter((row) => row.movementType === "EXPENSE")
          .reduce((sum, row) => sum + row.amount, 0)
          .toFixed(2)
      ),
    [filteredRows]
  );

  return (
    <section className="dashboard report-page account-transfers-page">
      <div className="card table-card report-page-card">
        <div className="section-head report-toolbar">
          <h3>Hesaplar Arasi Virman</h3>
          <div className="admin-row">
            <button className="btn btn-primary btn-run" type="button" onClick={() => void refresh()} disabled={loading}>
              {loading ? "Yukleniyor..." : "Yenile"}
            </button>
          </div>
        </div>

        <p className="small">
          Vadeli mevduat ile TL hesap arasindaki aktarimlar burada listelenir. Bu kayitlar tahsilat/gider raporlarina ve
          tahmini banka bakiyesine dahil edilmez.
        </p>

        <div className="upload-batch-filter-row compact-row-top-gap">
          <label>
            Baslangic
            <input
              type="date"
              value={filter.from}
              onChange={(e) => setFilter((prev) => ({ ...prev, from: e.target.value }))}
            />
          </label>
          <label>
            Bitis
            <input type="date" value={filter.to} onChange={(e) => setFilter((prev) => ({ ...prev, to: e.target.value }))} />
          </label>
          <label>
            Yon
            <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value as "" | AccountTransferDirection)}>
              <option value="">Hepsi</option>
              <option value="VADELI_TO_TL">Vadeli → TL</option>
              <option value="TL_TO_VADELI">TL → Vadeli</option>
            </select>
          </label>
        </div>

        <p className="small compact-row-top-gap">
          Kayit: <b>{filteredRows.length}</b> | Vadeli→TL giris: <b>{formatTry(totalIn)}</b> | TL→Vadeli cikis:{" "}
          <b>{formatTry(totalOut)}</b>
        </p>

        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tip</th>
                <th>Yon</th>
                <th className="col-num">Tutar</th>
                <th>Referans</th>
                <th>Aciklama</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Virman kaydi bulunmuyor.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={`${row.movementType}-${row.id}`}>
                    <td>{formatDateTr(row.occurredAt)}</td>
                    <td>{row.movementType === "PAYMENT" ? "Giris (TL)" : "Cikis (TL)"}</td>
                    <td>{row.directionLabel}</td>
                    <td className="col-num">{formatTry(row.amount)}</td>
                    <td>{row.reference ?? "-"}</td>
                    <td className="unclassified-col-ellipsis" title={row.description}>
                      {row.description}
                    </td>
                    <td>
                      <span className="truncate-cell truncate-id" title={row.id}>
                        {row.id}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
