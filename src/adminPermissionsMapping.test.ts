import { describe, expect, it } from "vitest";
import { mapRequestMethodToAdminAction, mapRequestPathToAdminPage } from "./utils/adminPermissions";

describe("admin permission path mapping", () => {
  it("maps staff open aidat statement email to granular action key", () => {
    expect(mapRequestPathToAdminPage("/apartments/abc123/statement-email", "POST")).toBe(
      "REPORTS_STAFF_OPEN_AIDAT_SEND_EMAIL"
    );
  });

  it("maps report aliases to intended report keys", () => {
    expect(mapRequestPathToAdminPage("/reports/apartment-balance-matrix", "GET")).toBe("REPORTS_MONTHLY_BALANCE");
    expect(mapRequestPathToAdminPage("/reports/bank-reconciliation", "GET")).toBe("REPORTS_BANK_MOVEMENTS");
  });

  it("maps charge-types endpoints by method", () => {
    expect(mapRequestPathToAdminPage("/charge-types", "GET")).toBe("CHARGE_TYPES_LIST");
    expect(mapRequestPathToAdminPage("/charge-types", "POST")).toBe("CHARGE_TYPES_CREATE");
    expect(mapRequestPathToAdminPage("/charge-types/1", "PATCH")).toBe("CHARGE_TYPES_EDIT");
    expect(mapRequestPathToAdminPage("/charge-types/1", "DELETE")).toBe("CHARGE_TYPES_DELETE");
  });

  it("maps payments row endpoints by method", () => {
    expect(mapRequestPathToAdminPage("/payments/row-1", "GET")).toBe("PAYMENTS_LIST_EDIT");
    expect(mapRequestPathToAdminPage("/payments/row-1", "DELETE")).toBe("PAYMENTS_LIST_DELETE");
  });

  it("maps /apartments by method to list vs create", () => {
    expect(mapRequestPathToAdminPage("/apartments", "GET")).toBe("APT_LIST");
    expect(mapRequestPathToAdminPage("/apartments", "POST")).toBe("APT_NEW");
  });

  it("maps fallback to reports summary for unknown paths", () => {
    expect(mapRequestPathToAdminPage("/unknown-path", "GET")).toBe("REPORTS_SUMMARY");
  });
});

describe("admin permission method mapping", () => {
  it("maps read-like methods to read", () => {
    expect(mapRequestMethodToAdminAction("GET")).toBe("read");
    expect(mapRequestMethodToAdminAction("HEAD")).toBe("read");
    expect(mapRequestMethodToAdminAction("OPTIONS")).toBe("read");
  });

  it("maps delete to delete", () => {
    expect(mapRequestMethodToAdminAction("DELETE")).toBe("delete");
  });

  it("maps write-like methods to write", () => {
    expect(mapRequestMethodToAdminAction("POST")).toBe("write");
    expect(mapRequestMethodToAdminAction("PUT")).toBe("write");
    expect(mapRequestMethodToAdminAction("PATCH")).toBe("write");
  });
});
