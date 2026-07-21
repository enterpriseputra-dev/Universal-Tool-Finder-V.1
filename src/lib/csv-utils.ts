export type FinderRow = Record<string, unknown>;
export type ModuleKey = "bearings" | "armatures" | "carbon-brushes" | "v-belts";

export const HIDDEN_EXPORT_FIELDS = new Set(["rowId", "image"]);

export const BEARING_NUM_FIELDS = new Set(["id", "od", "width"]);
export const ARMATURE_NUM_FIELDS = new Set([
  "model", "armatureLength", "innerShaftLength", "stackLength",
  "coreDiameter", "commutatorDiameter", "fanSeatDiameter",
  "commutatorEndShaftDiameter", "fanEndShaftDiameter", "fanDiameter",
]);
export const CARBON_BRUSH_NUM_FIELDS = new Set(["thickness", "width", "length", "springDiameter"]);
export const VBELT_NUM_FIELDS = new Set(["lp", "li", "la", "topWidth", "pitchWidth", "height", "minPulleyDia"]);

export function toCsv(rows: FinderRow[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]).filter((k) => !HIDDEN_EXPORT_FIELDS.has(k));
  const esc = (v: unknown): string => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes("\n") || s.includes('"'))
      return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const parseRow = (line: string): string[] => {
    const out: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).filter((l) => l.trim()).map((l) => {
    const vals = parseRow(l);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
  return { headers, rows };
}

export function detectTabFromCsv(headers: string[]): ModuleKey | null {
  const h = new Set(headers);
  if (h.has("armatureLength")) return "armatures";
  if (h.has("partNumber")) return "carbon-brushes";
  if (h.has("lp") && h.has("li")) return "v-belts";
  if (h.has("bearing") && h.has("od")) return "bearings";
  return null;
}

export function csvRowToRecord(
  raw: Record<string, string>,
  numFields: Set<string>,
): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    r[k] = numFields.has(k) ? (v === "" ? 0 : Number(v)) : v;
  }
  return r;
}
