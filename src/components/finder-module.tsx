import { useMemo, useState, useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  GripVertical,
  ImageOff,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  FinderConfig,
  FinderRow,
  FinderModuleState,
  createInitialFinderState,
  searchRows,
  filterRows,
  sortRows,
  getColumns,
  getUniqueValues,
  DEFAULT_TOLERANCE,
  SortDirection,
  DimensionInputs,
  CategoryFilters,
} from "@/lib/finder-search";
import type { ColumnType } from "@/lib/tab-schema";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type { FinderModuleState };
export { createInitialFinderState };

interface FinderModuleProps<T extends FinderRow> {
  title: string;
  description: string;
  placeholder: string;
  data: T[];
  config: FinderConfig;
  state: FinderModuleState;
  onStateChange: (next: FinderModuleState) => void;
  referenceImage?: { src: string; alt: string };
  bodyReferenceImage?: { src: string; alt: string };
  isEditMode?: boolean;
  onAddRow?: (data: Record<string, unknown>) => Promise<void>;
  onUpdateRow?: (rowId: number, data: Record<string, unknown>) => Promise<void>;
  onDeleteRow?: (rowId: number) => Promise<void>;
  /** Keys of columns in the current schema (used to determine user-added vs system columns). */
  schemaColumnKeys?: string[];
  /** Called when admin adds a new column. */
  onAddColumn?: (key: string, label: string, type: ColumnType) => void;
  /** Called when admin renames a column (by key). */
  onRenameColumn?: (key: string, newLabel: string) => void;
  /** Called when admin duplicates a column. */
  onDuplicateColumn?: (key: string) => void;
  /** Called when admin deletes a column. */
  onDeleteColumn?: (key: string) => void;
  /** Ordered list of column keys from the schema — controls display and sidebar order. */
  columnOrder?: string[];
  /** Called when admin drag-reorders columns; receives the new ordered key list. */
  onReorderColumns?: (orderedKeys: string[]) => void;
}

