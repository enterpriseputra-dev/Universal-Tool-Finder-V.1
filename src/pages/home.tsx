import { useRef, useState } from "react";
import {
  ClipboardList,
  Copy,
  Download,
  Lock,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  toCsv,
  parseCsv,
  detectTabFromCsv,
  csvRowToRecord,
  BEARING_NUM_FIELDS,
  ARMATURE_NUM_FIELDS,
  CARBON_BRUSH_NUM_FIELDS,
  VBELT_NUM_FIELDS,
} from "../lib/csv-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinderModule, {
  createInitialFinderState,
  type FinderModuleState,
} from "@/components/finder-module";
import type { FinderRow } from "@/lib/finder-search";
import { DEFAULT_TOLERANCE } from "@/lib/finder-search";
import { bearings, BEARINGS_VERSION } from "@/data/bearings";
import { armatures, ARMATURES_VERSION } from "@/data/armatures";
import { carbonBrushes, CARBON_BRUSHES_VERSION } from "@/data/carbon-brushes";
import { vBelts, VBELTS_VERSION } from "@/data/v-belts";
import { loadCatalogue, saveCatalogue } from "@/lib/catalogue-storage";
import {
  type ColumnDef,
  type TabMeta,
  BUILTIN_TAB_IDS,
  loadTabList,
  saveTabList,
  loadTabSchema,
  saveTabSchema,
  loadCustomTabData,
  saveCustomTabData,
  customDataVersionKey,
  buildFinderConfig,
  slugify,
} from "@/lib/tab-schema";
import bearingDiagram from "@assets/Bearing_1783184127498.jpg";
import carbonBrushDiagram from "@assets/Carbon_Brush_1783186733321.jpg";
import armatureDiagram from "@assets/Armature_1783186837271.jpg";
import vBeltDiagram from "@assets/image_1783433668154.jpg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ────────────────────────── localStorage keys ────────────────────────── */
const LS_BEARINGS = "ptpf:bearings";
const LS_BEARINGS_VER = "ptpf:bearings:version";
const LS_ARMATURES = "ptpf:armatures";
const LS_ARMATURES_VER = "ptpf:armatures:version";
const LS_CARBON_BRUSHES = "ptpf:carbon-brushes";
const LS_CARBON_BRUSHES_VER = "ptpf:carbon-brushes:version";
const LS_VBELTS = "ptpf:v-belts";
const LS_VBELTS_VER = "ptpf:v-belts:version";
const LS_CHANGELOG = "ptpf:changelog";

/* ────────────────────────── types ────────────────────────── */
type PartType = "Bearings" | "Armatures" | "Carbon Brushes" | "V-Belts" | string;

/** All catalogue rows are stored as generic records; rowId is always present. */
type AnyRow = { rowId: number; userAdded?: boolean; [key: string]: unknown };

interface ChangeEntry {
  id: number;
  timestamp: string;
  action: "add" | "edit" | "delete";
  partType: PartType;
  partId: string;
  snapshot: Record<string, unknown>;
  before?: Record<string, unknown>;
}

/* ────────────────────────── loaders ────────────────────────── */
function loadBearingsRaw(): AnyRow[] {
  return loadCatalogue<AnyRow>(LS_BEARINGS, LS_BEARINGS_VER, bearings as unknown as AnyRow[], BEARINGS_VERSION, "bearing")
    .sort((a, b) => String(a.bearing ?? "").localeCompare(String(b.bearing ?? ""), undefined, { numeric: true, sensitivity: "base" }));
}

function loadArmaturesRaw(): AnyRow[] {
  return loadCatalogue<AnyRow>(LS_ARMATURES, LS_ARMATURES_VER, armatures as unknown as AnyRow[], ARMATURES_VERSION, "model")
    .sort((a, b) => String(a.model ?? "").localeCompare(String(b.model ?? ""), undefined, { numeric: true, sensitivity: "base" }));
}

function loadCarbonBrushesRaw(): AnyRow[] {
  return loadCatalogue<AnyRow>(LS_CARBON_BRUSHES, LS_CARBON_BRUSHES_VER, carbonBrushes as unknown as AnyRow[], CARBON_BRUSHES_VERSION, "partNumber")
    .sort((a, b) => String(a.partNumber ?? "").localeCompare(String(b.partNumber ?? ""), undefined, { numeric: true, sensitivity: "base" }));
}

