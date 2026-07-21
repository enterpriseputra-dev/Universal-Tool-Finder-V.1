/**
 * Generic, reusable search engine shared by every finder module (Bearings,
 * Armatures, Carbon Brushes, and any future module). Generalizes the
 * tolerance-based numeric matching + dynamic column derivation originally
 * built for the standalone Bearing Selector app (`bearing-search.ts`).
 *
 * Each module supplies a `FinderConfig` describing which fields are
 * numeric "dimension" fields (fuzzy/tolerance matched) vs. free-text
 * fields (partial, case-insensitive, multi-keyword matched), plus which
 * field (if any) holds an image URL. Columns and filters are derived from
 * the dataset shape at runtime, never hardcoded.
 */

export type FinderRow = Record<string, unknown>;

export interface FinderConfig {
  /** Unique key field used for React list keys. */
  idField: string;
  /** Fields that hold numeric dimensions and should use tolerance matching. */
  dimensionFields: string[];
  /** Field holding an image URL, if this module has one. */
  imageField?: string;
  /** Default +/- tolerance (in the dataset's units) for dimension matching. */
  tolerance?: number;
  /** Optional friendly labels for column headers, keyed by field name. */
  columnLabels?: Record<string, string>;
  /**
   * Categorical fields (bounded set of values, e.g. Brand/Type) that should
   * render as dropdown filters in the parameter sidebar. Omit fields that
   * are free-text/high-cardinality (e.g. a compatible-models description).
   */
  filterFields?: string[];
  /**
   * Fields to exclude from the display table and from text search. Use this
   * to hide internal DB fields (e.g. "rowId") that are needed for CRUD
   * operations but should not be visible to end users.
   */
  hiddenFields?: string[];
}

/** Per-field numeric dimension inputs entered in the parameter sidebar. */
export type DimensionInputs = Record<string, string>;
/** Per-field selected dropdown value in the parameter sidebar ("all" = no filter). */
export type CategoryFilters = Record<string, string>;

