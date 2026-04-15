import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  apiBase,
  formatDateTr,
  formatTry,
  type LoginResponse,
  type StatementItem,
  type AccountingStatementItem,
  type StatementResponse,
  type StatementViewMode,
  type ResidentAnnouncementItem,
  type ResidentPollItem,
  type ResidentEngagementResponse,
  type ResidentExpenseReportResponse,
} from "../app/shared";

function ResidentPage({
  user,
  onResidentDoorNo,
  onSessionExpired,
}: {
  user: LoginResponse["user"] | null;
  onResidentDoorNo: (doorNo: string) => void;
  onSessionExpired: () => void;
}) {
  const [statement, setStatement] = useState<StatementItem[]>([]);
  const [accountingStatement, setAccountingStatement] = useState<AccountingStatementItem[]>([]);
  const [announcements, setAnnouncements] = useState<ResidentAnnouncementItem[]>([]);
  const [polls, setPolls] = useState<ResidentPollItem[]>([]);
  const [pollSelections, setPollSelections] = useState<Record<string, string[]>>({});
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [statementViewMode, setStatementViewMode] = useState<StatementViewMode>("CLASSIC");
  const [expenseReport, setExpenseReport] = useState<ResidentExpenseReportResponse | null>(null);
  const [expenseReportLoading, setExpenseReportLoading] = useState(false);
  const [selectedExpenseItemId, setSelectedExpenseItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Resident panel hazir");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordPanelOpen, setPasswordPanelOpen] = useState(false);

  const totals = useMemo(() => {
    const amount = statement.reduce((sum, row) => sum + row.amount, 0);
    const paid = statement.reduce((sum, row) => sum + row.paidTotal, 0);
    return { amount, paid, remaining: amount - paid };
  }, [statement]);

  const overdueStatementTotals = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let overdueRemaining = 0;
    let overdueCount = 0;

    for (const row of statement) {
      if (row.remaining <= 0) {
        continue;
      }

      const dueAt = new Date(row.dueDate).getTime();
      if (!Number.isFinite(dueAt) || dueAt >= todayStart) {
        continue;
      }

      overdueRemaining += row.remaining;
      overdueCount += 1;
    }

    return {
      remaining: Number(overdueRemaining.toFixed(2)),
      count: overdueCount,
    };
  }, [statement]);

  const sortedStatement = useMemo(
    () => [...statement].sort((a, b) => a.periodYear - b.periodYear || a.periodMonth - b.periodMonth),
    [statement]
  );

  const accountingTotals = useMemo(() => {
    const debit = accountingStatement.reduce((sum, row) => sum + row.debit, 0);
    const credit = accountingStatement.reduce((sum, row) => sum + row.credit, 0);
    return { debit, credit, balance: debit - credit };
  }, [accountingStatement]);

  const sortedAccountingStatement = useMemo(
    () =>
      [...accountingStatement].sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) {
          return dateDiff;
        }
        return a.movementId.localeCompare(b.movementId);
      }),
    [accountingStatement]
  );

  const selectedExpenseItem = useMemo(
    () => expenseReport?.topItems.find((item) => item.expenseItemId === selectedExpenseItemId) ?? null,
    [expenseReport, selectedExpenseItemId]
  );

  const selectedExpenseRows = useMemo(() => {
    if (!expenseReport || !selectedExpenseItemId) {
      return [];
    }
    return expenseReport.rows.filter((row) => row.expenseItemId === selectedExpenseItemId);
  }, [expenseReport, selectedExpenseItemId]);

  async function fetchMyStatement(): Promise<void> {
    if (!user?.apartmentId) {
      setStatement([]);
      setAccountingStatement([]);
      setMessage("Hesabiniza daire baglantisi tanimli degil. Yoneticiniz ile iletisime gecin.");
      return;
    }

    setLoading(true);
    setMessage("Ekstre yukleniyor...");
    try {
      const res = await fetch(`${apiBase}/api/resident/me/statement`, {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) { onSessionExpired(); return; }
        const errBody = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errBody.message ?? "Ekstre alinamadi");
      }

      const data = (await res.json()) as StatementResponse;
      if (user?.role === "RESIDENT" && typeof data.apartmentDoorNo === "string") {
        const nextDoorNo = data.apartmentDoorNo.trim();
        if (nextDoorNo) {
          onResidentDoorNo(nextDoorNo);
        }
      }
      setStatement(data.statement);
      setAccountingStatement(data.accountingStatement ?? []);
      setMessage(`Ekstre hazir: ${data.statement.length} satir`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Ekstre cekilirken hata olustu");
    } finally {
      setLoading(false);
    }
  }

  async function fetchResidentEngagement(): Promise<void> {
    try {
      const res = await fetch(`${apiBase}/api/resident/me/engagement`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) { onSessionExpired(); return; }
        throw new Error("Duyuru ve anketler alinamadi");
      }

      const data = (await res.json()) as ResidentEngagementResponse;
      setAnnouncements(data.announcements);
      setPolls(data.polls);
      setPollSelections(
        data.polls.reduce<Record<string, string[]>>((acc, poll) => {
          acc[poll.id] = poll.myOptionIds;
          return acc;
        }, {})
      );
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Duyuru ve anketler alinamadi");
    }
  }

  async function fetchResidentExpensesReport(): Promise<void> {
    setExpenseReportLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");

      const res = await fetch(`${apiBase}/api/resident/me/expenses-report?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) { onSessionExpired(); return; }
        throw new Error("Gider raporu alinamadi");
      }

      const data = (await res.json()) as ResidentExpenseReportResponse;
      setExpenseReport(data);
      if (selectedExpenseItemId && !data.topItems.some((item) => item.expenseItemId === selectedExpenseItemId)) {
        setSelectedExpenseItemId(null);
      }
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Gider raporu alinamadi");
    } finally {
      setExpenseReportLoading(false);
    }
  }

  async function submitPollVote(poll: ResidentPollItem): Promise<void> {
    const selectedOptionIds = pollSelections[poll.id] ?? [];
    if (selectedOptionIds.length === 0) {
      setMessage("Oy kullanmak icin en az bir secenek secin");
      return;
    }

    setVotingPollId(poll.id);
    try {
      const res = await fetch(`${apiBase}/api/resident/me/polls/${poll.id}/vote`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ optionIds: selectedOptionIds }),
      });

      if (!res.ok) {
        if (res.status === 401) { onSessionExpired(); return; }
        const errBody = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errBody.message ?? "Oy kaydedilemedi");
      }

      await fetchResidentEngagement();
      setMessage("Oyunuz kaydedildi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Oy kaydedilemedi");
    } finally {
      setVotingPollId(null);
    }
  }

  async function handlePasswordChange(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage("Sifre alanlarini doldurun");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("Yeni sifre ve tekrar sifresi ayni olmali");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/resident/me/password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordForm),
      });

      if (!res.ok) {
        if (res.status === 401) { onSessionExpired(); return; }
        const errBody = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(errBody.message ?? "Sifre guncellenemedi");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordPanelOpen(false);
      setMessage("Sifreniz guncellendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Sifre guncellenemedi");
    } finally {
      setPasswordSaving(false);
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (user?.apartmentId) {
      void fetchMyStatement();
    } else {
      setStatement([]);
      setAccountingStatement([]);
      setMessage("Hesabiniza daire baglantisi tanimli degil. Yoneticiniz ile iletisime gecin.");
    }
    void fetchResidentEngagement();
    void fetchResidentExpensesReport();
  }, [user?.apartmentId]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <section className="dashboard resident-dashboard">
      <div className="card user-card resident-header-card">
        <h2>Resident Ekstre</h2>
        <div className="resident-header-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setPasswordPanelOpen((prev) => !prev)}
          >
            {passwordPanelOpen ? "Sifreyi Kapat" : "Sifre Degistir"}
          </button>
          <button className="btn btn-primary" onClick={() => void fetchMyStatement()} disabled={loading}>
            Yenile
          </button>
        </div>
      </div>

      {passwordPanelOpen && (
        <div className="card table-card resident-password-card">
          <h3>Sifre Degistir</h3>
          <form className="form-grid compact-row-top-gap" onSubmit={(e) => void handlePasswordChange(e)}>
            <label>
              Mevcut Sifre
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                placeholder="********"
                required
              />
            </label>
            <label>
              Yeni Sifre
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                placeholder="En az 8 karakter, harf ve rakam"
                required
              />
            </label>
            <label>
              Yeni Sifre (Tekrar)
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                placeholder="Yeni sifreyi tekrar girin"
                required
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
              {passwordSaving ? "Kaydediliyor..." : "Sifreyi Guncelle"}
            </button>
          </form>
        </div>
      )}

      <div className="stats-grid resident-stats-grid">
        {statementViewMode === "CLASSIC" ? (
          <>
            <article className="card stat">
              <h4>Toplam Borclandirilan</h4>
              <p>{formatTry(totals.amount)}</p>
            </article>
            <article className="card stat">
              <h4>Toplam Odenen</h4>
              <p>{formatTry(totals.paid)}</p>
            </article>
            <article className="card stat">
              <h4>Vadesi Gecmis Borc</h4>
              <p>{formatTry(overdueStatementTotals.remaining)}</p>
            </article>
            <article className="card stat">
              <h4>Kalan Bakiye</h4>
              <p>{formatTry(totals.remaining)}</p>
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

      <div className="card table-card resident-section-expense">
        {expenseReportLoading && <p className="small">Gider raporu yukleniyor...</p>}

        <section className="expense-report-summary compact-row-top-gap">
          <div className="expense-report-summary-head">
            <h4>
              Gider Kalemi Bazli Toplamlar
              {!selectedExpenseItemId && (
                <span className="small"> (Detayi gormek icin yukaridan bir gider kalemine tiklayin.)</span>
              )}
            </h4>
            <span className="small">
              Kalem: {expenseReport?.topItems.length ?? 0} | Toplam: {formatTry(expenseReport?.totalAmount ?? 0)} | Kayit: {expenseReport?.totalCount ?? 0}
            </span>
          </div>

          {expenseReport && expenseReport.topItems.length > 0 ? (
            <div className="table-wrap">
              <table className="apartment-list-table report-compact-table expense-report-summary-table">
                <thead>
                  <tr>
                    <th className="col-num">Sira</th>
                    <th>Gider Kalemi</th>
                    <th className="col-num">Kayit Adedi</th>
                    <th className="col-num">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseReport.topItems.map((item, index) => (
                    <tr key={item.expenseItemId}>
                      <td className="col-num">{index + 1}</td>
                      <td>
                        <button
                          type="button"
                          className={selectedExpenseItemId === item.expenseItemId ? "btn btn-primary" : "btn btn-ghost"}
                          onClick={() => setSelectedExpenseItemId(item.expenseItemId)}
                        >
                          {item.expenseItemName}
                        </button>
                      </td>
                      <td className="col-num">{item.expenseCount}</td>
                      <td className="col-num">{formatTry(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="expense-report-summary-total-row">
                    <td colSpan={3}>Gider Toplami</td>
                    <td className="col-num">{formatTry(expenseReport.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="small">Gider ozeti bulunmuyor.</p>
          )}
        </section>

        {selectedExpenseItemId && (
          <>
            <div className="section-head compact-row-top-gap">
              <h4>Detay: {selectedExpenseItem?.expenseItemName ?? "Kalem"}</h4>
              <button type="button" className="btn btn-ghost" onClick={() => setSelectedExpenseItemId(null)}>
                Detayi Kapat
              </button>
            </div>
            <div className="table-wrap compact-row-top-gap">
              <table className="apartment-list-table report-compact-table expense-report-table">
                <thead>
                  <tr>
                    <th>Gider Tarihi</th>
                    <th>Gider Kalemi</th>
                    <th>Odeme Araci</th>
                    <th className="col-num">Tutar</th>
                    <th>Aciklama</th>
                    <th>Referans</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedExpenseRows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDateTr(row.spentAt)}</td>
                      <td>{row.expenseItemName}</td>
                      <td>{row.paymentMethod}</td>
                      <td className="col-num">{formatTry(row.amount)}</td>
                      <td className="expense-report-description" title={row.description ?? "-"}>{row.description ?? "-"}</td>
                      <td>{row.reference ?? "-"}</td>
                    </tr>
                  ))}
                  {selectedExpenseRows.length === 0 && (
                    <tr>
                      <td className="empty" colSpan={6}>
                        Bu gider kalemi icin detay kaydi yok
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card table-card resident-section-statement">
        <div className="compact-row">
          <h3>Ekstre</h3>
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
            <table className="resident-classic-statement-table">
              <thead>
                <tr>
                  <th>Yil</th>
                  <th>Ay</th>
                  <th>Aciklama</th>
                  <th>Son Odeme Tarihi</th>
                  <th>Odenme Tarihi</th>
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
                    <td className="col-num">{formatTry(row.amount)}</td>
                    <td className="col-num">{formatTry(row.paidTotal)}</td>
                    <td className="col-num">{formatTry(row.remaining)}</td>
                    <td>{row.status}</td>
                    </tr>
                  );
                })}
                {statement.length === 0 && (
                  <tr>
                    <td colSpan={9} className="empty">
                      Henuz ekstre verisi yok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table>
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
                    <td>{row.description}</td>
                    <td className="col-num">{row.debit > 0 ? formatTry(row.debit) : "-"}</td>
                    <td className="col-num">{row.credit > 0 ? formatTry(row.credit) : "-"}</td>
                    <td className="col-num">{formatTry(row.balance)}</td>
                  </tr>
                ))}
                {accountingStatement.length === 0 && (
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

      <div className="card table-card resident-section-announcements">
        <div className="section-head">
          <h3>Duyurular</h3>
          <button className="btn btn-ghost" type="button" onClick={() => void fetchResidentEngagement()}>
            Yenile
          </button>
        </div>
        {announcements.length === 0 ? (
          <p className="small">Aktif duyuru bulunmuyor.</p>
        ) : (
          <div className="guide-list compact-row-top-gap">
            {announcements.map((item) => (
              <article key={item.id} className="card">
                <h4>{item.title}</h4>
                <p className="small">Yayin: {formatDateTr(item.publishAt)}</p>
                <p>{item.content}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="card table-card resident-section-polls">
        <h3>Anketler</h3>
        {polls.length === 0 ? (
          <p className="small">Aktif anket bulunmuyor.</p>
        ) : (
          <div className="guide-list compact-row-top-gap">
            {polls.map((poll) => {
              const selected = pollSelections[poll.id] ?? [];
              return (
                <article key={poll.id} className="card">
                  <h4>{poll.title}</h4>
                  {poll.description && <p className="small">{poll.description}</p>}
                  <p className="small">
                    Oy sayisi: {poll.totalVotes} | Tip: {poll.allowMultiple ? "Coklu secim" : "Tek secim"}
                  </p>
                  <div className="guide-list compact-row-top-gap">
                    {poll.options.map((option) => {
                      const checked = selected.includes(option.id);
                      return (
                        <label key={option.id} className="month-chip">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setPollSelections((prev) => {
                                const current = prev[poll.id] ?? [];
                                let next: string[];
                                if (poll.allowMultiple) {
                                  next = isChecked
                                    ? [...new Set([...current, option.id])]
                                    : current.filter((id) => id !== option.id);
                                } else {
                                  next = isChecked ? [option.id] : [];
                                }
                                return {
                                  ...prev,
                                  [poll.id]: next,
                                };
                              });
                            }}
                          />
                          {option.text} ({option.voteCount})
                        </label>
                      );
                    })}
                  </div>
                  <div className="admin-row compact-row-top-gap">
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={votingPollId === poll.id || selected.length === 0}
                      onClick={() => void submitPollVote(poll)}
                    >
                      {votingPollId === poll.id ? "Kaydediliyor..." : "Oyumu Kaydet"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <footer className="status-bar status-bar-fixed">{message}</footer>
    </section>
  );
}


export default ResidentPage;
