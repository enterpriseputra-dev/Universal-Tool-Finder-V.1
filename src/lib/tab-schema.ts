/**
 * Dynamic column schema and tab metadata for the Power Tool Parts Finder.
 *
 * Every tab (built-in or custom) has:
 *  - A TabMeta record describing its identity and fixed properties (idField,
 *    imageField, hiddenFields, tolerance).
 *  - A ColumnDef[] describing its searchable/displayable columns. Each column
 *    is one of three internal types:
 *      'dimensions'     → numeric, tolerance-matched in sidebar
 *      'specifications' → text, rendered as a dropdown filter in sidebar
 *      'text'           → text, keyword-searched but not in sidebar
 *    New columns added by staff can only be 'dimensions' or 'specifications'.
 *    'text' is for built-in columns that are full-text searched but not in
 *    the sidebar (e.g. Equivalent Model, Compatible Models).
 *
 * Storage keys:
 *  ptpf:tabs          → JSON TabMeta[]
 *  ptpf:schema:<id>   → JSON ColumnDef[]
 *  ptpf:data:<id>     → JSON rows for custom (non-built-in) tabs
 */

import type { FinderConfig } from "./finder-search";

export type ColumnType = "dimensions" | "specifications" | "text";

export interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
}

export interface TabMeta {
  id: string;
  label: string;
  builtIn: boolean;
  idField: string;
  imageField?: string;
  hiddenFields: string[];
  tolerance: number;
}

const LS_TABS = "ptpf:tabs";
export const customDataKey = (tabId: string): string => `ptpf:data:${tabId}`;
export const customDataVersionKey = (tabId: string): string => `ptpf:data:${tabId}:version`;
const schemaLsKey = (tabId: string): string => `ptpf:schema:${tabId}`;

export const BUILTIN_TAB_IDS = new Set(["bearings", "armatures", "carbon-brushes", "v-belts"]);

const BUILTIN_TABS: TabMeta[] = [
  { id: "bearings", label: "Bearings", builtIn: true, idField: "bearing", imageField: "image", hiddenFields: ["rowId", "image", "userAdded"], tolerance: 2 },
  { id: "armatures", label: "Armatures", builtIn: true, idField: "model", imageField: "image", hiddenFields: ["rowId", "image", "userAdded"], tolerance: 2 },
  { id: "carbon-brushes", label: "Carbon Brushes", builtIn: true, idField: "partNumber", hiddenFields: ["rowId", "userAdded"], tolerance: 1 },
  { id: "v-belts", label: "V-Belts", builtIn: true, idField: "code", hiddenFields: ["rowId", "userAdded"], tolerance: 2 },
];

const BUILTIN_SCHEMAS: Record<string, ColumnDef[]> = {
  bearings: [
    { key: "bearing", label: "Bearing Number", type: "text" },
    { key: "id", label: "Inner (ID)", type: "dimensions" },
    { key: "od", label: "Outer (OD)", type: "dimensions" },
    { key: "width", label: "Width", type: "dimensions" },
    { key: "series", label: "Series", type: "specifications" },
    { key: "brand", label: "Brand", type: "specifications" },
    { key: "type", label: "Type", type: "specifications" },
  ],
  armatures: [
    { key: "model", label: "Model", type: "text" },
    { key: "equivalentModel", label: "Equivalent Model", type: "text" },
    { key: "compatibleModels", label: "Compatible Machine Models", type: "text" },
    { key: "brand", label: "Brand", type: "specifications" },
    { key: "toolType", label: "Tool Type", type: "specifications" },
    { key: "size", label: "Size", type: "specifications" },
    { key: "armatureLength", label: "Armature Length", type: "dimensions" },
    { key: "innerShaftLength", label: "Inner Shaft Length", type: "dimensions" },
    { key: "stackLength", label: "Stack Length", type: "dimensions" },
    { key: "coreDiameter", label: "Armature Core Diameter", type: "dimensions" },
    { key: "commutatorDiameter", label: "Commutator Diameter", type: "dimensions" },
    { key: "fanSeatDiameter", label: "Fan Seat Diameter", type: "dimensions" },
    { key: "commutatorEndShaftDiameter", label: "Commutator End Shaft Diameter", type: "dimensions" },
    { key: "fanEndShaftDiameter", label: "Fan End Shaft Diameter", type: "dimensions" },
    { key: "fanDiameter", label: "Fan Diameter", type: "dimensions" },
    { key: "bearing", label: "Bearing", type: "text" },
    { key: "fanType", label: "Fan Type", type: "specifications" },
  ],
  "carbon-brushes": [
    { key: "partNumber", label: "Part Number", type: "text" },
    { key: "altPartNumber", label: "Alternative Part Number", type: "text" },
    { key: "thickness", label: "Thickness", type: "dimensions" },
    { key: "width", label: "Width", type: "dimensions" },
    { key: "length", label: "Length", type: "dimensions" },
    { key: "springDiameter", label: "Spring Diameter", type: "dimensions" },
    { key: "plateSocketSize", label: "Plate/Socket Size", type: "specifications" },
    { key: "toolCategory", label: "Tool Category", type: "specifications" },
    { key: "compatibleModels", label: "Compatible Models", type: "text" },
  ],
  "v-belts": [
    { key: "code", label: "V-Belt Code", type: "text" },
    { key: "series", label: "Series", type: "specifications" },
    { key: "lp", label: "Pitch Circ. Lp (cm)", type: "dimensions" },
    { key: "li", label: "Inner Circ. Li (cm)", type: "dimensions" },
    { key: "la", label: "Outer Circ. La (cm)", type: "dimensions" },
    { key: "topWidth", label: "Top Width bo (mm)", type: "dimensions" },
    { key: "pitchWidth", label: "Pitch Width bp (mm)", type: "dimensions" },
    { key: "height", label: "Height h (mm)", type: "dimensions" },
    { key: "minPulleyDia", label: "Min. Pulley Dia. (mm)", type: "dimensions" },
  ],
};