/** Unique, sorted values for a given column — used to populate a dropdown. */
export function getUniqueValues(data: FinderRow[], column: string): string[] {
  const values = new Set<string>();
  for (const row of data) {
    const value = row[column];
    if (value !== undefined && value !== null && value !== "") values.add(String(value));
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

function parseDimensionInput(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Sidebar parameter filtering: a row matches when every entered dimension is
 * within +/- tolerance AND every selected dropdown filter matches exactly.
 * Blank dimension inputs and "all" dropdown selections are ignored. This is
 * applied in addition to (AND'd with) the universal search box.
 */
export function filterRows<T extends FinderRow>(
  data: T[],
  config: FinderConfig,
  dimensionValues: DimensionInputs,
  filterValues: CategoryFilters,
  tolerance: number,
): T[] {
  const activeDimensions = config.dimensionFields
    .map((field) => ({ field, value: parseDimensionInput(dimensionValues[field]) }))
    .filter((entry) => entry.value !== null) as { field: string; value: number }[];

  const activeFilters = Object.entries(filterValues).filter(
    ([, value]) => value && value !== "all",
  );

  if (activeDimensions.length === 0 && activeFilters.length === 0) return data;

  return data.filter((row) => {
    for (const { field, value } of activeDimensions) {
      const rowValue = Number(row[field]);
      if (!Number.isFinite(rowValue) || Math.abs(rowValue - value) > tolerance) return false;
    }
    for (const [column, selected] of activeFilters) {
      if (String(row[column] ?? "") !== selected) return false;
    }
    return true;
  });
}

export const DEFAULT_TOLERANCE = 2;

/**
 * Returns every column key present on the dataset rows (order-preserving,
 * based on the first row) so the UI can generate table columns dynamically
 * without hardcoding field names.
 */
export function getColumns(data: FinderRow[]): string[] {
  if (data.length === 0) return [];
  return Object.keys(data[0]);
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function tokenize(query: string): string[] {
  return normalize(query)
    .split(" ")
    .map((t) => t.trim())
    .filter(Boolean);
}

function isNumericToken(token: string): boolean {
  return token !== "" && Number.isFinite(Number(token));
}

function fieldValueMatchesText(value: unknown, token: string): boolean {
  if (value === undefined || value === null) return false;
  return String(value).toLowerCase().includes(token);
}

/**
 * Core matching logic for the single universal search box:
 *  - Blank query matches everything.
 *  - Non-numeric tokens are matched as case-insensitive partial substrings
 *    against any non-dimension, non-image field on the row.
 *  - Numeric-looking tokens are ambiguous: they could be a dimension value
 *    (e.g. "35" for an OD) or a purely numeric identifier/part number (e.g.
 *    bearing "6202"). Each numeric token is therefore matched independently:
 *    first try to fuzzy-match it (+/- tolerance) against an unclaimed
 *    dimension field; if that fails, fall back to a text-substring match
 *    against the identifier/text fields. This lets mixed queries like
 *    "38 608 65" (armature dimensions) and "15 6202" (dimension + part
 *    number) both resolve correctly, alongside pure-identifier queries like
 *    "6202" and pure-dimension queries like "15 35 11".
 *  - All tokens (numeric and text) must find a match for the row to qualify
 *    (AND semantics across tokens), enabling multi-keyword searches like
 *    "Makita GA4030" or "6202" or "15 35 11" or "38 608 65".
 */
export function searchRows<T extends FinderRow>(
  data: T[],
  query: string,
  config: FinderConfig,
): T[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return data;

  const tolerance = config.tolerance ?? DEFAULT_TOLERANCE;
  const dimensionFields = config.dimensionFields;
  const hidden = new Set(config.hiddenFields ?? []);
  const textFields = getColumns(data).filter(
    (col) => !dimensionFields.includes(col) && col !== config.imageField && !hidden.has(col),
  );

  const numericTokens = tokens.filter(isNumericToken).map((raw) => ({ raw, value: Number(raw) }));
  const textTokens = tokens.filter((t) => !isNumericToken(t));

  return data.filter((row) => {
    // Each numeric token independently matches an unclaimed dimension field
    // (fuzzy, +/- tolerance) OR any text/identifier field (substring). This
    // allows a single query to mix dimension values and identifiers freely.
    const claimed = new Set<string>();
    for (const { raw, value } of numericTokens) {
      const dimensionMatch = dimensionFields.find((field) => {
        if (claimed.has(field)) return false;
        const rowValue = Number(row[field]);
        return Number.isFinite(rowValue) && Math.abs(rowValue - value) <= tolerance;
      });
      if (dimensionMatch) {
        claimed.add(dimensionMatch);
        continue;
      }
      const textMatch = textFields.some((field) => fieldValueMatchesText(row[field], raw));
      if (!textMatch) return false;
    }

    // Free-text keyword matching (AND across tokens, OR across fields)
    for (const token of textTokens) {
      const matched = textFields.some((field) => fieldValueMatchesText(row[field], token));
      if (!matched) return false;
    }

    return true;
  });
}

export type SortDirection = "asc" | "desc";

/** Per-module search/sort/filter state, lifted to the parent so it
 * survives tab switches regardless of how the tab content is mounted. */
export interface FinderModuleState {
  query: string;
  sortColumn: string | null;
  sortDirection: SortDirection;
  dimensionValues: DimensionInputs;
  filterValues: CategoryFilters;
  tolerance: number;
}

export function createInitialFinderState(
  defaultSortColumn: string | null = null,
  tolerance: number = DEFAULT_TOLERANCE,
): FinderModuleState {
  return {
    query: "",
    sortColumn: defaultSortColumn,
    sortDirection: "asc",
    dimensionValues: {},
    filterValues: {},
    tolerance,
  };
}

export function sortRows<T extends FinderRow>(
  data: T[],
  column: string | null,
  direction: SortDirection,
): T[] {
  if (!column) return data;
  const sorted = [...data].sort((a, b) => {
    const aValue = a[column];
    const bValue = b[column];
    if (typeof aValue === "number" && typeof bValue === "number") {
      return aValue - bValue;
    }
    return String(aValue ?? "").localeCompare(String(bValue ?? ""));
  });
  return direction === "asc" ? sorted : sorted.reverse();
}
