/**
 * Versioned catalogue storage helpers.
 *
 * Each catalogue (bearings, armatures, carbon brushes) is stored in
 * localStorage alongside a version string that matches the version exported
 * from its static data file.  On every load the stored version is compared to
 * the current static version:
 *
 *   - Same version  → return stored data as-is (admin edits are untouched).
 *   - Different version → merge stored data with the new defaults and
 *     re-persist under the new version number.
 *
 * Merge strategy ("keep-user-additions"):
 *   1. Walk the new defaults row-by-row, skipping any default whose idField
 *      value matches a stored row tagged `userAdded: true` (those rows "own"
 *      that ID and take precedence).  For all remaining defaults, if a stored
 *      row exists with the same idField value, keep the stored version
 *      (preserving any admin edits to that row).  Otherwise take the new
 *      default row.
 *   2. Append stored rows that are explicitly tagged `userAdded: true`.
 *   3. For backward-compatibility with data written before the tag existed,
 *      also append any untagged stored rows whose idField value does not
 *      appear in the new defaults at all.
 *
 * This means:
 *   - New default rows added in a release are automatically picked up.
 *   - Default rows removed in a release are dropped (they won't appear in the
 *     new defaults base, and any admin edits to them are discarded too).
 *   - Admin edits to existing rows survive upgrades.
 *   - Admin-added rows (tagged `userAdded: true`) always survive, even if a
 *     default with the same ID is added later.
 *   - Untagged rows not present in any release's defaults also survive
 *     (backward compatibility).
 */

export type RowWithId = { rowId: number; userAdded?: boolean; [key: string]: unknown };

/**
 * Merge a stored catalogue snapshot with fresh defaults.
 *
 * @param stored   Rows previously persisted in localStorage (may have admin edits).
 * @param defaults Fresh default rows with rowIds already assigned.
 * @param idField  The field that uniquely identifies a logical catalogue entry
 *                 (e.g. "bearing", "equivalentModel", "partNumber").
 */
export function mergeWithDefaults<T extends RowWithId>(
  stored: T[],
  defaults: T[],
  idField: string,
): T[] {
  const storedById = new Map<unknown, T>(stored.map((r) => [r[idField], r]));
  const defaultIds = new Set<unknown>(defaults.map((r) => r[idField]));

  // IDs that belong to explicitly user-added rows — these take precedence over
  // any default that may coincidentally share the same ID.
  const userAddedIds = new Set<unknown>(
    stored.filter((r) => r.userAdded === true).map((r) => r[idField]),
  );

  // Step 1: walk defaults, skipping IDs owned by user-added rows.
  const merged: T[] = defaults
    .filter((d) => !userAddedIds.has(d[idField]))
    .map((d) => (storedById.get(d[idField]) ?? d) as T);

  // Step 2 & 3: append user-added rows (tagged OR untagged-not-in-defaults for
  // backward compatibility with data written before the tag existed).
  for (const row of stored) {
    if (row.userAdded === true || !defaultIds.has(row[idField])) {
      merged.push(row);
    }
  }

  return merged;
}

/**
 * Load a catalogue from localStorage, merging with defaults when the stored
 * version is outdated.  Falls back to plain defaults if localStorage is empty
 * or unreadable.
 *
 * @param lsDataKey     localStorage key for the catalogue rows.
 * @param lsVersionKey  localStorage key for the stored version string.
 * @param defaults      Raw default rows (without rowId).
 * @param currentVersion  Version string exported from the data file.
 * @param idField       Field used to identify a row across versions.
 */
export function loadCatalogue<T extends RowWithId>(
  lsDataKey: string,
  lsVersionKey: string,
  defaults: Omit<T, "rowId">[],
  currentVersion: string,
  idField: string,
): T[] {
  const defaultRows = defaults.map(
    (d, i) => ({ ...d, rowId: i + 1 }) as T,
  );

  try {
    const rawData = localStorage.getItem(lsDataKey);
    if (!rawData) return defaultRows;

    const stored = JSON.parse(rawData) as T[];
    const storedVersion = localStorage.getItem(lsVersionKey);

    if (storedVersion === currentVersion) {
      return stored;
    }

    const merged = mergeWithDefaults(stored, defaultRows, idField);

    localStorage.setItem(lsDataKey, JSON.stringify(merged));
    localStorage.setItem(lsVersionKey, currentVersion);

    return merged;
  } catch {
    return defaultRows;
  }
}

/**
 * Persist catalogue rows and the current version to localStorage.
 */
export function saveCatalogue<T extends RowWithId>(
  lsDataKey: string,
  lsVersionKey: string,
  rows: T[],
  currentVersion: string,
): void {
  localStorage.setItem(lsDataKey, JSON.stringify(rows));
  localStorage.setItem(lsVersionKey, currentVersion);
}
