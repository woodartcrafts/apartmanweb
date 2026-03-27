import "dotenv/config";

function fail(message: string): never {
  console.error(`[E2E SAFETY] ${message}`);
  process.exit(1);
}

function isLikelyUnsafeDatabaseUrl(url: string): boolean {
  const normalized = url.toLowerCase();

  // Allow local/docker style databases by default.
  const localIndicators = ["localhost", "127.0.0.1", "host.docker.internal"];
  if (localIndicators.some((item) => normalized.includes(item))) return false;

  // Railway and other hosted DB endpoints should be treated as unsafe for E2E by default.
  const unsafeIndicators = ["railway", "rlwy", "amazonaws.com", "neon.tech", "supabase.co"];
  if (unsafeIndicators.some((item) => normalized.includes(item))) return true;

  // Any non-local URL is considered unsafe unless explicitly overridden.
  return true;
}

function main() {
  const url = process.env.DATABASE_URL?.trim();
  const allowRemote = String(process.env.E2E_ALLOW_REMOTE_DB ?? "").toLowerCase() === "true";

  if (!url) {
    fail("DATABASE_URL is empty. Refusing to run E2E without explicit DB target.");
  }

  if (isLikelyUnsafeDatabaseUrl(url) && !allowRemote) {
    fail(
      "E2E blocked: DATABASE_URL points to a non-local/remote DB. Use a local test DB or set E2E_ALLOW_REMOTE_DB=true only if you intentionally accept risk."
    );
  }

  console.log("[E2E SAFETY] DB check passed.");
}

main();