export function loadTabList(): TabMeta[] {
  try {
    const s = localStorage.getItem(LS_TABS);
    if (s) {
      const parsed = JSON.parse(s) as TabMeta[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...BUILTIN_TABS];
}

export function saveTabList(tabs: TabMeta[]): void {
  localStorage.setItem(LS_TABS, JSON.stringify(tabs));
}

export function loadTabSchema(tabId: string): ColumnDef[] {
  try {
    const s = localStorage.getItem(schemaLsKey(tabId));
    if (s) {
      const parsed = JSON.parse(s) as ColumnDef[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return BUILTIN_SCHEMAS[tabId] ? [...BUILTIN_SCHEMAS[tabId]] : [];
}

export function saveTabSchema(tabId: string, cols: ColumnDef[]): void {
  localStorage.setItem(schemaLsKey(tabId), JSON.stringify(cols));
}

/**
 * Derive a stable version string from a column schema.
 * Changes whenever columns are added, removed, or their type is changed.
 */
export function schemaVersion(cols: ColumnDef[]): string {
  return [...cols]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((c) => `${c.key}:${c.type}`)
    .join(",");
}

/**
 * Reconcile stored rows with the current schema: any column present in the
 * schema but missing from a row is back-filled with a sensible default
 * (0 for dimensions, "" for specifications/text).  Extra columns that were
 * removed from the schema are left untouched so no data is silently lost.
 */
export function mergeCustomRows(
  stored: Record<string, unknown>[],
  cols: ColumnDef[],
): Record<string, unknown>[] {
  return stored.map((row) => {
    const merged = { ...row };
    for (const col of cols) {
      if (!(col.key in merged)) {
        merged[col.key] = col.type === "dimensions" ? 0 : "";
      }
    }
    return merged;
  });
}

/**
 * Load custom tab data from localStorage, merging with the current column
 * schema when the stored version is outdated or absent.  Falls back to an
 * empty array if localStorage is unreadable.
 */
export function loadCustomTabData(tabId: string, cols: ColumnDef[]): Record<string, unknown>[] {
  try {
    const s = localStorage.getItem(customDataKey(tabId));
    if (!s) return [];
    const stored = JSON.parse(s) as Record<string, unknown>[];
    const storedVersion = localStorage.getItem(customDataVersionKey(tabId));
    const currentVersion = schemaVersion(cols);
    if (storedVersion === currentVersion) return stored;
    const merged = mergeCustomRows(stored, cols);
    localStorage.setItem(customDataKey(tabId), JSON.stringify(merged));
    localStorage.setItem(customDataVersionKey(tabId), currentVersion);
    return merged;
  } catch {
    return [];
  }
}

/**
 * Persist custom tab rows and the schema version to localStorage.
 */
export function saveCustomTabData(tabId: string, rows: Record<string, unknown>[], cols: ColumnDef[]): void {
  localStorage.setItem(customDataKey(tabId), JSON.stringify(rows));
  localStorage.setItem(customDataVersionKey(tabId), schemaVersion(cols));
}

/**
 * Identify CSV headers that are not yet part of the current schema (and are
 * not internal/hidden fields).  Each unknown header becomes a new
 * "specifications" column — the safe default for user-supplied text data.
 *
 * This is the pure extraction of the "auto-column" logic used during CSV
 * import so it can be tested independently of the React component.
 */
export function detectNewColumns(
  currentSchema: ColumnDef[],
  headers: string[],
  hiddenFields?: string[],
): ColumnDef[] {
  const known = new Set([
    ...currentSchema.map((c) => c.key),
    ...(hiddenFields ?? []),
    "rowId",
    "userAdded",
  ]);
  return headers
    .filter((h) => !known.has(h))
    .map((h): ColumnDef => ({ key: h, label: h, type: "specifications" }));
}

export function buildFinderConfig(meta: TabMeta, cols: ColumnDef[]): FinderConfig {
  const columnLabels: Record<string, string> = {};
  const dimensionFields: string[] = [];
  const filterFields: string[] = [];

  for (const col of cols) {
    columnLabels[col.key] = col.label;
    if (col.type === "dimensions") dimensionFields.push(col.key);
    else if (col.type === "specifications") filterFields.push(col.key);
  }

  return {
    idField: meta.idField,
    imageField: meta.imageField,
    hiddenFields: meta.hiddenFields,
    tolerance: meta.tolerance,
    dimensionFields,
    filterFields,
    columnLabels,
  };
}

/** Generate a slug from a label, ensuring uniqueness against existing ids. */
export function slugify(label: string, existing: Set<string>): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "tab";
  let candidate = base;
  let i = 2;
  while (existing.has(candidate)) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}
