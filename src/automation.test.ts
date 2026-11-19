import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

vi.mock("./db", () => ({ prisma: {} }));
vi.mock("./routes/admin", () => ({ importBankStatementFile: vi.fn(), previewBankStatementFile: vi.fn() }));

import { buildReallocatedNote, requireAutomationKey } from "./routes/automation";

function run(headers: Record<string, string>) {
  const res = { statusCode: 0, body: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(b: unknown) { this.body = b; return this; } };
  let nextCalled = false;
  requireAutomationKey({ headers } as unknown as Request, res as unknown as Response, () => { nextCalled = true; });
  return { res, nextCalled };
}

describe("otomasyon anahtari", () => {
  const original = process.env.AUTOMATION_API_KEY;
  afterEach(() => { process.env.AUTOMATION_API_KEY = original; });

  it("anahtar tanimli degilse ya da kisaysa API kapali", () => {
    delete process.env.AUTOMATION_API_KEY;
    expect(run({ authorization: "Bearer x" }).res.statusCode).toBe(404);
    process.env.AUTOMATION_API_KEY = "kisa";
    expect(run({ authorization: "Bearer kisa" }).res.statusCode).toBe(404);
  });

  it("yanlis anahtari reddeder, dogruyu kabul eder", () => {
    const key = "a".repeat(40);
    process.env.AUTOMATION_API_KEY = key;
    expect(run({}).res.statusCode).toBe(401);
    expect(run({ authorization: "Bearer " + "b".repeat(40) }).res.statusCode).toBe(401);
    expect(run({ authorization: `Bearer ${key}` }).nextCalled).toBe(true);
    expect(run({ "x-automation-key": key }).nextCalled).toBe(true);
  });
});

describe("buildReallocatedNote", () => {
  it("onay bekliyor etiketini kaldirir ve kilit ekler", () => {
    const note = "BANK_REF:1 | DOOR:80 | UNAPPLIED:PENDING_APPROVAL:FIFO_FALLBACK | RECONCILE_LOCK:MANUAL";
    expect(buildReallocatedNote(note, 0)).toBe("BANK_REF:1 | DOOR:80 | RECONCILE_LOCK:MANUAL");
  });
  it("artan tutari fazla odeme etiketi olarak yazar", () => {
    expect(buildReallocatedNote("BANK_REF:1 | DOOR:15", 2500)).toBe("BANK_REF:1 | DOOR:15 | UNAPPLIED:OVERPAYMENT:25.00 | RECONCILE_LOCK:MANUAL");
  });
});
