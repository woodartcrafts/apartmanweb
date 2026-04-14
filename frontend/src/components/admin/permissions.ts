import type { AdminPageDefinition, AdminPagePermission, AdminPagePermissionMap } from "../../app/shared";

export type PermissionPreset = "full" | "readOnly" | "hidden";

export function buildPermissionMap(pageDefs: AdminPageDefinition[]): AdminPagePermissionMap {
  const base = {} as AdminPagePermissionMap;
  for (const page of pageDefs) {
    base[page.key] = { visible: true, read: true, write: true, delete: true };
  }
  return base;
}

export function clonePermissionMap(map: AdminPagePermissionMap): AdminPagePermissionMap {
  const next = {} as AdminPagePermissionMap;
  for (const [key, row] of Object.entries(map)) {
    next[key as keyof AdminPagePermissionMap] = { ...row };
  }
  return next;
}

export function applyPermissionPreset(map: AdminPagePermissionMap, preset: PermissionPreset): AdminPagePermissionMap {
  const next = clonePermissionMap(map);

  for (const key of Object.keys(next) as Array<keyof AdminPagePermissionMap>) {
    if (preset === "full") {
      next[key] = { visible: true, read: true, write: true, delete: true };
      continue;
    }

    if (preset === "readOnly") {
      next[key] = { visible: true, read: true, write: false, delete: false };
      continue;
    }

    next[key] = { visible: false, read: false, write: false, delete: false };
  }

  return next;
}

export function updatePermissionCell(
  map: AdminPagePermissionMap,
  key: keyof AdminPagePermission,
  checked: boolean,
  pageKey: keyof AdminPagePermissionMap
): AdminPagePermissionMap {
  const row = map[pageKey];
  const nextRow: AdminPagePermission = { ...row, [key]: checked };

  if (!nextRow.visible) {
    nextRow.read = false;
    nextRow.write = false;
    nextRow.delete = false;
  }

  if (key === "read" && !checked) {
    nextRow.write = false;
    nextRow.delete = false;
  }

  if ((key === "write" || key === "delete") && checked) {
    nextRow.visible = true;
    nextRow.read = true;
  }

  return {
    ...map,
    [pageKey]: nextRow,
  };
}
