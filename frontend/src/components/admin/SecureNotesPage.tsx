import { useEffect, useRef, useState } from "react";
import { apiBase } from "../../app/shared";

interface SecureNoteRow {
  id: string;
  label: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface RevealedNote {
  id: string;
  label: string;
  content: string;
}

export function SecureNotesPage() {
  const [notes, setNotes] = useState<SecureNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [revealed, setRevealed] = useState<RevealedNote | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", content: "", sortOrder: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  function showMsg(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3500);
  }

  async function loadNotes() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/secure-notes`, { credentials: "include" });
      if (!res.ok) throw new Error("Yuklenemedi");
      const data = await res.json();
      setNotes(data.notes ?? []);
    } catch {
      showMsg("Notlar yuklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotes();
  }, []);

  async function handleReveal(id: string) {
    if (revealed?.id === id) {
      setRevealed(null);
      return;
    }
    setRevealingId(id);
    try {
      const res = await fetch(`${apiBase}/api/admin/secure-notes/${id}/reveal`, { credentials: "include" });
      if (!res.ok) throw new Error("Acilamadi");
      const data = await res.json();
      setRevealed(data);
    } catch {
      showMsg("Not acilamadi");
    } finally {
      setRevealingId(null);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({ label: "", content: "", sortOrder: notes.length });
    setShowForm(true);
    setRevealed(null);
  }

  function openEdit(note: SecureNoteRow) {
    setEditingId(note.id);
    setForm({ label: note.label, content: "", sortOrder: note.sortOrder });
    setShowForm(true);
    setRevealed(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim()) return showMsg("Baslik gerekli");
    if (!editingId && !form.content.trim()) return showMsg("Icerik gerekli");
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { label: form.label, sortOrder: form.sortOrder };
      if (form.content.trim()) payload.content = form.content;

      const url = editingId
        ? `${apiBase}/api/admin/secure-notes/${editingId}`
        : `${apiBase}/api/admin/secure-notes`;
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Kayit basarisiz");
      setShowForm(false);
      setEditingId(null);
      setRevealed(null);
      await loadNotes();
      showMsg(editingId ? "Not guncellendi" : "Not eklendi");
    } catch {
      showMsg("Kayit sirasinda hata olustu");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Bu notu silmek istediginizden emin misiniz?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${apiBase}/api/admin/secure-notes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Silinemedi");
      if (revealed?.id === id) setRevealed(null);
      await loadNotes();
      showMsg("Not silindi");
    } catch {
      showMsg("Silme basarisiz");
    } finally {
      setDeletingId(null);
    }
  }

  function handleCopyRevealed() {
    if (!revealed?.content) return;
    navigator.clipboard.writeText(revealed.content).then(() => showMsg("Kopyalandi"));
  }

  return (
    <section className="dashboard">
      <div className="card table-card">
        <div className="section-head">
          <h3>🔒 Sifireli Guvenli Notlar</h3>
          <button className="btn btn-primary" type="button" onClick={openCreate}>
            + Yeni Not
          </button>
        </div>

        {message && <p className="small" style={{ color: "var(--color-accent, #e05)" }}>{message}</p>}

        {showForm && (
          <form className="card" style={{ marginBottom: "1rem" }} onSubmit={handleSubmit}>
            <h4 style={{ marginBottom: "0.5rem" }}>{editingId ? "Notu Duzenle" : "Yeni Not Ekle"}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label className="small">
                Baslik
                <input
                  className="form-input"
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Ornegin: İşbank Firma Kodları"
                  maxLength={200}
                  required
                />
              </label>
              <label className="small">
                Icerik {editingId && <span style={{ opacity: 0.6 }}>(bos birakirsaniz icerik degismez)</span>}
                <textarea
                  ref={contentRef}
                  className="form-input"
                  style={{ minHeight: "120px", fontFamily: "monospace", fontSize: "0.9rem" }}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Saklamak istediginiz bilgiler..."
                  maxLength={5000}
                />
              </label>
              <label className="small">
                Siralama
                <input
                  className="form-input"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  style={{ width: "80px" }}
                />
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? "Kaydediliyor..." : "Kaydet"}
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                >
                  Iptal
                </button>
              </div>
            </div>
          </form>
        )}

        {loading && <p className="small">Yukleniyor...</p>}

        {!loading && notes.length === 0 && (
          <p className="small" style={{ opacity: 0.6 }}>Henuz guvenli not eklenmemis.</p>
        )}

        {!loading && notes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {notes.map((note) => (
              <div
                key={note.id}
                className="card"
                style={{ padding: "0.75rem 1rem", borderLeft: "4px solid var(--color-primary, #3b82f6)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <strong>{note.label}</strong>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      type="button"
                      onClick={() => handleReveal(note.id)}
                      disabled={revealingId === note.id}
                    >
                      {revealingId === note.id ? "..." : revealed?.id === note.id ? "🙈 Gizle" : "👁 Goster"}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => openEdit(note)}
                    >
                      ✏️ Duzenle
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      disabled={deletingId === note.id}
                    >
                      {deletingId === note.id ? "..." : "🗑 Sil"}
                    </button>
                  </div>
                </div>

                {revealed?.id === note.id && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <span className="small" style={{ opacity: 0.6 }}>Icerik (sifre cozuldu)</span>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={handleCopyRevealed}>
                        📋 Kopyala
                      </button>
                    </div>
                    <pre
                      style={{
                        background: "var(--color-bg-alt, #f5f5f5)",
                        borderRadius: "6px",
                        padding: "0.75rem",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "monospace",
                        fontSize: "0.9rem",
                        margin: 0,
                      }}
                    >
                      {revealed.content}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
