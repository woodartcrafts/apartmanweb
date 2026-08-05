import { useMemo, useState } from "react";
import {
  formatDateTr,
  formatTry,
  type ApartmentOption,
  type SplitCandidateRow,
} from "../../app/shared";

type DraftPart = {
  doorNo: string;
  amount: string;
};

type SplitCandidatesPageProps = {
  loading: boolean;
  pageLoading: boolean;
  rows: SplitCandidateRow[];
  truncated: boolean;
  alreadySplitCount: number;
  includeDismissed: boolean;
  apartmentOptions: ApartmentOption[];
  setIncludeDismissed: (value: boolean) => void;
  refresh: () => Promise<void>;
  splitPayment: (paymentId: string, parts: Array<{ doorNo: string; amount: number }>) => Promise<void>;
  setDismissed: (paymentId: string, dismissed: boolean) => Promise<void>;
};

function normalizeDoorNo(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const numeric = Number(trimmed);
  return Number.isNaN(numeric) ? trimmed.toLocaleLowerCase("tr") : String(numeric);
}

/**
 * Tutari esit boler; kurus artigi son parcaya eklenir, boylece parcalarin
 * toplami her zaman tahsilat tutarina birebir esit kalir.
 */
function buildEqualParts(total: number, doorNos: string[]): DraftPart[] {
  if (doorNos.length === 0) {
    return [];
  }

  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / doorNos.length);
  const parts = doorNos.map((doorNo) => ({ doorNo, cents: baseCents }));
  parts[parts.length - 1].cents += totalCents - baseCents * doorNos.length;

  return parts.map((part) => ({
    doorNo: part.doorNo,
    amount: (part.cents / 100).toFixed(2),
  }));
}

