import { formatDateTimeTr, type AdminActionLogRow } from "../../app/shared";

type AuditLogsPageProps = {
  actionLogs: AdminActionLogRow[];
  fetchActionLogs: () => Promise<void>;
};

export function AuditLogsPage({ actionLogs, fetchActionLogs }: AuditLogsPageProps) {
  return (
    <section className="dashboard">
      <div className="card table-card">
        <div className="compact-row">
          <h3>Islem Gecmisi (Audit)</h3>
          <button className="btn btn-ghost" type="button" onClick={() => void fetchActionLogs()}>
            Yenile
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Kullanici</th>
                <th>Varlik</th>
                <th>Islem</th>
                <th>Varlik ID</th>
              </tr>
            </thead>
            <tbody>
              {actionLogs.map((row) => (
                <tr key={row.id}>
                  <td>{formatDateTimeTr(row.createdAt)}</td>
                  <td>{row.actorName ?? row.actorEmail ?? row.actorUserId ?? "-"}</td>
                  <td>{row.entityType}</td>
                  <td>{row.actionType}</td>
                  <td>{row.entityId}</td>
                </tr>
              ))}
              {actionLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    Islem kaydi yok
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