function toDisplayLabel(column: string, columnLabels?: Record<string, string>): string {
  if (columnLabels?.[column]) return columnLabels[column];
  const spaced = column.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

interface EditDialogState {
  row: Record<string, unknown>;
  isNew: boolean;
}

interface AddColumnDialogState {
  type: ColumnType;
  key: string;
  label: string;
}

export default function FinderModule<T extends FinderRow>({
  title,
  description,
  placeholder,
  data,
  config,
  state,
  onStateChange,
  referenceImage,
  bodyReferenceImage,
  isEditMode = false,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
  schemaColumnKeys,
  onAddColumn,
  onRenameColumn,
  onDuplicateColumn,
  onDeleteColumn,
  columnOrder,
  onReorderColumns,
}: FinderModuleProps<T>) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<EditDialogState | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingRowId, setDeletingRowId] = useState<number | null>(null);

  /* ── column management dialog ── */
  const [addColDialog, setAddColDialog] = useState<AddColumnDialogState | null>(null);
  const [renamingColKey, setRenamingColKey] = useState<string | null>(null);
  const [renameColValue, setRenameColValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  /* ── column drag-and-drop ── */
  const [dragColKey, setDragColKey] = useState<string | null>(null);
  const [dragOverColKey, setDragOverColKey] = useState<string | null>(null);

  const { query, sortColumn, sortDirection, dimensionValues, filterValues, tolerance } = state;

  const allColumns = useMemo(() => getColumns(data), [data]);
  const hidden = useMemo(() => new Set(config.hiddenFields ?? []), [config.hiddenFields]);

  const displayColumns = useMemo(() => {
    const dataColSet = new Set(allColumns);
    if (columnOrder && columnOrder.length > 0) {
      const ordered: string[] = [];
      for (const key of columnOrder) {
        if (dataColSet.has(key) && !hidden.has(key)) ordered.push(key);
      }
      for (const col of allColumns) {
        if (!hidden.has(col) && !ordered.includes(col)) ordered.push(col);
      }
      return ordered;
    }
    return allColumns.filter((col) => !hidden.has(col));
  }, [allColumns, hidden, columnOrder]);

  const editableColumns = useMemo(
    () => displayColumns.filter((col) => col !== "rowId"),
    [displayColumns],
  );

  const filterFields = config.filterFields ?? [];

  const uniqueValuesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    filterFields.forEach((col) => {
      map[col] = getUniqueValues(data, col);
    });
    return map;
  }, [data, filterFields]);

  const searchedData = useMemo(
    () => searchRows(data, query, config),
    [data, query, config],
  );

  const filteredData = useMemo(
    () => filterRows(searchedData, config, dimensionValues, filterValues, tolerance),
    [searchedData, config, dimensionValues, filterValues, tolerance],
  );

  const sortedData = useMemo(
    () => sortRows(filteredData, sortColumn, sortDirection),
    [filteredData, sortColumn, sortDirection],
  );

  /* ── user-manageable columns (in schema but not system fields) ── */
  const schemaKeys = useMemo(() => new Set(schemaColumnKeys ?? []), [schemaColumnKeys]);
  const systemCols = useMemo(() => new Set([config.idField, config.imageField, "rowId", "userAdded"]), [config]);
  const isUserColumn = (col: string) => schemaKeys.has(col) && !systemCols.has(col);
  const canDeleteColumn = (col: string) => isUserColumn(col) && col !== config.idField;

  /* ── sort ── */
  const handleSort = (column: string) => {
    if (column === config.imageField) return;
    if (sortColumn === column) {
      onStateChange({ ...state, sortDirection: sortDirection === "asc" ? "desc" : "asc" });
    } else {
      onStateChange({ ...state, sortColumn: column, sortDirection: "asc" });
    }
  };

  const handleDimensionChange = (field: string, value: string) => {
    onStateChange({ ...state, dimensionValues: { ...dimensionValues, [field]: value } });
  };

  const handleFilterChange = (column: string, value: string) => {
    onStateChange({ ...state, filterValues: { ...filterValues, [column]: value } });
  };

  const handleClear = () => {
    onStateChange({
      query: "",
      sortColumn: null,
      sortDirection: "asc",
      dimensionValues: {},
      filterValues: {},
      tolerance: config.tolerance ?? DEFAULT_TOLERANCE,
    });
  };

  /* ── row edit dialog ── */
  const openAddDialog = () => {
    const emptyRow: Record<string, string> = {};
    editableColumns.forEach((col) => { emptyRow[col] = ""; });
    setEditForm(emptyRow);
    setEditDialog({ row: {}, isNew: true });
  };

  const openEditDialog = (row: Record<string, unknown>) => {
    const formValues: Record<string, string> = {};
    editableColumns.forEach((col) => {
      formValues[col] = String(row[col] ?? "");
    });
    setEditForm(formValues);
    setEditDialog({ row, isNew: false });
  };

  const closeEditDialog = () => {
    setEditDialog(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editDialog) return;
    setEditSaving(true);
    try {
      const saved: Record<string, unknown> = { ...editForm };
      editableColumns.forEach((col) => {
        if (config.dimensionFields.includes(col)) {
          saved[col] = Number(editForm[col] ?? 0);
        }
      });
      if (editDialog.isNew) {
        await onAddRow?.(saved);
      } else {
        const rowId = Number(editDialog.row["rowId"]);
        await onUpdateRow?.(rowId, saved);
      }
      closeEditDialog();
    } catch {
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (row: Record<string, unknown>) => {
    const rowId = Number(row["rowId"]);
    if (!window.confirm("Delete this row?")) return;
    setDeletingRowId(rowId);
    try {
      await onDeleteRow?.(rowId);
    } finally {
      setDeletingRowId(null);
    }
  };

  /* ── add column dialog ── */
  const openAddColDimensions = () => setAddColDialog({ type: "dimensions", key: "", label: "" });
  const openAddColSpecifications = () => setAddColDialog({ type: "specifications", key: "", label: "" });

  const commitAddColumn = () => {
    if (!addColDialog) return;
    const key = addColDialog.key.trim().replace(/\s+/g, "_");
    const label = addColDialog.label.trim() || key;
    if (!key) { alert("Column key is required."); return; }
    onAddColumn?.(key, label, addColDialog.type);
    setAddColDialog(null);
  };

  /* ── rename column inline ── */
  const startRenameCol = (key: string) => {
    setRenamingColKey(key);
    setRenameColValue(toDisplayLabel(key, config.columnLabels));
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const commitRenameCol = () => {
    if (renamingColKey && renameColValue.trim()) {
      onRenameColumn?.(renamingColKey, renameColValue.trim());
    }
    setRenamingColKey(null);
  };

  /* ── column drag-and-drop handlers ── */
  const handleColDragStart = (e: React.DragEvent, col: string) => {
    setDragColKey(col);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (col !== dragColKey) setDragOverColKey(col);
  };

  const handleColDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    if (!dragColKey || dragColKey === targetCol) {
      setDragColKey(null);
      setDragOverColKey(null);
      return;
    }
    const cols = [...displayColumns];
    const fromIdx = cols.indexOf(dragColKey);
    const toIdx = cols.indexOf(targetCol);
    if (fromIdx !== -1 && toIdx !== -1) {
      cols.splice(fromIdx, 1);
      cols.splice(toIdx, 0, dragColKey);
      onReorderColumns?.(cols);
    }
    setDragColKey(null);
    setDragOverColKey(null);
  };

  const handleColDragEnd = () => {
    setDragColKey(null);
    setDragOverColKey(null);
  };

  /* ════════════════════ render ════════════════════ */
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Parameter Panel */}
      <aside className="w-72 flex-none bg-card/50 border-r border-border flex flex-col overflow-y-auto">
        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" /> Parameters
            </h2>
            <Button
              variant="outline" size="sm" onClick={handleClear}
              className="h-8 text-xs font-mono bg-background hover:bg-muted"
            >
              <RefreshCcw className="w-3 h-3 mr-2" /> CLEAR ALL
            </Button>
          </div>

          {config.dimensionFields.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <Label className="text-sm font-bold text-foreground">Dimensions</Label>
                <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30 bg-primary/5">
                  &plusmn;{tolerance}
                </Badge>
              </div>

              {referenceImage && (
                <div className="rounded-md border border-border bg-background p-2">
                  <img src={referenceImage.src} alt={referenceImage.alt} className="w-full h-auto rounded" />
                </div>
              )}

              <div className="space-y-3">
                {config.dimensionFields.map((field) => (
                  <div key={field} className="space-y-1.5">
                    <Label htmlFor={field} className="text-xs text-muted-foreground">
                      {toDisplayLabel(field, config.columnLabels)}
                    </Label>
                    <Input
                      id={field}
                      type="number"
                      placeholder="Any"
                      className="font-mono text-base h-10 bg-background focus-visible:ring-primary"
                      value={dimensionValues[field] || ""}
                      onChange={(e) => handleDimensionChange(field, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2 space-y-1.5">
                <Label htmlFor={`${title}-tolerance`} className="text-xs text-muted-foreground">
                  Tolerance
                </Label>
                <Input
                  id={`${title}-tolerance`}
                  type="number"
                  min="0"
                  step="0.1"
                  className="font-mono text-sm h-9 bg-background focus-visible:ring-primary"
                  value={tolerance}
                  onChange={(e) => onStateChange({ ...state, tolerance: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}

          {filterFields.length > 0 && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-border/50">
                <Label className="text-sm font-bold text-foreground">Specifications</Label>
              </div>

              <div className="space-y-4">
                {filterFields.map((col) => (
                  <div key={col} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {toDisplayLabel(col, config.columnLabels)}
                    </Label>
                    <Select value={filterValues[col] || "all"} onValueChange={(val) => handleFilterChange(col, val)}>
                      <SelectTrigger className="font-sans text-sm h-10 bg-background border-border">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        {(uniqueValuesMap[col] ?? []).map((val) => (
                          <SelectItem key={val} value={val}>{val}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Right Results Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Search bar */}
        <div className="flex-none px-6 py-4 border-b border-border bg-card/30 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onStateChange({ ...state, query: e.target.value })}
              placeholder={placeholder}
              className="pl-9 h-10 bg-background font-mono text-sm"
              aria-label={`${title} search`}
            />
          </div>
          <Button
            variant="outline" size="sm" onClick={handleClear}
            className="h-10 text-xs font-mono bg-background hover:bg-muted flex-none"
          >
            <RefreshCcw className="w-3 h-3 mr-2" /> CLEAR
          </Button>
        </div>

        {/* Results header */}
        <div className="flex-none px-6 py-3 border-b border-border flex items-center justify-between bg-card/10">
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="text-sm font-mono flex items-center gap-2">
            <span className="text-muted-foreground">Showing</span>
            <span className="text-foreground font-bold text-base px-2 py-0.5 bg-muted rounded border border-border">
              {sortedData.length}
            </span>
            <span className="text-muted-foreground">of {data.length}</span>
          </div>
        </div>

        {/* Admin column toolbar */}
        {isEditMode && (
          <div className="flex-none px-6 py-2 border-b border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/10 flex items-center gap-2">
            <span className="text-xs font-mono text-amber-600 mr-1">Column:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/40 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add column
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={openAddColDimensions}>
                  <span className="font-mono text-xs mr-2 text-primary">123</span>
                  Dimensions (num)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openAddColSpecifications}>
                  <span className="font-mono text-xs mr-2 text-muted-foreground">abc</span>
                  Specifications (text)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {bodyReferenceImage && (
          <div className="flex-none px-6 py-4 border-b border-border bg-card/10">
            <img
              src={bodyReferenceImage.src}
              alt={bodyReferenceImage.alt}
              className="w-full max-h-[357px] object-contain rounded-md border border-border bg-background"
            />
          </div>
        )}

        {/* Results table */}
        <div className="flex-1 overflow-auto">
          {sortedData.length === 0 && !isEditMode ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
              <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center border border-border">
                <Search className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-lg font-medium text-foreground mb-1">No matches found</p>
              <p className="text-sm">Try a different part number, model, or dimension combo.</p>
              <Button variant="outline" className="mt-6 font-mono text-xs" onClick={handleClear}>
                RESET SEARCH
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                <TableRow className="hover:bg-transparent border-b-border border-b-2">
                  {displayColumns.map((col) => {
                    const isSorted = sortColumn === col;
                    const isImage = col === config.imageField;
                    const canManage = isEditMode && !isImage && isUserColumn(col);
                    const isDraggable = isEditMode && !isImage;
                    const isRenaming = renamingColKey === col;
                    const isDragging = dragColKey === col;
                    const isDragOver = dragOverColKey === col;
                    return (
                      <TableHead
                        key={col}
                        draggable={isDraggable}
                        className={`h-9 select-none font-bold uppercase text-sm tracking-wider transition-all ${
                          isImage ? "" : "cursor-pointer hover:text-primary transition-colors"
                        } ${canManage ? "group" : ""} ${
                          isDragging ? "opacity-40" : ""
                        } ${
                          isDragOver ? "border-l-2 border-l-primary bg-primary/5" : ""
                        }`}
                        onClick={() => !isRenaming && handleSort(col)}
                        onDragStart={isDraggable ? (e) => handleColDragStart(e, col) : undefined}
                        onDragOver={isDraggable ? (e) => handleColDragOver(e, col) : undefined}
                        onDrop={isDraggable ? (e) => handleColDrop(e, col) : undefined}
                        onDragEnd={isDraggable ? handleColDragEnd : undefined}
                      >
                        <div className="flex items-center gap-1.5">
                          {isDraggable && !isRenaming && (
                            <span
                              className="flex-none text-muted-foreground/40 hover:text-amber-500 cursor-grab active:cursor-grabbing transition-colors"
                              title="Drag to reorder"
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="w-3 h-3" />
                            </span>
                          )}
                          {isRenaming ? (
                            <input
                              ref={renameInputRef}
                              className="bg-transparent border-b border-amber-500 outline-none text-sm font-bold uppercase tracking-wider w-28"
                              value={renameColValue}
                              onChange={(e) => setRenameColValue(e.target.value)}
                              onBlur={commitRenameCol}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRenameCol();
                                if (e.key === "Escape") setRenamingColKey(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <>
                              {isImage ? "Image" : toDisplayLabel(col, config.columnLabels)}
                              {!isImage && (
                                <div className="flex flex-col opacity-50">
                                  {isSorted ? (
                                    sortDirection === "asc" ? (
                                      <ArrowUp className="w-3 h-3 text-primary opacity-100" />
                                    ) : (
                                      <ArrowDown className="w-3 h-3 text-primary opacity-100" />
                                    )
                                  ) : (
                                    <ArrowUp className="w-3 h-3 opacity-0" />
                                  )}
                                </div>
                              )}
                              {/* Column management actions */}
                              {canManage && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-600"
                                      onClick={(e) => e.stopPropagation()}
                                      title="Column actions"
                                    >
                                      <ChevronDown className="w-3 h-3" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-40">
                                    <DropdownMenuItem
                                      onClick={(e) => { e.stopPropagation(); startRenameCol(col); }}
                                      className="gap-2"
                                    >
                                      <Pencil className="w-3.5 h-3.5" /> Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => { e.stopPropagation(); onDuplicateColumn?.(col); }}
                                      className="gap-2"
                                    >
                                      <Copy className="w-3.5 h-3.5" /> Duplicate
                                    </DropdownMenuItem>
                                    {canDeleteColumn(col) && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Delete column "${toDisplayLabel(col, config.columnLabels)}"? All values will be lost.`)) {
                                              onDeleteColumn?.(col);
                                            }
                                          }}
                                          className="gap-2 text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </>
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                  {isEditMode && (
                    <TableHead className="h-9 w-20 text-right select-none font-bold uppercase text-sm tracking-wider text-amber-600">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row, i) => (
                  <TableRow
                    key={`${String(row[config.idField])}-${i}`}
                    className="hover:bg-muted/50 transition-colors border-b border-border/50"
                  >
                    {displayColumns.map((col) => {
                      const val = row[col];
                      const isDimension = config.dimensionFields.includes(col);
                      const isPrimary = col === config.idField;
                      const isImage = col === config.imageField;

                      if (isImage) {
                        const src = typeof val === "string" ? val : "";
                        return (
                          <TableCell key={col} className="py-1">
                            {src ? (
                              <button
                                type="button"
                                onClick={() => setLightboxSrc(src)}
                                className="block w-9 h-9 rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                                aria-label="Enlarge image"
                              >
                                <img src={src} alt="" className="w-full h-full object-cover" />
                              </button>
                            ) : (
                              <div className="w-9 h-9 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground">
                                <ImageOff className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell
                          key={col}
                          className={`py-1.5 text-base ${
                            isDimension || isPrimary ? "font-mono font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {isPrimary ? (
                            <span className="text-primary">{String(val ?? "")}</span>
                          ) : (
                            String(val ?? "")
                          )}
                        </TableCell>
                      );
                    })}
                    {isEditMode && (
                      <TableCell className="py-1 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditDialog(row as Record<string, unknown>)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            disabled={deletingRowId === Number(row["rowId"])}
                            onClick={() => handleDelete(row as Record<string, unknown>)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {isEditMode && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={displayColumns.length + 1} className="py-2">
                      <Button
                        variant="outline" size="sm"
                        className="h-8 text-xs font-mono border-dashed border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                        onClick={openAddDialog}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> ADD ROW
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Image lightbox */}
      <Dialog open={lightboxSrc !== null} onOpenChange={(open) => !open && setLightboxSrc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="sr-only">Enlarged image</DialogTitle>
          {lightboxSrc && <img src={lightboxSrc} alt="" className="w-full h-auto rounded" />}
        </DialogContent>
      </Dialog>

      {/* Edit / Add Row dialog */}
      <Dialog open={editDialog !== null} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogTitle className="text-base font-bold">
            {editDialog?.isNew ? "Add Row" : "Edit Row"}
          </DialogTitle>
          <div className="space-y-3 py-2">
            {editableColumns.map((col) => {
              const isNumeric = config.dimensionFields.includes(col);
              return (
                <div key={col} className="space-y-1">
                  <Label htmlFor={`edit-${col}`} className="text-xs text-muted-foreground">
                    {toDisplayLabel(col, config.columnLabels)}
                  </Label>
                  <Input
                    id={`edit-${col}`}
                    type={isNumeric ? "number" : "text"}
                    step={isNumeric ? "any" : undefined}
                    value={editForm[col] ?? ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, [col]: e.target.value }))}
                    className="h-9 text-sm bg-background"
                    placeholder={isNumeric ? "0" : ""}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={closeEditDialog} disabled={editSaving}>
              Cancel
            </Button>
            <Button
              size="sm" onClick={handleSave} disabled={editSaving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {editSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Column dialog */}
      <Dialog open={addColDialog !== null} onOpenChange={(open) => !open && setAddColDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-base font-bold">
            Add {addColDialog?.type === "dimensions" ? "Dimensions" : "Specifications"} Column
          </DialogTitle>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="new-col-label" className="text-xs text-muted-foreground">
                Column Label
              </Label>
              <Input
                id="new-col-label"
                autoFocus
                placeholder={addColDialog?.type === "dimensions" ? "e.g. Bore Diameter" : "e.g. Supplier Code"}
                value={addColDialog?.label ?? ""}
                onChange={(e) => setAddColDialog((prev) => prev ? { ...prev, label: e.target.value } : prev)}
                className="h-9 text-sm bg-background"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("new-col-key")?.focus(); } }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-col-key" className="text-xs text-muted-foreground">
                Field Key <span className="text-muted-foreground/60">(letters/numbers, no spaces)</span>
              </Label>
              <Input
                id="new-col-key"
                placeholder={addColDialog?.type === "dimensions" ? "boreDiameter" : "supplierCode"}
                value={addColDialog?.key ?? ""}
                onChange={(e) => setAddColDialog((prev) => prev ? { ...prev, key: e.target.value.replace(/\s+/g, "_") } : prev)}
                className="h-9 text-sm bg-background font-mono"
                onKeyDown={(e) => { if (e.key === "Enter") commitAddColumn(); }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Type: <strong>{addColDialog?.type === "dimensions" ? "Dimensions — numeric, tolerance-matched" : "Specifications — text, shown as dropdown filter"}</strong>
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddColDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={commitAddColumn}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!addColDialog?.key.trim()}
            >
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { DEFAULT_TOLERANCE };
