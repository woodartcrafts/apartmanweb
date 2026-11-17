import { describe, expect, it } from "vitest";
import {
  auditPayments,
  auditSignature,
  formatAuditText,
  hasActionableFindings,
  type AuditPaymentInput,
} from "./paymentAudit";

const doorNoSet = new Set(["24", "48", "54", "65", "78"]);
const day = new Date("2026-11-12T00:00:00Z");

function payment(id: string, note: string, extra: Partial<AuditPaymentInput> = {}): AuditPaymentInput {
  return { id, paidAt: day, totalAmount: 1325, note, linkedDoorNos: [], ...extra };
}

const run = (payments: AuditPaymentInput[], charges: Parameters<typeof auditPayments>[0]["charges"] = []) =>
  auditPayments({ payments, charges, doorNoSet, windowDays: 45, now: new Date("2026-11-17T09:00:00Z") });

describe("auditPayments", () => {
  it("D54/D24 oruntusu: aciklamada 'D-24' yaziyor ama odeme 54'e etiketli -> ONEMLI bulgu", () => {
    const report = run([
      payment("p1", "BANK_REF:111 | BANK_DESC:AHMET DEMIR*D-24 KASIM 2026 DOGALGAZ AIDAT TL | DOOR:54"),
    ]);
    expect(report.counts.WRITTEN_DOOR_MISMATCH).toBe(1);
    expect(report.findings[0]).toMatchObject({ code: "WRITTEN_DOOR_MISMATCH", severity: "HIGH", paymentId: "p1" });
    expect(report.findings[0].message).toContain("daire 24");
  });

  it("aciklamadaki daire etiketle ayniysa bulgu yok", () => {
    const report = run([payment("p1", "BANK_REF:111 | BANK_DESC:AHMET DEMIR*D-24 KASIM AIDAT TL | DOOR:24")]);
    expect(report.findings).toHaveLength(0);
  });

  it("bolunen (BANK_SPLIT) odemeler yazili-daire kontrolune takilmaz", () => {
    const report = run([
      payment("p1", "BANK_REF:111 | BANK_DESC:daire 65 mayis aidat KASIM | DOOR:48 | BANK_SPLIT:R2"),
    ]);
    expect(report.counts.WRITTEN_DOOR_MISMATCH).toBe(0);
  });

  it("etiketli daireden baska dairenin borcuna yazilmis odeme -> ONEMLI", () => {
    const report = run([payment("p1", "BANK_REF:111 | DOOR:54", { linkedDoorNos: ["54", "24"] })]);
    expect(report.counts.LINKED_OTHER_APARTMENT).toBe(1);
  });

  it("elle karar verilmis (kilitli) odeme baska daireye yazilmis olsa da bulgu uretmez", () => {
    const report = run([
      payment("p1", "BANK_REF:111 | DOOR:54 | RECONCILE_LOCK:MANUAL", { linkedDoorNos: ["24"] }),
    ]);
    expect(report.counts.LINKED_OTHER_APARTMENT).toBe(0);
  });

  it("fazla odenmis tahakkuk -> ONEMLI", () => {
    const report = run([], [{ id: "c1", doorNo: "54", label: "A/54 Kasim 2026 Aidat", amount: 1000, paidAmount: 1325 }]);
    expect(report.counts.OVERPAID_CHARGE).toBe(1);
    expect(report.findings[0].amount).toBe(325);
  });

  it("Excel (uzun dekont no) + Gmail (16 hex) ayni gun/tutar/daire -> olasi cift kayit", () => {
    const report = run([
      payment("excel", "BANK_REF:11188005235620261112091856449 | DOOR:54"),
      payment("gmail", "BANK_REF:0123456789ABCDEF | DOOR:54"),
    ]);
    expect(report.counts.POSSIBLE_DUPLICATE).toBe(1);
    expect(report.findings[0].severity).toBe("MEDIUM");
  });

  it("ayni tur referansli iki ayni tutar (iki ayri havale) cift sayilmaz", () => {
    const report = run([
      payment("a", "BANK_REF:11188005235620261112091856449 | DOOR:54"),
      payment("b", "BANK_REF:11188005235620261112091856450 | DOOR:54"),
    ]);
    expect(report.counts.POSSIBLE_DUPLICATE).toBe(0);
  });

  it("onay bekleyenler bilgi olarak sayilir ve e-posta gerektirmez", () => {
    const report = run([payment("p1", "BANK_REF:1 | DOOR:54 | UNAPPLIED:PENDING_APPROVAL:FIFO_FALLBACK")]);
    expect(report.counts.AWAITING_APPROVAL).toBe(1);
    expect(hasActionableFindings(report)).toBe(false);
    expect(auditSignature(report)).toBe("");
  });

  it("onemli bulgular once siralanir; metin ciktisi bulgulari icerir", () => {
    const report = run(
      [
        payment("info", "BANK_REF:1 | DOOR:54 | UNAPPLIED:PENDING_APPROVAL:FIFO_FALLBACK"),
        payment("bad", "BANK_REF:2 | BANK_DESC:X D-24 KASIM AIDAT TL | DOOR:54"),
      ]
    );
    expect(report.findings.map((f) => f.severity)).toEqual(["HIGH", "INFO"]);
    expect(formatAuditText(report)).toContain("ONEMLI");
    expect(hasActionableFindings(report)).toBe(true);
    expect(auditSignature(report)).toBe("WRITTEN_DOOR_MISMATCH:bad:");
  });
});
