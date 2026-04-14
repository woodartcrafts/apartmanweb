import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function extractMappingKeys(source: string): Set<string> {
  const mappingBlockMatch = source.match(
    /const mapping:\s*Record<string,\s*AdminPageKey>\s*=\s*\{([\s\S]*?)\n\s*\};/
  );

  expect(mappingBlockMatch, "menuPathToPermissionKey mapping block not found").not.toBeNull();

  const mappingBlock = mappingBlockMatch![1];
  const keyRegex = /"(\/admin\/[^"]+)"\s*:\s*"[A-Z0-9_]+"/g;
  const keys = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = keyRegex.exec(mappingBlock)) !== null) {
    keys.add(match[1]);
  }

  return keys;
}

function extractStaticAdminPaths(source: string): Set<string> {
  const literalRegex = /["'`](\/admin\/[A-Za-z0-9_\-\/]+)["'`]/g;
  const paths = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = literalRegex.exec(source)) !== null) {
    const path = match[1];
    if (path.includes(":")) continue;
    if (path.includes("*")) continue;
    paths.add(path);
  }

  return paths;
}

describe("admin menu path mapping drift guard", () => {
  it("keeps static /admin paths mapped in menuPathToPermissionKey", () => {
    const appPath = join(process.cwd(), "frontend", "src", "App.tsx");
    const source = readFileSync(appPath, "utf8");

    const mappingKeys = extractMappingKeys(source);
    const usedPaths = extractStaticAdminPaths(source);

    const allowedWithoutMapping = new Set<string>([
      "/admin/login",
    ]);

    const missing = Array.from(usedPaths)
      .filter((path) => !allowedWithoutMapping.has(path))
      .filter((path) => !mappingKeys.has(path))
      .sort((a, b) => a.localeCompare(b, "tr"));

    expect(missing).toEqual([]);
  });

  it("keeps mapping entries referenced by static /admin paths", () => {
    const appPath = join(process.cwd(), "frontend", "src", "App.tsx");
    const source = readFileSync(appPath, "utf8");

    const mappingKeys = extractMappingKeys(source);
    const usedPaths = extractStaticAdminPaths(source);

    const allowedMappingOnly = new Set<string>(["/admin"]);

    const unused = Array.from(mappingKeys)
      .filter((path) => !allowedMappingOnly.has(path))
      .filter((path) => !usedPaths.has(path))
      .sort((a, b) => a.localeCompare(b, "tr"));

    expect(unused).toEqual([]);
  });
});