function loadVBeltsRaw(): AnyRow[] {
  return loadCatalogue<AnyRow>(LS_VBELTS, LS_VBELTS_VER, vBelts as unknown as AnyRow[], VBELTS_VERSION, "code")
    .sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? ""), undefined, { numeric: true, sensitivity: "base" }));
}

function loadChangelog(): ChangeEntry[] {
  try {
    const s = localStorage.getItem(LS_CHANGELOG);
    if (s) return JSON.parse(s) as ChangeEntry[];
  } catch {}
  return [];
}

/* ────────────────────────── helpers ────────────────────────── */
const PASSCODE = "0000";
const PASSCODE_LENGTH = 4;
const SKIP_DIFF_FIELDS = new Set(["rowId", "image", "userAdded"]);

function nextRowId(rows: AnyRow[]): number {
  if (rows.length === 0) return 1;
  return Math.max(...rows.map((r) => Number(r.rowId ?? 0))) + 1;
}

function nextChangeId(log: ChangeEntry[]): number {
  return log.length === 0 ? 1 : Math.max(...log.map((e) => e.id)) + 1;
}

function str(v: unknown): string { return String(v ?? ""); }
function num(v: unknown): number { return Number(v ?? 0); }

function sortByKey(arr: AnyRow[], key: string): AnyRow[] {
  return [...arr].sort((a, b) =>
    String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, { numeric: true, sensitivity: "base" })
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function snapshotSummary(snap: Record<string, unknown>): string {
  return Object.entries(snap)
    .filter(([k]) => !SKIP_DIFF_FIELDS.has(k))
    .map(([k, v]) => `${k}: ${String(v ?? "")}`)
    .join(" · ");
}

function diffSummary(before: Record<string, unknown>, after: Record<string, unknown>): string {
  const changes: string[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (SKIP_DIFF_FIELDS.has(k)) continue;
    if (String(before[k] ?? "") !== String(after[k] ?? "")) {
      changes.push(`${k}: "${String(before[k] ?? "")}" → "${String(after[k] ?? "")}"`);
    }
  }
  return changes.length > 0 ? changes.join(" · ") : "No field changes";
}

/** Save built-in tab data to the right localStorage key. */
function saveBuiltinTabData(tabId: string, rows: AnyRow[], cols: ColumnDef[]): void {
  if (tabId === "bearings") saveCatalogue(LS_BEARINGS, LS_BEARINGS_VER, rows, BEARINGS_VERSION);
  else if (tabId === "armatures") saveCatalogue(LS_ARMATURES, LS_ARMATURES_VER, rows, ARMATURES_VERSION);
  else if (tabId === "carbon-brushes") saveCatalogue(LS_CARBON_BRUSHES, LS_CARBON_BRUSHES_VER, rows, CARBON_BRUSHES_VERSION);
  else if (tabId === "v-belts") saveCatalogue(LS_VBELTS, LS_VBELTS_VER, rows, VBELTS_VERSION);
  else saveCustomTabData(tabId, rows, cols);
}

/** Number fields per built-in tab — used during CSV import type coercion. */
function getBuiltinNumFields(tabId: string): Set<string> {
  if (tabId === "bearings") return BEARING_NUM_FIELDS;
  if (tabId === "armatures") return ARMATURE_NUM_FIELDS;
  if (tabId === "carbon-brushes") return CARBON_BRUSH_NUM_FIELDS;
  if (tabId === "v-belts") return VBELT_NUM_FIELDS;
  return new Set();
}

/* ────────────────────────── reference images ────────────────────────── */
const TAB_REFERENCE_IMAGES: Record<string, { side?: { src: string; alt: string }; body?: { src: string; alt: string } }> = {
  bearings: { side: { src: bearingDiagram, alt: "Bearing diagram showing ID, OD, and Width" } },
  armatures: {
    body: {
      src: armatureDiagram,
      alt: "Armature diagram showing armature length, inner shaft length, stack tooth length, armature tooth diameter, commutator diameter, commutator end shaft diameter, fan base diameter, fan end shaft diameter, and fan diameter",
    },
  },
  "carbon-brushes": {
    body: { src: carbonBrushDiagram, alt: "Carbon brush diagram showing Thickness, Width, Length, and Spring Diameter" },
  },
  "v-belts": {
    body: {
      src: vBeltDiagram,
      alt: "V-belt cross-section diagram showing La (outer), Lp/Lw (pitch), Li (inner), bo (top width), bp (pitch width), and h (height)",
    },
  },
};

const TAB_DESCRIPTIONS: Record<string, { description: string; placeholder: string; title: string }> = {
  bearings: {
    title: "Bearing Finder",
    description: "Search by bearing number or dimensions (e.g. 6202, 15 35 11).",
    placeholder: "Search bearing number or ID/OD/Width (e.g. 6202 or 15 35 11)...",
  },
  armatures: {
    title: "Armature Finder",
    description: "Search by model, brand, dimensions, bearing, or fan type (e.g. Makita GA4030).",
    placeholder: "Search model, brand, or dimensions (e.g. Makita GA4030 or 38 608 65)...",
  },
  "carbon-brushes": {
    title: "Carbon Brush Finder",
    description: "Search by part number, alt part number, model, or dimensions (e.g. CB303, 6.5 8 13).",
    placeholder: "Search part number, model, or dimensions (e.g. CB303 or 6.5 8 13)...",
  },
  "v-belts": {
    title: "V-Belt Finder",
    description: "Search by belt code (e.g. B45) or by circumference / width / height dimensions.",
    placeholder: "Search code or dimensions (e.g. B45 or 114.3 110.8 117.8)...",
  },
};

function getTabMeta(tabId: string, tabs: TabMeta[]) {
  return tabs.find((t) => t.id === tabId);
}

/* ════════════════════════════ Home component ════════════════════════════ */
export default function Home() {
  /* ── tab list & schemas ── */
  const [tabList, setTabList] = useState<TabMeta[]>(() => loadTabList());
  const [schemas, setSchemas] = useState<Record<string, ColumnDef[]>>(() => {
    const tabs = loadTabList();
    const result: Record<string, ColumnDef[]> = {};
    for (const t of tabs) result[t.id] = loadTabSchema(t.id);
    return result;
  });

  /* ── row data: keyed by tabId ── */
  const [allTabData, setAllTabData] = useState<Record<string, AnyRow[]>>(() => {
    const base: Record<string, AnyRow[]> = {
      bearings: loadBearingsRaw(),
      armatures: loadArmaturesRaw(),
      "carbon-brushes": loadCarbonBrushesRaw(),
      "v-belts": loadVBeltsRaw(),
    };
    const tabs = loadTabList();
    for (const tab of tabs) {
      if (!BUILTIN_TAB_IDS.has(tab.id)) {
        const cols = loadTabSchema(tab.id);
        base[tab.id] = loadCustomTabData(tab.id, cols) as AnyRow[];
      }
    }
    return base;
  });

  /* ── UI state ── */
  const [activeTab, setActiveTab] = useState<string>(() => tabList[0]?.id ?? "bearings");
  const [moduleState, setModuleState] = useState<Record<string, FinderModuleState>>(() => {
    const init: Record<string, FinderModuleState> = {};
    for (const t of loadTabList()) {
      init[t.id] = createInitialFinderState(null, t.tolerance);
    }
    return init;
  });
  const [changelog, setChangelog] = useState<ChangeEntry[]>(() => loadChangelog());

  /* ── passcode / admin ── */
  const [digits, setDigits] = useState<string[]>(Array(PASSCODE_LENGTH).fill(""));
  const [isEditMode, setIsEditMode] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const importFileRef = useRef<HTMLInputElement>(null);

  /* ── inline rename state ── */
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  /* ════════ changelog helpers ════════ */
  const appendChange = (entry: Omit<ChangeEntry, "id" | "timestamp">) => {
    setChangelog((prev) => {
      const next: ChangeEntry[] = [
        { ...entry, id: nextChangeId(prev), timestamp: new Date().toISOString() },
        ...prev,
      ];
      localStorage.setItem(LS_CHANGELOG, JSON.stringify(next));
      return next;
    });
  };

  const clearChangelog = () => {
    setChangelog([]);
    localStorage.removeItem(LS_CHANGELOG);
  };

  const deleteChangelogEntry = (id: number) => {
    setChangelog((prev) => {
      const next = prev.filter((e) => e.id !== id);
      if (next.length === 0) localStorage.removeItem(LS_CHANGELOG);
      else localStorage.setItem(LS_CHANGELOG, JSON.stringify(next));
      return next;
    });
  };

  /* ════════ module state ════════ */
  const getModuleState = (tabId: string): FinderModuleState => {
    if (moduleState[tabId]) return moduleState[tabId];
    const meta = getTabMeta(tabId, tabList);
    return createInitialFinderState(null, meta?.tolerance ?? DEFAULT_TOLERANCE);
  };

  const updateModuleState = (tabId: string) => (next: FinderModuleState) => {
    setModuleState((prev) => ({ ...prev, [tabId]: next }));
  };

  /* ════════ passcode ════════ */
  const handlePasscodeDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < PASSCODE_LENGTH - 1) inputRefs[index + 1].current?.focus();
    if (next.every((d) => d !== "") && next.join("") === PASSCODE) {
      setIsEditMode(true);
      setDigits(Array(PASSCODE_LENGTH).fill(""));
    } else if (next.every((d) => d !== "") && next.join("") !== PASSCODE) {
      setDigits(Array(PASSCODE_LENGTH).fill(""));
      inputRefs[0].current?.focus();
    }
  };

  const handlePasscodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputRefs[index - 1].current?.focus();
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setDigits(Array(PASSCODE_LENGTH).fill(""));
    setRenamingTabId(null);
  };

  /* ════════ row CRUD ════════ */
  const onAddRow = async (tabId: string, data: Record<string, unknown>) => {
    const meta = getTabMeta(tabId, tabList);
    if (!meta) return;
    const rows = allTabData[tabId] ?? [];
    const newRow: AnyRow = { ...data, rowId: nextRowId(rows), userAdded: true };
    const updated = sortByKey([...rows, newRow], meta.idField);
    setAllTabData((prev) => ({ ...prev, [tabId]: updated }));
    saveBuiltinTabData(tabId, updated, schemas[tabId] ?? []);
    appendChange({
      action: "add",
      partType: tabList.find((t) => t.id === tabId)?.label ?? tabId,
      partId: str(data[meta.idField]),
      snapshot: { ...newRow },
    });
  };

  const onUpdateRow = async (tabId: string, rowId: number, data: Record<string, unknown>) => {
    const meta = getTabMeta(tabId, tabList);
    if (!meta) return;
    const rows = allTabData[tabId] ?? [];
    const oldRow = rows.find((r) => Number(r.rowId) === rowId);
    const updated = sortByKey(
      rows.map((r) => (Number(r.rowId) === rowId ? { ...r, ...data } : r)),
      meta.idField
    );
    setAllTabData((prev) => ({ ...prev, [tabId]: updated }));
    saveBuiltinTabData(tabId, updated, schemas[tabId] ?? []);
    appendChange({
      action: "edit",
      partType: tabList.find((t) => t.id === tabId)?.label ?? tabId,
      partId: str(data[meta.idField]),
      snapshot: { ...data },
      before: oldRow ? { ...oldRow } : undefined,
    });
  };

  const onDeleteRow = async (tabId: string, rowId: number) => {
    const meta = getTabMeta(tabId, tabList);
    if (!meta) return;
    const rows = allTabData[tabId] ?? [];
    const oldRow = rows.find((r) => Number(r.rowId) === rowId);
    const updated = rows.filter((r) => Number(r.rowId) !== rowId);
    setAllTabData((prev) => ({ ...prev, [tabId]: updated }));
    saveBuiltinTabData(tabId, updated, schemas[tabId] ?? []);
    appendChange({
      action: "delete",
      partType: tabList.find((t) => t.id === tabId)?.label ?? tabId,
      partId: str(oldRow?.[meta.idField] ?? String(rowId)),
      snapshot: oldRow ? { ...oldRow } : {},
    });
  };

  /* ════════ export / import ════════ */
  const handleExport = () => {
    if (activeTab === "changes") return;
    const rows = allTabData[activeTab] ?? [];
    const csv = toCsv(rows as FinderRow[]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `ptpf-${activeTab}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const { headers, rows: csvRows } = parseCsv(text);
        if (!headers.length || !csvRows.length) {
          alert("The CSV file appears to be empty.");
          e.target.value = "";
          return;
        }
        const detectedId = detectTabFromCsv(headers);
        if (!detectedId) {
          alert("Could not detect which catalogue this CSV belongs to.\nMake sure it was exported from this app.");
          e.target.value = "";
          return;
        }

        const meta = getTabMeta(detectedId, tabList);
        if (!meta) {
          e.target.value = "";
          return;
        }

        /* ── auto-column: add unknown headers as Specifications ── */
        let currentSchema = schemas[detectedId] ?? [];
        const knownKeys = new Set([
          ...currentSchema.map((c) => c.key),
          ...meta.hiddenFields,
          "rowId",
          "userAdded",
        ]);
        const unknownHeaders = headers.filter((h) => !knownKeys.has(h));
        if (unknownHeaders.length > 0) {
          const newCols: ColumnDef[] = unknownHeaders.map((h) => ({ key: h, label: h, type: "specifications" }));
          const updatedSchema = [...currentSchema, ...newCols];
          currentSchema = updatedSchema;
          setSchemas((prev) => ({ ...prev, [detectedId]: updatedSchema }));
          saveTabSchema(detectedId, updatedSchema);

          /* add empty values for the new columns to all existing rows */
          const existingRows = allTabData[detectedId] ?? [];
          const paddedRows = existingRows.map((r) => {
            const row = { ...r };
            for (const col of newCols) if (!(col.key in row)) row[col.key] = "";
            return row;
          });
          setAllTabData((prev) => ({ ...prev, [detectedId]: paddedRows }));
          saveBuiltinTabData(detectedId, paddedRows, currentSchema);
        }

        /* ── numeric fields: built-in set + dimension columns from schema ── */
        const numFields = new Set([
          ...getBuiltinNumFields(detectedId),
          ...currentSchema.filter((c) => c.type === "dimensions").map((c) => c.key),
        ]);

        /* ── upsert rows ── */
        const currentRows = allTabData[detectedId] ?? [];
        const map = new Map(currentRows.map((r) => [str(r[meta.idField]), r]));
        let added = 0, updated = 0;
        let id = nextRowId(currentRows);

        for (const raw of csvRows) {
          const d = csvRowToRecord(raw, numFields);
          const key = str(d[meta.idField]);
          if (!key) continue;
          if (map.has(key)) {
            map.set(key, { ...map.get(key)!, ...d });
            updated++;
          } else {
            map.set(key, { ...d, rowId: id++ });
            added++;
          }
        }

        const result = sortByKey([...map.values()], meta.idField);
        setAllTabData((prev) => ({ ...prev, [detectedId]: result }));
        saveBuiltinTabData(detectedId, result, currentSchema);
        setActiveTab(detectedId);
        alert(`Import complete: ${added} row(s) added, ${updated} row(s) updated.${unknownHeaders.length > 0 ? `\nAlso added ${unknownHeaders.length} new column(s): ${unknownHeaders.join(", ")}.` : ""}`);
      } catch {
        alert("Could not read the file. Make sure it is a valid CSV export from this app.");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  /* ════════ column management ════════ */
  const handleAddColumn = (tabId: string, key: string, label: string, type: ColumnDef["type"]) => {
    const currentSchema = schemas[tabId] ?? [];
    if (currentSchema.some((c) => c.key === key)) {
      alert(`A column with key "${key}" already exists.`);
      return;
    }
    const newCol: ColumnDef = { key, label, type };
    const updatedSchema = [...currentSchema, newCol];
    setSchemas((prev) => ({ ...prev, [tabId]: updatedSchema }));
    saveTabSchema(tabId, updatedSchema);

    const rows = allTabData[tabId] ?? [];
    const updatedRows = rows.map((r) => ({ ...r, [key]: type === "dimensions" ? 0 : "" }));
    setAllTabData((prev) => ({ ...prev, [tabId]: updatedRows }));
    saveBuiltinTabData(tabId, updatedRows, updatedSchema);
  };

  const handleRenameColumn = (tabId: string, key: string, newLabel: string) => {
    const currentSchema = schemas[tabId] ?? [];
    const updatedSchema = currentSchema.map((c) => c.key === key ? { ...c, label: newLabel } : c);
    setSchemas((prev) => ({ ...prev, [tabId]: updatedSchema }));
    saveTabSchema(tabId, updatedSchema);
  };

  const handleDuplicateColumn = (tabId: string, key: string) => {
    const currentSchema = schemas[tabId] ?? [];
    const col = currentSchema.find((c) => c.key === key);
    if (!col) return;
    const existingIds = new Set(currentSchema.map((c) => c.key));
    let newKey = `${key}_copy`;
    let i = 2;
    while (existingIds.has(newKey)) newKey = `${key}_copy${i++}`;
    const newLabel = `${col.label} (copy)`;
    const idx = currentSchema.findIndex((c) => c.key === key);
    const updatedSchema = [
      ...currentSchema.slice(0, idx + 1),
      { key: newKey, label: newLabel, type: col.type },
      ...currentSchema.slice(idx + 1),
    ];
    setSchemas((prev) => ({ ...prev, [tabId]: updatedSchema }));
    saveTabSchema(tabId, updatedSchema);

    const rows = allTabData[tabId] ?? [];
    const updatedRows = rows.map((r) => ({ ...r, [newKey]: r[key] ?? (col.type === "dimensions" ? 0 : "") }));
    setAllTabData((prev) => ({ ...prev, [tabId]: updatedRows }));
    saveBuiltinTabData(tabId, updatedRows, updatedSchema);
  };

  const handleReorderColumns = (tabId: string, orderedKeys: string[]) => {
    const currentSchema = schemas[tabId] ?? [];
    const keySet = new Set(orderedKeys);
    const reordered: ColumnDef[] = [
      ...orderedKeys.map((k) => currentSchema.find((c) => c.key === k)).filter((c): c is ColumnDef => c !== undefined),
      ...currentSchema.filter((c) => !keySet.has(c.key)),
    ];
    setSchemas((prev) => ({ ...prev, [tabId]: reordered }));
    saveTabSchema(tabId, reordered);
  };

  const handleDeleteColumn = (tabId: string, key: string) => {
    const currentSchema = schemas[tabId] ?? [];
    const meta = getTabMeta(tabId, tabList);
    if (meta && meta.idField === key) {
      alert("Cannot delete the primary ID column.");
      return;
    }
    const updatedSchema = currentSchema.filter((c) => c.key !== key);
    setSchemas((prev) => ({ ...prev, [tabId]: updatedSchema }));
    saveTabSchema(tabId, updatedSchema);

    const rows = allTabData[tabId] ?? [];
    const updatedRows: AnyRow[] = rows.map((r) => {
      const copy = { ...r };
      delete (copy as Record<string, unknown>)[key];
      return copy;
    });
    setAllTabData((prev) => ({ ...prev, [tabId]: updatedRows }));
    saveBuiltinTabData(tabId, updatedRows, updatedSchema);
  };

  /* ════════ tab management ════════ */
  const startRenameTab = (tabId: string) => {
    const meta = getTabMeta(tabId, tabList);
    if (!meta) return;
    setRenamingTabId(tabId);
    setRenameValue(meta.label);
  };

  const commitRenameTab = (tabId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenamingTabId(null); return; }
    const updated = tabList.map((t) => t.id === tabId ? { ...t, label: trimmed } : t);
    setTabList(updated);
    saveTabList(updated);
    setRenamingTabId(null);
  };

  const handleAddTab = () => {
    const label = prompt("New tab name:")?.trim();
    if (!label) return;
    const existingIds = new Set(tabList.map((t) => t.id));
    const id = slugify(label, existingIds);
    const newMeta: TabMeta = {
      id,
      label,
      builtIn: false,
      idField: "name",
      hiddenFields: ["rowId", "userAdded"],
      tolerance: 2,
    };
    const defaultSchema: ColumnDef[] = [{ key: "name", label: "Name", type: "text" }];
    const updated = [...tabList, newMeta];
    setTabList(updated);
    saveTabList(updated);
    setSchemas((prev) => ({ ...prev, [id]: defaultSchema }));
    saveTabSchema(id, defaultSchema);
    setAllTabData((prev) => ({ ...prev, [id]: [] }));
    setModuleState((prev) => ({ ...prev, [id]: createInitialFinderState(null, newMeta.tolerance) }));
    setActiveTab(id);
  };

  const handleDuplicateTab = (tabId: string) => {
    const meta = getTabMeta(tabId, tabList);
    if (!meta) return;
    const label = prompt("Name for the duplicate tab:", `${meta.label} copy`)?.trim();
    if (!label) return;
    const existingIds = new Set(tabList.map((t) => t.id));
    const id = slugify(label, existingIds);
    const newMeta: TabMeta = { ...meta, id, label, builtIn: false };
    const copiedSchema = [...(schemas[tabId] ?? [])];
    const sourceRows = allTabData[tabId] ?? [];
    const copiedRows = sourceRows.map((r, i) => ({ ...r, rowId: i + 1 }));

    const updated = [...tabList, newMeta];
    setTabList(updated);
    saveTabList(updated);
    setSchemas((prev) => ({ ...prev, [id]: copiedSchema }));
    saveTabSchema(id, copiedSchema);
    setAllTabData((prev) => ({ ...prev, [id]: copiedRows }));
    saveCustomTabData(id, copiedRows, copiedSchema);
    setModuleState((prev) => ({ ...prev, [id]: createInitialFinderState(null, newMeta.tolerance) }));
    setActiveTab(id);
  };

  const handleDeleteTab = (tabId: string) => {
    const meta = getTabMeta(tabId, tabList);
    if (!meta || meta.builtIn) return;
    if (!window.confirm(`Delete tab "${meta.label}" and all its rows? This cannot be undone.`)) return;
    const updated = tabList.filter((t) => t.id !== tabId);
    setTabList(updated);
    saveTabList(updated);
    localStorage.removeItem(`ptpf:schema:${tabId}`);
    localStorage.removeItem(`ptpf:data:${tabId}`);
    localStorage.removeItem(customDataVersionKey(tabId));
    setSchemas((prev) => { const n = { ...prev }; delete n[tabId]; return n; });
    setAllTabData((prev) => { const n = { ...prev }; delete n[tabId]; return n; });
    if (activeTab === tabId) setActiveTab(updated[0]?.id ?? "bearings");
  };

  /* ════════ badge / UI helpers ════════ */
  const actionBadge = (action: ChangeEntry["action"]) => {
    if (action === "add") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 font-mono text-xs">Added</Badge>;
    if (action === "edit") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 font-mono text-xs">Edited</Badge>;
    return <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 font-mono text-xs">Deleted</Badge>;
  };

  /* ════════ derived config for the active module tab ════════ */
  const activeModuleTabId = activeTab === "changes" ? null : activeTab;

  /* ════════ render ════════ */
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header */}
      <header className="flex-none bg-card border-b border-border px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3 text-primary">
          <Settings2 className="w-6 h-6" />
          <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Universal Power Tool Parts Finder
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {isEditMode ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 px-2.5 py-1 rounded-md uppercase tracking-widest">
                Admin Mode
              </span>
              <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1.5" onClick={handleExport} title="Export current tab as CSV">
                <Upload className="w-3.5 h-3.5" /> Export
              </Button>
              <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1.5" onClick={() => importFileRef.current?.click()} title="Import catalogue from a CSV file (upsert by key ID)">
                <Download className="w-3.5 h-3.5" /> Import
              </Button>
              <input ref={importFileRef} type="file" accept="text/csv,.csv" className="hidden" onChange={handleImportFile} />
              <Button size="icon" variant="outline" className="h-8 w-8 border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" onClick={exitEditMode} title="Exit admin mode">
                <Lock className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {inputRefs.map((ref, i) => (
                <input
                  key={i}
                  ref={ref}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digits[i]}
                  onChange={(e) => handlePasscodeDigit(i, e.target.value)}
                  onKeyDown={(e) => handlePasscodeKeyDown(i, e)}
                  className="w-8 h-8 text-center font-mono text-sm bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50 caret-transparent"
                  aria-label={`Passcode digit ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        {/* Tab bar */}
        <div className="flex-none px-6 pt-4 bg-card/20 border-b border-border">
          <TabsList className="h-12 flex-wrap">
            {tabList.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="px-6 text-base font-semibold">
                {renamingTabId === tab.id ? (
                  <input
                    autoFocus
                    className="bg-transparent border-b border-amber-500 outline-none text-base font-semibold w-28"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRenameTab(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRenameTab(tab.id);
                      if (e.key === "Escape") setRenamingTabId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : tab.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="changes" className="px-6 text-base font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Changes
              {changelog.length > 0 && (
                <span className="ml-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-primary/15 text-primary text-xs font-bold font-mono flex items-center justify-center">
                  {changelog.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Admin tab management toolbar */}
        {isEditMode && activeModuleTabId && (
          <div className="flex-none px-6 py-2 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
            <span className="text-xs font-mono text-amber-600 mr-1">Tab:</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/40 flex items-center gap-1"
              onClick={() => startRenameTab(activeModuleTabId)}
              title="Rename this tab"
            >
              <Pencil className="w-3 h-3" /> Rename
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/40 flex items-center gap-1"
              onClick={handleAddTab}
              title="Add a new blank tab"
            >
              <Plus className="w-3 h-3" /> Add tab
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/40 flex items-center gap-1"
              onClick={() => handleDuplicateTab(activeModuleTabId)}
              title="Duplicate this tab (copies schema and rows)"
            >
              <Copy className="w-3 h-3" /> Duplicate tab
            </Button>
            {!getTabMeta(activeModuleTabId, tabList)?.builtIn && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-1"
                onClick={() => handleDeleteTab(activeModuleTabId)}
                title="Delete this tab"
              >
                <Trash2 className="w-3 h-3" /> Delete tab
              </Button>
            )}
          </div>
        )}

        {/* Module tab contents */}
        {tabList.map((tab) => {
          const meta = tab;
          const schema = schemas[tab.id] ?? [];
          const config = buildFinderConfig(meta, schema);
          const data = allTabData[tab.id] ?? [];
          const imgs = TAB_REFERENCE_IMAGES[tab.id];
          const texts = TAB_DESCRIPTIONS[tab.id];
          return (
            <TabsContent key={tab.id} value={tab.id} className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden" forceMount>
              <FinderModule
                title={texts?.title ?? meta.label}
                description={texts?.description ?? `Search ${meta.label}.`}
                placeholder={texts?.placeholder ?? `Search ${meta.label}...`}
                data={data as FinderRow[]}
                config={config}
                state={getModuleState(tab.id)}
                onStateChange={updateModuleState(tab.id)}
                referenceImage={imgs?.side}
                bodyReferenceImage={imgs?.body}
                isEditMode={isEditMode}
                onAddRow={(d) => onAddRow(tab.id, d)}
                onUpdateRow={(rowId, d) => onUpdateRow(tab.id, rowId, d)}
                onDeleteRow={(rowId) => onDeleteRow(tab.id, rowId)}
                onAddColumn={(key, label, type) => handleAddColumn(tab.id, key, label, type)}
                onRenameColumn={(key, newLabel) => handleRenameColumn(tab.id, key, newLabel)}
                onDuplicateColumn={(key) => handleDuplicateColumn(tab.id, key)}
                onDeleteColumn={(key) => handleDeleteColumn(tab.id, key)}
                schemaColumnKeys={schema.map((c) => c.key)}
                columnOrder={schema.map((c) => c.key)}
                onReorderColumns={(orderedKeys) => handleReorderColumns(tab.id, orderedKeys)}
              />
            </TabsContent>
          );
        })}

        {/* Changes tab */}
        <TabsContent value="changes" className="flex-1 min-h-0 mt-0 overflow-auto data-[state=inactive]:hidden" forceMount>
          <div className="flex flex-col h-full">
            <div className="flex-none px-6 py-4 border-b border-border bg-card/30 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Admin Change Log</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Every add, edit, and delete made in admin mode — newest first. Stored locally on this PC.
                </p>
              </div>
              {isEditMode && changelog.length > 0 && (
                <Button
                  variant="outline" size="sm"
                  onClick={() => { if (window.confirm("Clear the entire change log? This cannot be undone.")) clearChangelog(); }}
                  className="h-8 text-xs font-mono text-destructive border-destructive/40 hover:bg-destructive/5 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" /> CLEAR LOG
                </Button>
              )}
            </div>

            {changelog.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center border border-border">
                  <ClipboardList className="w-8 h-8 opacity-40" />
                </div>
                <p className="text-lg font-medium text-foreground mb-1">No changes yet</p>
                <p className="text-sm">Admin edits (add, edit, delete) will appear here.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="h-9 px-4 text-left font-bold uppercase text-xs tracking-wider text-muted-foreground whitespace-nowrap sticky top-0 z-10 bg-card shadow-sm">Time</th>
                      <th className="h-9 px-4 text-left font-bold uppercase text-xs tracking-wider text-muted-foreground sticky top-0 z-10 bg-card shadow-sm">Action</th>
                      <th className="h-9 px-4 text-left font-bold uppercase text-xs tracking-wider text-muted-foreground sticky top-0 z-10 bg-card shadow-sm">Part Type</th>
                      <th className="h-9 px-4 text-left font-bold uppercase text-xs tracking-wider text-muted-foreground whitespace-nowrap sticky top-0 z-10 bg-card shadow-sm">Part ID</th>
                      <th className="h-9 px-4 text-left font-bold uppercase text-xs tracking-wider text-muted-foreground sticky top-0 z-10 bg-card shadow-sm">Details</th>
                      {isEditMode && <th className="h-9 px-2 w-10 sticky top-0 z-10 bg-card shadow-sm" />}
                    </tr>
                  </thead>
                  <tbody>
                    {changelog.map((entry) => (
                      <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors align-top">
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(entry.timestamp)}</td>
                        <td className="px-4 py-2.5">{actionBadge(entry.action)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{entry.partType}</td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-primary text-sm whitespace-nowrap">{entry.partId}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground leading-relaxed max-w-xl">
                          {entry.action === "edit" && entry.before ? diffSummary(entry.before, entry.snapshot) : snapshotSummary(entry.snapshot)}
                        </td>
                        {isEditMode && (
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => deleteChangelogEntry(entry.id)} className="p-1 rounded text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete this entry">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
