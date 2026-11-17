/**
 * Gunluk senkron icin "nabiz" (dead-man's switch) bildirimi.
 *
 * Uygulama kendisi coktugunde kimseyi uyaramaz; bu yuzden basari ile bitince disaridaki bir izleme
 * servisine (Healthchecks.io, Better Stack, UptimeRobot heartbeat vb.) kisa bir istek atariz. Servis
 * belirlenen saatte nabiz gelmezse telefona uyari gonderir. Sessizlik = sorun.
 *
 *  - HEARTBEAT_OK_URL   : senkron hatasiz bittiginde cagrilir.
 *  - HEARTBEAT_FAIL_URL : (istege bagli) senkron hata verdiginde cagrilir. Tanimli degilse hata
 *                         durumunda hicbir sey gonderilmez, nabzin gelmemesi uyariyi tetikler.
 * Ikisi de tanimsizsa hicbir sey yapilmaz. Hicbir durumda hata firlatmaz.
 */

export type HeartbeatKind = "ok" | "fail";

type HeartbeatEnv = Record<string, string | undefined>;
type FetchLike = (url: string, init: { method: string; body?: string; headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number }>;

const HEARTBEAT_TIMEOUT_MS = 10_000;
const MAX_MESSAGE_LENGTH = 300;

export function resolveHeartbeatUrl(kind: HeartbeatKind, env: HeartbeatEnv = process.env): string | null {
  const raw = (kind === "ok" ? env.HEARTBEAT_OK_URL : env.HEARTBEAT_FAIL_URL)?.trim();
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Gonderildiyse true. Ayar yoksa, hata varsa ya da zaman asimi olursa false; asla firlatmaz. */
export async function sendHeartbeat(
  kind: HeartbeatKind,
  message?: string,
  options: { env?: HeartbeatEnv; fetchImpl?: FetchLike } = {}
): Promise<boolean> {
  const url = resolveHeartbeatUrl(kind, options.env ?? process.env);
  if (!url) {
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);
  try {
    const fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchLike);
    const response = await fetchImpl(url, {
      method: "POST",
      body: (message ?? "").slice(0, MAX_MESSAGE_LENGTH),
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn("[heartbeat] unexpected status", { kind, status: response.status });
    }
    return response.ok;
  } catch (err) {
    console.warn("[heartbeat] request failed", { kind, message: err instanceof Error ? err.message : String(err) });
    return false;
  } finally {
    clearTimeout(timer);
  }
}
