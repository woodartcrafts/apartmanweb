import { describe, expect, it } from "vitest";
import { isAuditReviewed, withAuditReviewedNote } from "./adminNoteUtils";

describe("AUDIT_REVIEWED notu", () => {
  it("isaretsiz notta false, isaretli notta true", () => {
    expect(isAuditReviewed(null)).toBe(false);
    expect(isAuditReviewed("BANK_REF:1 | DOOR:54")).toBe(false);
    expect(isAuditReviewed("BANK_REF:1 | AUDIT_REVIEWED:2026-11-18")).toBe(true);
  });

  it("isaret diger etiketleri korur ve sona ekler", () => {
    const next = withAuditReviewedNote("BANK_REF:1 | BANK_DESC:x | DOOR:54 | RECONCILE_LOCK:MANUAL", true, "2026-11-18");
    expect(next).toBe("BANK_REF:1 | BANK_DESC:x | DOOR:54 | RECONCILE_LOCK:MANUAL | AUDIT_REVIEWED:2026-11-18");
  });

  it("ikinci kez isaretlemek tek etiket birakir (tarih yenilenir)", () => {
    const once = withAuditReviewedNote("DOOR:54", true, "2026-11-18");
    const twice = withAuditReviewedNote(once, true, "2026-11-19");
    expect(twice).toBe("DOOR:54 | AUDIT_REVIEWED:2026-11-19");
  });

  it("geri alinca yalniz etiket kalkar; bos nota inerse null doner", () => {
    expect(withAuditReviewedNote("DOOR:54 | AUDIT_REVIEWED:2026-11-18", false, "2026-11-19")).toBe("DOOR:54");
    expect(withAuditReviewedNote("AUDIT_REVIEWED:2026-11-18", false, "2026-11-19")).toBeNull();
    expect(withAuditReviewedNote(null, true, "2026-11-18")).toBe("AUDIT_REVIEWED:2026-11-18");
  });
});
