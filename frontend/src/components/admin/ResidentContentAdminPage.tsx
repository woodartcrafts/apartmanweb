import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  apiBase,
  formatDateTr,
  isoToDateInput,
  type AdminResidentAnnouncementRow,
  type AdminResidentPollRow,
} from "../../app/shared";

type ResidentAnnouncementFormState = {
  title: string;
  content: string;
  publishAt: string;
  expiresAt: string;
  isActive: boolean;
};

type ResidentPollFormState = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  allowMultiple: boolean;
  isActive: boolean;
  optionsText: string;
};

const initialAnnouncementFormState: ResidentAnnouncementFormState = {
  title: "",
  content: "",
  publishAt: "",
  expiresAt: "",
  isActive: true,
};

const initialPollFormState: ResidentPollFormState = {
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  allowMultiple: false,
  isActive: true,
  optionsText: "Evet\nHayir",
};

export function ResidentContentAdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const saveNoticeTimerRef = useRef<number | null>(null);
  const [announcementRows, setAnnouncementRows] = useState<AdminResidentAnnouncementRow[]>([]);
  const [pollRows, setPollRows] = useState<AdminResidentPollRow[]>([]);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [announcementForm, setAnnouncementForm] = useState<ResidentAnnouncementFormState>(initialAnnouncementFormState);
  const [pollForm, setPollForm] = useState<ResidentPollFormState>(initialPollFormState);

  const residentContentStats = useMemo(() => {
    const activeAnnouncementCount = announcementRows.filter((x) => x.isActive).length;
    const activePollCount = pollRows.filter((x) => x.isActive).length;
    const totalVoteCount = pollRows.reduce((sum, x) => sum + x.totalVotes, 0);
    const totalPollOptionCount = pollRows.reduce((sum, x) => sum + x.options.length, 0);

    return {
      totalAnnouncementCount: announcementRows.length,
      activeAnnouncementCount,
      totalPollCount: pollRows.length,
      activePollCount,
      totalVoteCount,
      totalPollOptionCount,
    };
  }, [announcementRows, pollRows]);

  const adminRequest = useCallback(async <T,>(
    endpoint: string,
    options?: { method?: "GET" | "POST" | "PUT" | "DELETE"; payload?: unknown }
  ): Promise<T> => {
    const method = options?.method ?? "GET";
    const payload = options?.payload;

    const response = await fetch(`${apiBase}${endpoint}`, {
      method,
      headers: {
        ...(payload ? { "Content-Type": "application/json" } : {}),
      },
      credentials: "include",
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as { message?: string };
      if (response.status === 401) {
        throw new Error("Oturum gecersiz veya suresi dolmus. Lutfen tekrar giris yapin");
      }
      throw new Error(errorBody.message ?? "Istek basarisiz");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }, []);

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [announcements, polls] = await Promise.all([
        adminRequest<AdminResidentAnnouncementRow[]>("/api/admin/resident-content/announcements"),
        adminRequest<AdminResidentPollRow[]>("/api/admin/resident-content/polls"),
      ]);
      setAnnouncementRows(announcements);
      setPollRows(polls);
      setMessage("");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Duyuru/anket verileri alinamadi");
    } finally {
      setLoading(false);
    }
  }, [adminRequest]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (saveNoticeTimerRef.current !== null) {
        window.clearTimeout(saveNoticeTimerRef.current);
      }
    };
  }, []);

  function showSaveNotice(text: string): void {
    setSaveNotice(text);
    if (saveNoticeTimerRef.current !== null) {
      window.clearTimeout(saveNoticeTimerRef.current);
    }
    saveNoticeTimerRef.current = window.setTimeout(() => {
      setSaveNotice("");
      saveNoticeTimerRef.current = null;
    }, 3000);
  }

  async function onSubmitResidentAnnouncement(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const title = String(formData.get("title") ?? "").trim();
      const content = String(formData.get("content") ?? "").trim();
      const publishAtRaw = String(formData.get("publishAt") ?? "").trim();
      const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
      const isActive = formData.get("isActive") === "on";

      const payload = {
        title,
        content,
        isActive,
        publishAt: publishAtRaw ? new Date(`${publishAtRaw}T00:00:00.000Z`).toISOString() : undefined,
        expiresAt: expiresAtRaw ? new Date(`${expiresAtRaw}T23:59:59.000Z`).toISOString() : null,
      };

      if (editingAnnouncementId) {
        await adminRequest(`/api/admin/resident-content/announcements/${editingAnnouncementId}`, {
          method: "PUT",
          payload,
        });
      } else {
        await adminRequest("/api/admin/resident-content/announcements", {
          method: "POST",
          payload,
        });
      }

      await fetchData();
      setEditingAnnouncementId(null);
      setAnnouncementForm(initialAnnouncementFormState);
      setMessage(editingAnnouncementId ? "Duyuru guncellendi" : "Duyuru eklendi");
      showSaveNotice(editingAnnouncementId ? "Duyuru guncellendi" : "Duyuru eklendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Duyuru kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  function startEditResidentAnnouncement(row: AdminResidentAnnouncementRow): void {
    setEditingAnnouncementId(row.id);
    setAnnouncementForm({
      title: row.title,
      content: row.content,
      publishAt: isoToDateInput(row.publishAt),
      expiresAt: row.expiresAt ? isoToDateInput(row.expiresAt) : "",
      isActive: row.isActive,
    });
  }

  function cancelEditResidentAnnouncement(): void {
    setEditingAnnouncementId(null);
    setAnnouncementForm(initialAnnouncementFormState);
  }

  async function deleteResidentAnnouncement(row: AdminResidentAnnouncementRow): Promise<void> {
    const accepted = window.confirm("Bu duyuru silinsin mi?");
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      await adminRequest(`/api/admin/resident-content/announcements/${row.id}`, {
        method: "DELETE",
      });

      if (editingAnnouncementId === row.id) {
        setEditingAnnouncementId(null);
        setAnnouncementForm(initialAnnouncementFormState);
      }

      await fetchData();
      setMessage("Duyuru silindi");
      showSaveNotice("Duyuru silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Duyuru silinemedi");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitResidentPoll(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const title = String(formData.get("title") ?? "").trim();
      const description = String(formData.get("description") ?? "").trim();
      const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
      const endsAtRaw = String(formData.get("endsAt") ?? "").trim();
      const allowMultiple = formData.get("allowMultiple") === "on";
      const isActive = formData.get("isActive") === "on";

      if (editingPollId) {
        await adminRequest(`/api/admin/resident-content/polls/${editingPollId}`, {
          method: "PUT",
          payload: {
            title,
            description: description || null,
            allowMultiple,
            isActive,
            startsAt: startsAtRaw ? new Date(`${startsAtRaw}T00:00:00.000Z`).toISOString() : undefined,
            endsAt: endsAtRaw ? new Date(`${endsAtRaw}T23:59:59.000Z`).toISOString() : null,
          },
        });
      } else {
        const optionsText = String(formData.get("optionsText") ?? "");
        const options = optionsText
          .split(/\r?\n/)
          .map((x) => x.trim())
          .filter(Boolean);

        await adminRequest("/api/admin/resident-content/polls", {
          method: "POST",
          payload: {
            title,
            description: description || undefined,
            allowMultiple,
            isActive,
            startsAt: startsAtRaw ? new Date(`${startsAtRaw}T00:00:00.000Z`).toISOString() : undefined,
            endsAt: endsAtRaw ? new Date(`${endsAtRaw}T23:59:59.000Z`).toISOString() : null,
            options,
          },
        });
      }

      await fetchData();
      setEditingPollId(null);
      setPollForm(initialPollFormState);
      setMessage(editingPollId ? "Anket guncellendi" : "Anket eklendi");
      showSaveNotice(editingPollId ? "Anket guncellendi" : "Anket eklendi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Anket kaydedilemedi");
    } finally {
      setLoading(false);
    }
  }

  function startEditResidentPoll(row: AdminResidentPollRow): void {
    setEditingPollId(row.id);
    setPollForm({
      title: row.title,
      description: row.description ?? "",
      startsAt: isoToDateInput(row.startsAt),
      endsAt: row.endsAt ? isoToDateInput(row.endsAt) : "",
      allowMultiple: row.allowMultiple,
      isActive: row.isActive,
      optionsText: row.options.map((x) => x.text).join("\n"),
    });
  }

  function cancelEditResidentPoll(): void {
    setEditingPollId(null);
    setPollForm(initialPollFormState);
  }

  async function deleteResidentPoll(row: AdminResidentPollRow): Promise<void> {
    const accepted = window.confirm("Bu anket silinsin mi?");
    if (!accepted) {
      return;
    }

    setLoading(true);
    try {
      await adminRequest(`/api/admin/resident-content/polls/${row.id}`, {
        method: "DELETE",
      });

      if (editingPollId === row.id) {
        setEditingPollId(null);
        setPollForm(initialPollFormState);
      }

      await fetchData();
      setMessage("Anket silindi");
      showSaveNotice("Anket silindi");
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Anket silinemedi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="dashboard report-page resident-content-admin-page">
      {saveNotice && (
        <div className="blocking-modal" role="status" aria-live="polite" aria-busy="false">
          <div className="blocking-modal-card save-notice-modal-card">
            <div className="save-notice-icon" aria-hidden="true">
              ✓
            </div>
            <h3>Islem Tamamlandi</h3>
            <p className="small">{saveNotice}</p>
          </div>
        </div>
      )}

      <div className="card table-card report-page-card resident-content-hero-card">
        <div className="section-head report-toolbar">
          <h3 className="resident-content-title-with-icon">
            <span className="resident-content-title-icon" aria-hidden="true">IC</span>
            Duyurular ve Anketler
          </h3>
          <button className="btn btn-ghost" type="button" onClick={() => void fetchData()} disabled={loading}>
            Yenile
          </button>
        </div>
        <div className="resident-content-hero-layout compact-row-top-gap">
          <div className="resident-content-hero-copy">
            <p className="small">
              Admin bu ekrandan duyuru ve anket olusturur; resident panelde yayinda olanlar gorunur.
            </p>
            {message && <p className="small resident-content-inline-message">{message}</p>}
          </div>
          <div className="resident-content-hero-visual" aria-hidden="true">
            <div className="resident-content-visual-card resident-content-visual-ann">
              <span className="resident-content-visual-chip">DUYURU</span>
            </div>
            <div className="resident-content-visual-card resident-content-visual-poll">
              <span className="resident-content-visual-chip">ANKET</span>
            </div>
          </div>
        </div>

        <div className="stats-grid resident-content-stats-grid compact-row-top-gap">
          <article className="card stat stat-tone-info">
            <h4>Toplam Duyuru</h4>
            <p>{residentContentStats.totalAnnouncementCount}</p>
            <span className="small">Aktif: {residentContentStats.activeAnnouncementCount}</span>
          </article>
          <article className="card stat stat-tone-good">
            <h4>Toplam Anket</h4>
            <p>{residentContentStats.totalPollCount}</p>
            <span className="small">Aktif: {residentContentStats.activePollCount}</span>
          </article>
          <article className="card stat stat-tone-warn">
            <h4>Toplam Oy</h4>
            <p>{residentContentStats.totalVoteCount}</p>
            <span className="small">Tum anketlerden</span>
          </article>
          <article className="card stat stat-tone-danger">
            <h4>Secenek Adedi</h4>
            <p>{residentContentStats.totalPollOptionCount}</p>
            <span className="small">Tum anket secenekleri</span>
          </article>
        </div>
      </div>

      <div className="admin-forms-grid resident-content-forms-grid">
        <form
          key={`ann-form-${editingAnnouncementId ?? "new"}-${announcementForm.title}-${announcementForm.publishAt}-${announcementForm.expiresAt}-${announcementForm.isActive ? "1" : "0"}`}
          className="card admin-form"
          onSubmit={onSubmitResidentAnnouncement}
        >
          <div className="section-head">
            <h3 className="resident-content-form-title">
              <span className="resident-content-form-icon" aria-hidden="true">DU</span>
              {editingAnnouncementId ? "Duyuru Duzenle" : "Duyuru Ekle"}
            </h3>
            <div className="admin-row">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {editingAnnouncementId ? "Guncelle" : "Ekle"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={cancelEditResidentAnnouncement}>Temizle</button>
            </div>
          </div>
          <label>
            Baslik
            <input name="title" defaultValue={announcementForm.title} required />
          </label>
          <label>
            Icerik
            <textarea name="content" rows={4} defaultValue={announcementForm.content} required />
          </label>
          <div className="compact-row">
            <label>
              Yayin Tarihi
              <input name="publishAt" type="date" defaultValue={announcementForm.publishAt} />
            </label>
            <label>
              Bitis Tarihi
              <input name="expiresAt" type="date" defaultValue={announcementForm.expiresAt} />
            </label>
          </div>
          <label className="checkbox-row">
            <input name="isActive" type="checkbox" defaultChecked={announcementForm.isActive} />
            Aktif
          </label>
        </form>

        <form
          key={`poll-form-${editingPollId ?? "new"}-${pollForm.title}-${pollForm.startsAt}-${pollForm.endsAt}-${pollForm.allowMultiple ? "1" : "0"}-${pollForm.isActive ? "1" : "0"}`}
          className="card admin-form"
          onSubmit={onSubmitResidentPoll}
        >
          <div className="section-head">
            <h3 className="resident-content-form-title">
              <span className="resident-content-form-icon" aria-hidden="true">AN</span>
              {editingPollId ? "Anket Duzenle" : "Anket Ekle"}
            </h3>
            <div className="admin-row">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {editingPollId ? "Guncelle" : "Ekle"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={cancelEditResidentPoll}>Temizle</button>
            </div>
          </div>
          <label>
            Baslik
            <input name="title" defaultValue={pollForm.title} required />
          </label>
          <label>
            Aciklama
            <textarea name="description" rows={3} defaultValue={pollForm.description} />
          </label>
          <div className="compact-row">
            <label>
              Baslangic Tarihi
              <input name="startsAt" type="date" defaultValue={pollForm.startsAt} />
            </label>
            <label>
              Bitis Tarihi
              <input name="endsAt" type="date" defaultValue={pollForm.endsAt} />
            </label>
          </div>
          <label className="checkbox-row">
            <input name="allowMultiple" type="checkbox" defaultChecked={pollForm.allowMultiple} />
            Coklu secime izin ver
          </label>
          <label className="checkbox-row">
            <input name="isActive" type="checkbox" defaultChecked={pollForm.isActive} />
            Aktif
          </label>
          {!editingPollId && (
            <label>
              Secenekler (satir satir)
              <textarea name="optionsText" rows={4} defaultValue={pollForm.optionsText} required />
            </label>
          )}
        </form>
      </div>

      <div className="card table-card report-page-card resident-content-list-card">
        <div className="section-head">
          <h3 className="resident-content-title-with-icon">
            <span className="resident-content-title-icon" aria-hidden="true">DL</span>
            Duyuru Listesi
          </h3>
          <span className="small resident-content-count-pill">{announcementRows.length} kayit</span>
        </div>
        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table resident-content-table">
            <thead>
              <tr>
                <th>Baslik</th>
                <th>Icerik</th>
                <th>Yayin</th>
                <th>Bitis</th>
                <th>Durum</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {announcementRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>{row.content}</td>
                  <td>{formatDateTr(row.publishAt)}</td>
                  <td>{row.expiresAt ? formatDateTr(row.expiresAt) : "-"}</td>
                  <td>{row.isActive ? "Aktif" : "Pasif"}</td>
                  <td className="actions-cell">
                    <button className="btn btn-ghost" type="button" onClick={() => startEditResidentAnnouncement(row)}>
                      Duzenle
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => void deleteResidentAnnouncement(row)}>
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {announcementRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    Duyuru yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card table-card report-page-card resident-content-list-card">
        <div className="section-head">
          <h3 className="resident-content-title-with-icon">
            <span className="resident-content-title-icon" aria-hidden="true">AL</span>
            Anket Listesi
          </h3>
          <span className="small resident-content-count-pill">{pollRows.length} kayit</span>
        </div>
        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table resident-content-table">
            <thead>
              <tr>
                <th>Baslik</th>
                <th>Secenekler</th>
                <th>Oy</th>
                <th>Coklu</th>
                <th>Durum</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {pollRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>{row.options.map((x) => `${x.text} (${x.voteCount})`).join(" | ")}</td>
                  <td className="col-num">{row.totalVotes}</td>
                  <td>{row.allowMultiple ? "Evet" : "Hayir"}</td>
                  <td>{row.isActive ? "Aktif" : "Pasif"}</td>
                  <td className="actions-cell">
                    <button className="btn btn-ghost" type="button" onClick={() => startEditResidentPoll(row)}>
                      Duzenle
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => void deleteResidentPoll(row)}>
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {pollRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    Anket yok
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
