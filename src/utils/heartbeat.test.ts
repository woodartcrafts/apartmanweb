import { describe, expect, it, vi } from "vitest";
import { resolveHeartbeatUrl, sendHeartbeat } from "./heartbeat";

const okFetch = () => vi.fn().mockResolvedValue({ ok: true, status: 200 });

describe("heartbeat", () => {
  it("ayar yoksa hicbir sey gondermez", async () => {
    const fetchImpl = okFetch();
    expect(await sendHeartbeat("ok", "x", { env: {}, fetchImpl })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("yalnizca https adreslerini kabul eder", () => {
    expect(resolveHeartbeatUrl("ok", { HEARTBEAT_OK_URL: "http://hc.example/ping/abc" })).toBeNull();
    expect(resolveHeartbeatUrl("ok", { HEARTBEAT_OK_URL: "bozuk adres" })).toBeNull();
    expect(resolveHeartbeatUrl("ok", { HEARTBEAT_OK_URL: " https://hc-ping.com/abc " })).toBe("https://hc-ping.com/abc");
  });

  it("basari nabzi OK adresine, hata nabzi FAIL adresine gider", async () => {
    const fetchImpl = okFetch();
    const env = { HEARTBEAT_OK_URL: "https://hc-ping.com/abc", HEARTBEAT_FAIL_URL: "https://hc-ping.com/abc/fail" };
    expect(await sendHeartbeat("ok", undefined, { env, fetchImpl })).toBe(true);
    expect(await sendHeartbeat("fail", "Gmail oturumu reddedildi", { env, fetchImpl })).toBe(true);
    expect(fetchImpl.mock.calls[0][0]).toBe("https://hc-ping.com/abc");
    expect(fetchImpl.mock.calls[1][0]).toBe("https://hc-ping.com/abc/fail");
    expect(fetchImpl.mock.calls[1][1].body).toBe("Gmail oturumu reddedildi");
  });

  it("FAIL adresi tanimli degilse hata durumunda hicbir sey gondermez (sessizlik uyariyi tetikler)", async () => {
    const fetchImpl = okFetch();
    expect(await sendHeartbeat("fail", "x", { env: { HEARTBEAT_OK_URL: "https://hc-ping.com/abc" }, fetchImpl })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("ag hatasinda ve 500'de firlatmaz, false doner; mesaj kisaltilir", async () => {
    const env = { HEARTBEAT_OK_URL: "https://hc-ping.com/abc" };
    expect(await sendHeartbeat("ok", undefined, { env, fetchImpl: vi.fn().mockRejectedValue(new Error("ECONNRESET")) })).toBe(false);
    expect(await sendHeartbeat("ok", undefined, { env, fetchImpl: vi.fn().mockResolvedValue({ ok: false, status: 500 }) })).toBe(false);
    const fetchImpl = okFetch();
    await sendHeartbeat("ok", "a".repeat(1000), { env, fetchImpl });
    expect(fetchImpl.mock.calls[0][1].body).toHaveLength(300);
  });
});
