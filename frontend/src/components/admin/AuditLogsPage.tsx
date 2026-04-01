import { useMemo, useState } from "react";
import { formatDateTimeTr, type AdminActionLogRow } from "../../app/shared";

type AuditLogsPageProps = {
  actionLogs: AdminActionLogRow[];
  fetchActionLogs: () => Promise<void>;
};

export function AuditLogsPage({ actionLogs, fetchActionLogs }: AuditLogsPageProps) {
  const [searchText, setSearchText] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState<"ALL" | AdminActionLogRow["actionType"]>("ALL");
  const [entityTypeFilter, setEntityTypeFilter] = useState<"ALL" | AdminActionLogRow["entityType"]>("ALL");
  const [actorFilter, setActorFilter] = useState<"ALL" | string>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [undoStateFilter, setUndoStateFilter] = useState<"ALL" | "UNDOABLE" | "UNDONE">("ALL");

  const actorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of actionLogs) {
      const actorLabel = row.actorName ?? row.actorEmail ?? row.actorUserId ?? "-";
      set.add(actorLabel);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "tr", { sensitivity: "base" }));
  }, [actionLogs]);

  const filteredLogs = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase("tr");
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;

    return actionLogs.filter((row) => {
      if (actionTypeFilter !== "ALL" && row.actionType !== actionTypeFilter) {
        return false;
      }

      if (entityTypeFilter !== "ALL" && row.entityType !== entityTypeFilter) {
        return false;
      }

      const actorLabel = row.actorName ?? row.actorEmail ?? row.actorUserId ?? "-";
      if (actorFilter !== "ALL" && actorLabel !== actorFilter) {
        return false;
      }

      if (undoStateFilter === "UNDOABLE" && !row.canUndo) {
        return false;
      }

      if (undoStateFilter === "UNDONE" && !row.undoneAt) {
        return false;
      }

      const createdAtTime = new Date(row.createdAt).getTime();
      if (from !== null && createdAtTime < from) {
        return false;
      }

      if (to !== null && createdAtTime > to) {
        return false;
      }

      if (!query) {
        return true;
      }

      const beforeText = row.before == null ? "" : JSON.stringify(row.before);
      const afterText = row.after == null ? "" : JSON.stringify(row.after);

      return [
        row.entityId,
        row.entityType,
        row.actionType,
        actorLabel,
        row.actorEmail ?? "",
        row.actorUserId ?? "",
        beforeText,
        afterText,
      ]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(query);
    });
  }, [actionLogs, actionTypeFilter, entityTypeFilter, actorFilter, fromDate, toDate, undoStateFilter, searchText]);

  const undoableCount = filteredLogs.filter((x) => x.canUndo).length;
  const undoneCount = filteredLogs.filter((x) => Boolean(x.undoneAt)).length;

  function summarizeSnapshot(value: unknown): string {
    if (value == null) {
      return "-";
    }

    const text = typeof value === "string" ? value : JSON.stringify(value);
    if (text.length <= 90) {
      return text;
    }
    return `${text.slice(0, 90)}...`;
  }

  function clearFilters(): void {
    setSearchText("");
    setActionTypeFilter("ALL");
    setEntityTypeFilter("ALL");
    setActorFilter("ALL");
    setFromDate("");
    setToDate("");
    setUndoStateFilter("ALL");
  }

  return (
    <section className="dashboard report-page">
      <div className="card table-card report-page-card">
        <div className="compact-row section-head">
          <h3>Islem Gecmisi (Audit)</h3>
          <div className="admin-row">
            <button className="btn btn-primary btn-run" type="button" onClick={() => void fetchActionLogs()}>
              Yenile
            </button>
            <button className="btn btn-ghost" type="button" onClick={clearFilters}>Temizle</button>
          </div>
        </div>

        <div className="report-filter-grid compact-row-top-gap">
          <label>
            Arama
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Kullanici, varlik id, before/after..."
            />
          </label>
          <label>
            Islem Tipi
            <select value={actionTypeFilter} onChange={(event) => setActionTypeFilter(event.target.value as typeof actionTypeFilter)}>
              <option value="ALL">Tum Islem Tipleri</option>
              <option value="EDIT">EDIT</option>
              <option value="DELETE">DELETE</option>
              <option value="UNDO">UNDO</option>
            </select>
          </label>
          <label>
            Varlik Tipi
            <select value={entityTypeFilter} onChange={(event) => setEntityTypeFilter(event.target.value as typeof entityTypeFilter)}>
              <option value="ALL">Tum Varlik Tipleri</option>
              <option value="PAYMENT">PAYMENT</option>
              <option value="EXPENSE">EXPENSE</option>
            </select>
          </label>
          <label>
            Kullanici
            <select value={actorFilter} onChange={(event) => setActorFilter(event.target.value)}>
              <option value="ALL">Tum Kullanici</option>
              {actorOptions.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </label>
          <label>
            Baslangic
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label>
            Bitis
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
          <label>
            Undo Durumu
            <select value={undoStateFilter} onChange={(event) => setUndoStateFilter(event.target.value as typeof undoStateFilter)}>
              <option value="ALL">Tum Durumlar</option>
              <option value="UNDOABLE">Geri Alinabilir</option>
              <option value="UNDONE">Geri Alinmis</option>
            </select>
          </label>
        </div>

        <div className="stats-grid compact-row-top-gap audit-log-stats-grid">
          <article className="card stat stat-tone-info">
            <h4>Gosterilen Kayit</h4>
            <p>{filteredLogs.length}</p>
            <span className="small">Toplam: {actionLogs.length}</span>
          </article>
          <article className="card stat stat-tone-good">
            <h4>Geri Alinabilir</h4>
            <p>{undoableCount}</p>
            <span className="small">Filtreye gore</span>
          </article>
          <article className="card stat stat-tone-warn">
            <h4>Geri Alinmis</h4>
            <p>{undoneCount}</p>
            <span className="small">Filtreye gore</span>
          </article>
        </div>

        <div className="table-wrap">
          <table className="apartment-list-table report-compact-table audit-log-table compact-row-top-gap">
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Kullanici</th>
                <th>Varlik</th>
                <th>Islem</th>
                <th>Varlik ID</th>
                <th>Undo Durumu</th>
                <th>Undo Bitis</th>
                <th>Once (Ozet)</th>
                <th>Sonra (Ozet)</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((row) => {
                const actorLabel = row.actorName ?? row.actorEmail ?? row.actorUserId ?? "-";
                return (
                <tr key={row.id}>
                  <td>{formatDateTimeTr(row.createdAt)}</td>
                  <td title={row.actorEmail ?? row.actorUserId ?? actorLabel}>{actorLabel}</td>
                  <td>{row.entityType}</td>
                  <td>{row.actionType}</td>
                  <td>{row.entityId}</td>
                  <td>{row.undoneAt ? "Geri Alinmis" : row.canUndo ? "Geri Alinabilir" : "Kapali"}</td>
                  <td>{row.undoUntil ? formatDateTimeTr(row.undoUntil) : "-"}</td>
                  <td className="audit-log-json-cell" title={row.before == null ? "-" : JSON.stringify(row.before)}>
                    {summarizeSnapshot(row.before)}
                  </td>
                  <td className="audit-log-json-cell" title={row.after == null ? "-" : JSON.stringify(row.after)}>
                    {summarizeSnapshot(row.after)}
                  </td>
                </tr>
              );})}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">
                    Filtreye uygun islem kaydi yok
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