function parseAmount(value: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function SplitCandidatesPage({
  loading,
  pageLoading,
  rows,
  truncated,
  alreadySplitCount,
  includeDismissed,
  apartmentOptions,
  setIncludeDismissed,
  refresh,
  splitPayment,
  setDismissed,
}: SplitCandidatesPageProps) {
  const [openPaymentId, setOpenPaymentId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftPart[]>>({});
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);

  const apartmentByDoorNo = useMemo(() => {
    const map = new Map<string, ApartmentOption>();
    for (const apt of apartmentOptions) {
      map.set(normalizeDoorNo(apt.doorNo), apt);
    }
    return map;
  }, [apartmentOptions]);

  function openEditor(row: SplitCandidateRow): void {
    if (openPaymentId === row.paymentId) {
      setOpenPaymentId(null);
      return;
    }

    setOpenPaymentId(row.paymentId);
    setDrafts((prev) => {
      if (prev[row.paymentId]) {
        return prev;
      }
      const doorNos = row.suggestedApartments.map((apt) => apt.doorNo);
      return { ...prev, [row.paymentId]: buildEqualParts(row.amount, doorNos) };
    });
  }

  function updatePart(paymentId: string, index: number, patch: Partial<DraftPart>): void {
    setDrafts((prev) => {
      const parts = prev[paymentId] ?? [];
      return {
        ...prev,
        [paymentId]: parts.map((part, i) => (i === index ? { ...part, ...patch } : part)),
      };
    });
  }

  function addPart(paymentId: string): void {
    setDrafts((prev) => ({
      ...prev,
      [paymentId]: [...(prev[paymentId] ?? []), { doorNo: "", amount: "0.00" }],
    }));
  }

  function removePart(paymentId: string, index: number): void {
    setDrafts((prev) => ({
      ...prev,
      [paymentId]: (prev[paymentId] ?? []).filter((_, i) => i !== index),
    }));
  }

  function redistributeEqually(row: SplitCandidateRow): void {
    setDrafts((prev) => {
      const parts = prev[row.paymentId] ?? [];
      const doorNos = parts.map((part) => part.doorNo);
      return { ...prev, [row.paymentId]: buildEqualParts(row.amount, doorNos) };
    });
  }

  function validateDraft(row: SplitCandidateRow): { ok: boolean; message: string } {
    const parts = drafts[row.paymentId] ?? [];
    if (parts.length < 2) {
      return { ok: false, message: "En az iki daire girilmeli" };
    }

    const missingDoors: string[] = [];
    const seen = new Set<string>();
    for (const part of parts) {
      const normalized = normalizeDoorNo(part.doorNo);
      if (!normalized) {
        return { ok: false, message: "Bos daire no var" };
      }
      if (seen.has(normalized)) {
        return { ok: false, message: `Ayni daire iki kez girilmis: ${part.doorNo}` };
      }
      seen.add(normalized);
      if (!apartmentByDoorNo.has(normalized)) {
        missingDoors.push(part.doorNo);
      }
    }

    if (missingDoors.length > 0) {
      return { ok: false, message: `Daire bulunamadi: ${missingDoors.join(", ")}` };
    }

    let sum = 0;
    for (const part of parts) {
      const amount = parseAmount(part.amount);
      if (Number.isNaN(amount) || amount <= 0) {
        return { ok: false, message: "Tutarlar sifirdan buyuk olmali" };
      }
      sum += amount;
    }

    // Kurus bazinda birebir esitlik sart: aksi halde banka mutabakati kayar.
    const diffCents = Math.round(sum * 100) - Math.round(row.amount * 100);
    if (diffCents !== 0) {
      return {
        ok: false,
        message: `Toplam ${formatTry(sum)} — tahsilat tutarindan ${formatTry(
          Math.abs(diffCents) / 100
        )} ${diffCents > 0 ? "fazla" : "eksik"}`,
      };
    }

    return { ok: true, message: `Toplam ${formatTry(sum)} — tutar birebir esit` };
  }

  async function onSplit(row: SplitCandidateRow): Promise<void> {
    const validation = validateDraft(row);
    if (!validation.ok) {
      return;
    }

    const parts = (drafts[row.paymentId] ?? []).map((part) => ({
      doorNo: part.doorNo.trim(),
      amount: Number(parseAmount(part.amount).toFixed(2)),
    }));

    const summary = parts.map((part) => `${part.doorNo}: ${formatTry(part.amount)}`).join(", ");
    const confirmed = window.confirm(
      `${formatDateTr(row.paidAt)} tarihli ${formatTry(row.amount)} tutarli tahsilat asagidaki gibi bolunecek:\n\n${summary}\n\nMevcut tahsilat kaydi silinip her daire icin ayri kayit olusturulacak. Bu islem geri alinamaz.`
    );
    if (!confirmed) {
      return;
    }

    setBusyPaymentId(row.paymentId);
    try {
      await splitPayment(row.paymentId, parts);
      setOpenPaymentId(null);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.paymentId];
        return next;
      });
    } finally {
      setBusyPaymentId(null);
    }
  }

  async function onToggleDismiss(row: SplitCandidateRow): Promise<void> {
    setBusyPaymentId(row.paymentId);
    try {
      await setDismissed(row.paymentId, !row.dismissed);
    } finally {
      setBusyPaymentId(null);
    }
  }

  return (
    <section className="dashboard report-page split-candidates-page">
      <div className="card table-card report-page-card">
        <div className="section-head report-toolbar">
          <h3>Bolunme Ihtimali Olan Tahsilatlar</h3>
          <div className="admin-row">
            <label className="small">
              <input
                type="checkbox"
                checked={includeDismissed}
                onChange={(e) => setIncludeDismissed(e.target.checked)}
              />{" "}
              "Bolunmesin" denenleri de goster
            </label>
            <button
              className="btn btn-primary btn-run"
              type="button"
              onClick={() => void refresh()}
              disabled={loading || pageLoading}
            >
              {pageLoading ? "Yukleniyor..." : "Yenile"}
            </button>
          </div>
        </div>

        <p className="small">
          Otomatik bolme sadece surekli birlikte odeme yapan daireler icin yapilir (57/93,
          48/65, 35/45). Aciklamasi birden fazla daireye isaret eden diger tahsilatlar
          bolunmeden kaydedilir ve burada listelenir. Incelemek istemedigin kayitlar icin{" "}
          <b>Bolunmesin</b> diyerek listeyi temizleyebilirsin.
        </p>

        <p className="small">
          Ayni banka hareketinden birden fazla tahsilat kaydi varsa o hareket zaten
          bolunmus sayilir ve burada listelenmez.
          {alreadySplitCount > 0
            ? ` Bu nedenle ${alreadySplitCount} kayit listeden cikarildi.`
            : ""}
        </p>

        {truncated ? (
          <p className="small" role="alert">
            DIKKAT: taranan tahsilat sayisi limite takildi, liste eksik olabilir.
          </p>
        ) : null}

        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th className="col-num">Tutar</th>
                <th>Aciklama</th>
                <th>Referans</th>
                <th>Su Anki Daire</th>
                <th>Tespit Edilen</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Bolunme ihtimali olan tahsilat bulunamadi
                  </td>
                </tr>
              ) : (
                rows.flatMap((row) => {
                  const isOpen = openPaymentId === row.paymentId;
                  const parts = drafts[row.paymentId] ?? [];
                  const busy = busyPaymentId === row.paymentId;

                  const mainRow = (
                    <tr key={row.paymentId} className={row.dismissed ? "row-muted" : undefined}>
                      <td>{formatDateTr(row.paidAt)}</td>
                      <td className="col-num">{formatTry(row.amount)}</td>
                      <td
                        className="unclassified-col-ellipsis"
                        title={row.bankDescription ?? "-"}
                      >
                        {row.bankDescription ?? "-"}
                      </td>
                      <td
                        className="unclassified-col-ellipsis"
                        title={row.bankReference ?? "-"}
                      >
                        {row.bankReference ?? "-"}
                      </td>
                      <td>
                        {row.currentApartments.length > 0
                          ? row.currentApartments.map((apt) => apt.label).join(", ")
                          : row.currentDoorNo ?? "-"}
                      </td>
                      <td>{row.detectedDoorNos.join(", ")}</td>
                      <td>
                        <div className="admin-row">
                          <button
                            className="btn"
                            type="button"
                            disabled={loading || busy}
                            onClick={() => openEditor(row)}
                          >
                            {isOpen ? "Kapat" : "Bol"}
                          </button>
                          <button
                            className="btn"
                            type="button"
                            disabled={loading || busy}
                            onClick={() => void onToggleDismiss(row)}
                          >
                            {row.dismissed ? "Geri Al" : "Bolunmesin"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );

                  if (!isOpen) {
                    return [mainRow];
                  }

                  const validation = validateDraft(row);
                  const editorRow = (
                    <tr key={`${row.paymentId}-editor`} className="split-editor-row">
                      <td colSpan={7}>
                        <div className="split-editor">
                          <p className="small">
                            {formatTry(row.amount)} tutarli tahsilat asagidaki dairelere
                            bolunecek. Tutarlarin toplami tahsilat tutarina esit olmali.
                          </p>

                          {parts.map((part, index) => {
                            const matched = apartmentByDoorNo.get(normalizeDoorNo(part.doorNo));
                            return (
                              <div className="admin-row split-editor-line" key={index}>
                                <input
                                  type="text"
                                  placeholder="Daire no"
                                  value={part.doorNo}
                                  onChange={(e) =>
                                    updatePart(row.paymentId, index, { doorNo: e.target.value })
                                  }
                                />
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="Tutar"
                                  value={part.amount}
                                  onChange={(e) =>
                                    updatePart(row.paymentId, index, { amount: e.target.value })
                                  }
                                />
                                <span className="small">
                                  {part.doorNo.trim()
                                    ? matched
                                      ? `${matched.blockName}/${matched.doorNo}${
                                          matched.ownerFullName ? ` - ${matched.ownerFullName}` : ""
                                        }`
                                      : "Daire bulunamadi"
                                    : "Daire no girin"}
                                </span>
                                <button
                                  className="btn"
                                  type="button"
                                  disabled={parts.length <= 2}
                                  onClick={() => removePart(row.paymentId, index)}
                                >
                                  Cikar
                                </button>
                              </div>
                            );
                          })}

                          <div className="admin-row compact-row-top-gap">
                            <button
                              className="btn"
                              type="button"
                              onClick={() => addPart(row.paymentId)}
                            >
                              Daire Ekle
                            </button>
                            <button
                              className="btn"
                              type="button"
                              onClick={() => redistributeEqually(row)}
                            >
                              Esit Dagit
                            </button>
                          </div>

                          <p className={`small ${validation.ok ? "" : "text-danger"}`}>
                            {validation.message}
                          </p>

                          <div className="admin-row">
                            <button
                              className="btn btn-primary"
                              type="button"
                              disabled={loading || busy || !validation.ok}
                              onClick={() => void onSplit(row)}
                            >
                              {busy ? "Bolunuyor..." : "Bolmeyi Uygula"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );

                  return [mainRow, editorRow];
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
