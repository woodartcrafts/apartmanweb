import { useState, useEffect, type FormEvent } from "react";
import { NavLink } from "react-router-dom";
import { type ApartmentOption } from "../../app/shared";

type Props = {
  loading: boolean;
  apartmentOptions: ApartmentOption[];
};

type ContactFields = {
  email1: string;
  email2: string;
  email3: string;
  email4: string;
  phone1: string;
  phone2: string;
  phone3: string;
  phone4: string;
};

const emptyFields: ContactFields = {
  email1: "",
  email2: "",
  email3: "",
  email4: "",
  phone1: "",
  phone2: "",
  phone3: "",
  phone4: "",
};

function normalizeBlockLabel(blockName: string): string {
  return blockName.replace(/\s*blok\s*$/i, "").trim();
}

export function StaffContactEditPage({ loading, apartmentOptions }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [fields, setFields] = useState<ContactFields>(emptyFields);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Secilen daire degisince alanlari doldur
  useEffect(() => {
    if (!selectedId) {
      setFields(emptyFields);
      setMessage(null);
      return;
    }
    const apt = apartmentOptions.find((a) => a.id === selectedId);
    if (!apt) return;
    setFields({
      email1: apt.email1 ?? "",
      email2: apt.email2 ?? "",
      email3: apt.email3 ?? "",
      email4: apt.email4 ?? "",
      phone1: apt.phone1 ?? "",
      phone2: apt.phone2 ?? "",
      phone3: apt.phone3 ?? "",
      phone4: apt.phone4 ?? "",
    });
    setMessage(null);
  }, [selectedId, apartmentOptions]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, string | null> = {};
      for (const [key, val] of Object.entries(fields)) {
        body[key] = val.trim() || null;
      }
      const res = await fetch(`/api/admin/apartments/${selectedId}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Hata" }));
        setMessage({ type: "err", text: err.message ?? "Kayit basarisiz" });
      } else {
        setMessage({ type: "ok", text: "Iletisim bilgileri kaydedildi." });
      }
    } catch {
      setMessage({ type: "err", text: "Baglanti hatasi" });
    } finally {
      setSaving(false);
    }
  }

  const sortedOptions = [...apartmentOptions].sort((a, b) => {
    const blockCmp = normalizeBlockLabel(a.blockName).localeCompare(normalizeBlockLabel(b.blockName), "tr");
    if (blockCmp !== 0) return blockCmp;
    return a.doorNo.localeCompare(b.doorNo, "tr", { numeric: true });
  });

  return (
    <section className="dashboard report-page staff-contact-edit-page">
      <div className="mobile-app-name-bar">ApartmanWeb MVP</div>
      <div className="mobile-return-nav">
        <NavLink className="btn btn-ghost" to="/admin/reports/staff-mobile-home">
          Mobil Ana Sayfaya Don
        </NavLink>
      </div>
      <div className="card table-card report-page-card">
        <div className="section-head report-toolbar">
          <h3>Daire Iletisim Guncelle</h3>
        </div>

        <form className="staff-contact-edit-form" onSubmit={handleSubmit}>
          <label className="staff-contact-edit-label">
            Daire Secimi
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Daire secin --</option>
              {sortedOptions.map((apt) => (
                <option key={apt.id} value={apt.id}>
                  {normalizeBlockLabel(apt.blockName)}/{apt.doorNo}
                  {apt.ownerFullName ? ` — ${apt.ownerFullName}` : ""}
                </option>
              ))}
            </select>
          </label>

          {selectedId && (
            <>
              <fieldset className="staff-contact-edit-fieldset">
                <legend>Telefon</legend>
                {(["phone1", "phone2", "phone3", "phone4"] as const).map((field, i) => (
                  <label key={field} className="staff-contact-edit-label">
                    Telefon {i + 1}
                    <input
                      type="tel"
                      value={fields[field]}
                      onChange={(e) => setFields((prev) => ({ ...prev, [field]: e.target.value }))}
                      placeholder="0 5xx xxx xx xx"
                      maxLength={40}
                    />
                  </label>
                ))}
              </fieldset>

              <fieldset className="staff-contact-edit-fieldset">
                <legend>E-posta</legend>
                {(["email1", "email2", "email3", "email4"] as const).map((field, i) => (
                  <label key={field} className="staff-contact-edit-label">
                    E-posta {i + 1}
                    <input
                      type="email"
                      value={fields[field]}
                      onChange={(e) => setFields((prev) => ({ ...prev, [field]: e.target.value }))}
                      placeholder="ornek@mail.com"
                      maxLength={120}
                    />
                  </label>
                ))}
              </fieldset>

              {message && (
                <p className={`staff-contact-edit-msg staff-contact-edit-msg--${message.type}`}>
                  {message.text}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-primary staff-contact-edit-submit"
                disabled={saving}
              >
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
