import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { curriculumService } from "@/services/curriculumService";
import { importExportService } from "@/services/importExportService";
import { exportService } from "@/services/exportService";
import { CurriculumItem, CurriculumItemInput, GradeLevel, TopicType } from "@/types/curriculum";
import { CurriculumTable } from "@/components/curriculum/CurriculumTable";
import { MonthView } from "@/components/curriculum/MonthView";
import { CurriculumForm } from "@/components/curriculum/CurriculumForm";
import { YearSelector } from "@/components/curriculum/YearSelector";
import { GradeSelector } from "@/components/curriculum/GradeSelector";
import { BulkActionsToolbar } from "@/components/curriculum/BulkActionsToolbar";
import { BulkImportDialog } from "@/components/curriculum/BulkImportDialog";
import { DeleteConfirmDialog } from "@/components/curriculum/DeleteConfirmDialog";
import { CopyYearDialog } from "@/components/curriculum/CopyYearDialog";
import { BulkEditDialog } from "@/components/curriculum/BulkEditDialog";
import { AdvancedSearch } from "@/components/curriculum/AdvancedSearch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CopyToGradeDialog } from "@/components/curriculum/CopyToGradeDialog";
import { BackupRestoreDialog } from "@/components/curriculum/BackupRestoreDialog";
import { UnitManagerDialog } from "@/components/curriculum/UnitManagerDialog";
import { TemplateManagerDialog } from "@/components/curriculum/TemplateManagerDialog";
import { AttentionPanel, AttentionFilter } from "@/components/curriculum/AttentionPanel";
import { KeyboardHelpDialog } from "@/components/curriculum/KeyboardHelpDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToastAction } from "@/components/ui/toast";
import {
  Plus,
  Calendar,
  List,
  Copy,
  RotateCcw,
  FileText,
  Download,
  Filter,
  ArrowRightLeft,
  Trash2,
  DatabaseBackup,
  Settings2,
  LayoutTemplate,
  HelpCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApproxLessonDateFromWeek, getWeekForMonth, getWeekFromLessonDate, isDateInSchoolYear } from "@/utils/dateHelpers";

type SortField = "grade" | "week" | "title" | "topics" | "resources";
type SortDirection = "asc" | "desc";

interface MoveHistoryEntry {
  itemId: string;
  grade: number;
  title: string;
  fromWeek: number;
  toWeek: number;
  fromDate: string;
  toDate: string;
}

interface SavedView {
  id: string;
  name: string;
  year: string;
  grade: GradeLevel | "all";
  unit: string;
  view: "week" | "month";
  weekRange: { min: number; max: number };
  topicType: TopicType | "all";
}

export function Dashboard() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(() => localStorage.getItem("curriculum-selected-year") || currentYear);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | "all">(() => {
    const saved = localStorage.getItem("curriculum-selected-grade");
    return saved && saved !== "all" ? (Number(saved) as GradeLevel) : "all";
  });
  const [viewMode, setViewMode] = useState<"week" | "month">(() =>
    localStorage.getItem("curriculum-view-mode") === "month" ? "month" : "week"
  );
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem("curriculum-search") || "");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CurriculumItem | undefined>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isCopyToGradeDialogOpen, setIsCopyToGradeDialogOpen] = useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [isUnitManagerOpen, setIsUnitManagerOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);
  const [defaultTemplateId, setDefaultTemplateId] = useState("");
  const [unitColors, setUnitColors] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("curriculum-unit-colors") || "{}"); } catch { return {}; }
  });
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  
  // New state for advanced features
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection } | null>(null);
  const [weekRange, setWeekRange] = useState<{ min: number; max: number }>(() => {
    try { return JSON.parse(localStorage.getItem("curriculum-week-range") || '{"min":1,"max":52}'); } catch { return { min: 1, max: 52 }; }
  });
  const [unitFilter, setUnitFilter] = useState(() => localStorage.getItem("curriculum-unit-filter") || "all");
  const [groupBy, setGroupBy] = useState<"none" | "grade" | "unit" | "month" | "topic">("none");
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>("none");
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    try { return JSON.parse(localStorage.getItem("curriculum-saved-views") || "[]"); } catch { return []; }
  });
  const [activeSavedViewId, setActiveSavedViewId] = useState("");
  const [topicTypeFilter, setTopicTypeFilter] = useState<TopicType | "all">(() => (localStorage.getItem("curriculum-topic-filter") as TopicType | "all") || "all");
  const [isLoading, setIsLoading] = useState(false);
  const [monthResourceFilter, setMonthResourceFilter] = useState<
    "all" | "with-resources" | "without-resources"
  >("all");
  const [monthShowSelectedOnly, setMonthShowSelectedOnly] = useState(false);
  const [newLessonDefaults, setNewLessonDefaults] = useState<{
    grade?: GradeLevel;
    lessonDate?: string;
    unit?: string;
  }>({});

  useEffect(() => {
    localStorage.setItem("curriculum-selected-year", selectedYear);
    localStorage.setItem("curriculum-selected-grade", String(selectedGrade));
    localStorage.setItem("curriculum-view-mode", viewMode);
    localStorage.setItem("curriculum-unit-filter", unitFilter);
    localStorage.setItem("curriculum-search", searchQuery);
    localStorage.setItem("curriculum-week-range", JSON.stringify(weekRange));
    localStorage.setItem("curriculum-topic-filter", topicTypeFilter);
  }, [selectedYear, selectedGrade, viewMode, unitFilter, searchQuery, weekRange, topicTypeFilter]);

  // Load curriculum data
  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);

    const grade = selectedGrade === "all" ? undefined : selectedGrade;
    const unsubscribe = curriculumService.getCurriculum(
      selectedYear,
      (data) => {
        setItems(data);
        setIsLoading(false);
      },
      grade
    );

    return () => unsubscribe();
  }, [selectedYear, selectedGrade, currentUser]);

  // Keep bulk actions limited to the year and grade currently on screen.
  useEffect(() => {
    setSelectedItems([]);
    setMonthShowSelectedOnly(false);
  }, [selectedYear, selectedGrade]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items;

    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          (item.unit || "").toLowerCase().includes(query) ||
          (item.objectives || []).some((objective) => objective.toLowerCase().includes(query)) ||
          item.topics.some((topic) => topic.name.toLowerCase().includes(query)) ||
          item.resources.some((resource) => resource.name.toLowerCase().includes(query))
      );
    }

    // Week range filter
    filtered = filtered.filter(
      (item) => item.week >= weekRange.min && item.week <= weekRange.max
    );

    if (unitFilter !== "all") {
      filtered = filtered.filter((item) => item.unit === unitFilter);
    }

    // Topic type filter
    if (topicTypeFilter !== "all") {
      filtered = filtered.filter((item) =>
        item.topics.some((topic) => topic.type === topicTypeFilter)
      );
    }

    if (attentionFilter !== "none") {
      const dateCounts = new Map<string, number>();
      const unitCounts = new Map<string, number>();
      const weekCounts = new Map<string, number>();
      items.forEach((item) => {
        const dateKey = `${item.grade}|${item.lessonDate || item.week}`;
        dateCounts.set(dateKey, (dateCounts.get(dateKey) || 0) + 1);
        if (item.unit) unitCounts.set(item.unit, (unitCounts.get(item.unit) || 0) + 1);
        weekCounts.set(`${item.grade}|${item.week}`, (weekCounts.get(`${item.grade}|${item.week}`) || 0) + 1);
      });
      filtered = filtered.filter((item) => attentionFilter === "objectives" ? !item.objectives?.length
        : attentionFilter === "resources" ? !item.resources.length
        : attentionFilter === "conflicts" ? (dateCounts.get(`${item.grade}|${item.lessonDate || item.week}`) || 0) > 1
        : attentionFilter === "dates" ? Boolean(item.lessonDate && !isDateInSchoolYear(item.lessonDate, parseInt(selectedYear)))
        : attentionFilter === "single-unit" ? Boolean(item.unit && unitCounts.get(item.unit) === 1)
        : attentionFilter === "theory-only" ? !item.topics.some((topic) => topic.type === "lab" || topic.type === "project")
        : attentionFilter === "overloaded" ? (weekCounts.get(`${item.grade}|${item.week}`) || 0) >= 3
        : item.resources.some((resource) => { try { new URL(resource.url); return false; } catch { return true; } }));
    }

    // Sorting
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortConfig.field) {
          case "grade":
            aVal = a.grade;
            bVal = b.grade;
            break;
          case "week":
            aVal = a.week;
            bVal = b.week;
            break;
          case "title":
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
            break;
          case "topics":
            aVal = a.topics.length;
            bVal = b.topics.length;
            break;
          case "resources":
            aVal = a.resources.length;
            bVal = b.resources.length;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [attentionFilter, items, searchQuery, selectedYear, weekRange, unitFilter, topicTypeFilter, sortConfig]);

  const availableUnits = useMemo(
    () => [...new Set(items.map((item) => item.unit).filter((unit): unit is string => Boolean(unit)))].sort(),
    [items]
  );

  const groupedListItems = useMemo(() => {
    if (groupBy === "none") return filteredAndSortedItems;
    const groupKey = (item: CurriculumItem) => groupBy === "grade" ? String(item.grade)
      : groupBy === "unit" ? (item.unit || "No unit")
      : groupBy === "month" ? (item.lessonDate || getApproxLessonDateFromWeek(item.week, parseInt(selectedYear))).slice(0, 7)
      : (item.topics[0]?.type || "other");
    return [...filteredAndSortedItems].sort((a, b) => groupKey(a).localeCompare(groupKey(b)) || a.week - b.week);
  }, [filteredAndSortedItems, groupBy, selectedYear]);

  const handleSort = (field: string) => {
    setSortConfig((current) => {
      if (current?.field === field) {
        return {
          field: field as SortField,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { field: field as SortField, direction: "asc" };
    });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setWeekRange({ min: 1, max: 52 });
    setUnitFilter("all");
    setTopicTypeFilter("all");
    setMonthResourceFilter("all");
    setMonthShowSelectedOnly(false);
    setAttentionFilter("none");
  };

  const saveCurrentView = () => {
    const name = window.prompt("Name this curriculum view:");
    if (!name?.trim()) return;
    const view: SavedView = {
      id: String(Date.now()), name: name.trim(), year: selectedYear, grade: selectedGrade,
      unit: unitFilter, view: viewMode, weekRange, topicType: topicTypeFilter,
    };
    const next = [...savedViews, view];
    setSavedViews(next);
    localStorage.setItem("curriculum-saved-views", JSON.stringify(next));
  };

  const applySavedView = (id: string) => {
    const view = savedViews.find((entry) => entry.id === id);
    if (!view) return;
    setActiveSavedViewId(id);
    setSelectedYear(view.year); setSelectedGrade(view.grade); setUnitFilter(view.unit);
    setViewMode(view.view); setWeekRange(view.weekRange); setTopicTypeFilter(view.topicType);
  };

  const deleteActiveSavedView = () => {
    if (!activeSavedViewId) return;
    const next = savedViews.filter((view) => view.id !== activeSavedViewId);
    setSavedViews(next); setActiveSavedViewId("");
    localStorage.setItem("curriculum-saved-views", JSON.stringify(next));
  };

  // Week conflict detection
  const checkWeekConflict = useCallback(
    (week: number, grade: GradeLevel, excludeId?: string): CurriculumItem[] => {
      return items.filter(
        (item) =>
          item.week === week &&
          item.grade === grade &&
          item.id !== excludeId
      );
    },
    [items]
  );

  const handleAddItem = () => {
    setEditingItem(undefined);
    setDefaultTemplateId("");
    setNewLessonDefaults({
      grade: selectedGrade === "all" ? undefined : selectedGrade,
      unit: unitFilter === "all" ? undefined : unitFilter,
    });
    setIsFormOpen(true);
  };

  const handleAddLessonToMonth = (grade: GradeLevel, monthIndex: number) => {
    const week = getWeekForMonth(monthIndex, parseInt(selectedYear));
    setEditingItem(undefined);
    setDefaultTemplateId("");
    setNewLessonDefaults({
      grade,
      lessonDate: getApproxLessonDateFromWeek(week, parseInt(selectedYear)),
      unit: unitFilter === "all" ? undefined : unitFilter,
    });
    setIsFormOpen(true);
  };

  const handleEditItem = (item: CurriculumItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: CurriculumItemInput) => {
    try {
      // Check for week conflicts
      const conflicts = checkWeekConflict(
        data.week,
        data.grade,
        editingItem?.id
      );
      
      if (conflicts.length > 0) {
        const conflictTitles = conflicts.map((c) => c.title).join(", ");
        const proceed = window.confirm(
          `This schedule conflicts with ${conflicts.length} lesson${conflicts.length === 1 ? "" : "s"}: ${conflictTitles}.\n\nSave this lesson anyway?`
        );
        if (!proceed) return false;
      }

      if (editingItem) {
        await curriculumService.updateCurriculumItem(
          selectedYear,
          editingItem.id,
          editingItem.grade,
          data
        );
        toast({
          title: "Updated",
          description: "Curriculum item has been updated.",
        });
      } else {
        await curriculumService.addCurriculumItem(
          selectedYear,
          data,
          currentUser!.uid
        );
        toast({
          title: "Created",
          description: "Curriculum item has been created.",
        });
      }
      setEditingItem(undefined);
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save item",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleDuplicate = async (item: CurriculumItem) => {
    try {
      const duplicateData: CurriculumItemInput = {
        title: `${item.title} (Copy)`,
        description: item.description,
        unit: item.unit || "",
        objectives: item.objectives || [],
        lessonDate:
          item.lessonDate || getApproxLessonDateFromWeek(item.week, parseInt(selectedYear)),
        week: item.week,
        grade: item.grade,
        topics: item.topics,
        resources: item.resources,
      };
      
      await curriculumService.addCurriculumItem(
        selectedYear,
        duplicateData,
        currentUser!.uid
      );
      
      toast({
        title: "Duplicated",
        description: "Curriculum item has been duplicated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate item",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = (id: string) => {
    setDeleteItemId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteItemId) {
        const item = items.find((i) => i.id === deleteItemId);
        if (item) {
          await curriculumService.deleteCurriculumItem(
            selectedYear,
            deleteItemId,
            item.grade
          );
          
          toast({
            title: "Deleted",
            description: "Curriculum item has been deleted.",
            action: (
              <ToastAction altText="Undo delete" onClick={() => handleUndoDelete(item)}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Undo
              </ToastAction>
            ),
          });
        }
      }
      setIsDeleteDialogOpen(false);
      setDeleteItemId(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const handleUndoDelete = async (item: CurriculumItem) => {
    try {
      const itemData: CurriculumItemInput = {
        title: item.title,
        description: item.description,
        unit: item.unit || "",
        objectives: item.objectives || [],
        lessonDate:
          item.lessonDate || getApproxLessonDateFromWeek(item.week, parseInt(selectedYear)),
        week: item.week,
        grade: item.grade,
        topics: item.topics,
        resources: item.resources,
      };

      await curriculumService.addCurriculumItem(
        selectedYear,
        itemData,
        currentUser!.uid
      );

      toast({
        title: "Restored",
        description: "Curriculum item has been restored.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to restore item",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    setDeleteItemId(null);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenCopyToGrade = () => {
    if (selectedItems.length === 0) return;
    setIsCopyToGradeDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      if (selectedItems.length > 0) {
        const itemsToDelete = items.filter((item) =>
          selectedItems.includes(item.id)
        );
        
        const deleteData = itemsToDelete.map((item) => ({
          id: item.id,
          grade: item.grade,
        }));
        
        await curriculumService.bulkDelete(selectedYear, deleteData);
        
        toast({
          title: "Deleted",
          description: `${selectedItems.length} item(s) have been deleted.`,
          action: itemsToDelete.length === 1 ? (
            <ToastAction altText="Undo delete" onClick={() => handleUndoDelete(itemsToDelete[0])}>
              <RotateCcw className="h-3 w-3 mr-1" />
              Undo
            </ToastAction>
          ) : undefined,
        });
        setSelectedItems([]);
        setMonthShowSelectedOnly(false);
      }
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete items",
        variant: "destructive",
      });
    }
  };

  const handleBulkCopyToGrade = async (targetGrade: GradeLevel) => {
    if (selectedItems.length === 0) return;

    const schoolYear = parseInt(selectedYear);
    const itemsToCopy = items.filter((item) => selectedItems.includes(item.id));

    const copyInputs: CurriculumItemInput[] = itemsToCopy.map((item) => {
      const lessonDate =
        item.lessonDate || getApproxLessonDateFromWeek(item.week, schoolYear);
      const week = getWeekFromLessonDate(lessonDate, schoolYear);

      return {
        title: item.title,
        description: item.description,
        unit: item.unit || "",
        objectives: item.objectives || [],
        lessonDate,
        week,
        grade: targetGrade,
        topics: item.topics,
        resources: item.resources,
      };
    });

    await curriculumService.bulkAdd(selectedYear, copyInputs, currentUser!.uid);

    toast({
      title: "Copied",
      description: `Copied ${itemsToCopy.length} lesson(s) to Grade ${targetGrade}.`,
    });
  };

  const handleBulkExport = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to export.",
        variant: "destructive",
      });
      return;
    }

    const itemsToExport = items.filter((item) =>
      selectedItems.includes(item.id)
    );
    const csv = importExportService.exportToCSV(itemsToExport);
    importExportService.downloadFile(
      csv,
      `curriculum-${selectedYear}-export.csv`,
      "text/csv"
    );
    toast({
      title: "Exported",
      description: `${itemsToExport.length} item(s) exported to CSV.`,
    });
  };

  const handleImportSubmit = async (importedItems: CurriculumItemInput[]) => {
    try {
      await curriculumService.bulkAdd(
        selectedYear,
        importedItems,
        currentUser!.uid
      );
      toast({
        title: "Imported",
        description: `${importedItems.length} item(s) have been imported.`,
      });
      setIsImportDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import items",
        variant: "destructive",
      });
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? filteredAndSortedItems.map((item) => item.id) : []);
  };

  const handleClearMonthSelection = () => {
    setSelectedItems([]);
    setMonthShowSelectedOnly(false);
  };

  const visibleMonthItems = useMemo(() => {
    let filtered = filteredAndSortedItems;

    if (monthResourceFilter === "with-resources") {
      filtered = filtered.filter((item) => item.resources.length > 0);
    }

    if (monthResourceFilter === "without-resources") {
      filtered = filtered.filter((item) => item.resources.length === 0);
    }

    if (monthShowSelectedOnly) {
      filtered = filtered.filter((item) => selectedItems.includes(item.id));
    }

    return filtered;
  }, [
    filteredAndSortedItems,
    monthResourceFilter,
    monthShowSelectedOnly,
    selectedItems,
  ]);

  const handleCopyYear = async (targetYear: string) => {
    setIsCopying(true);
    try {
      const copiedCount = await curriculumService.copyYearToYear(
        selectedYear,
        targetYear,
        currentUser!.uid
      );
      
      toast({
        title: "Copy Successful",
        description: `Copied ${copiedCount} curriculum item(s) from ${selectedYear} to ${targetYear}.`,
      });
      
      setIsCopyDialogOpen(false);
      
      // Optionally switch to the new year
      setSelectedYear(targetYear);
    } catch (error: any) {
      toast({
        title: "Copy Failed",
        description: error.message || "Failed to copy curriculum items",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleUnitColorChange = (unit: string, color: string) => {
    setUnitColors((current) => {
      const next = { ...current, [unit]: color };
      localStorage.setItem("curriculum-unit-colors", JSON.stringify(next));
      return next;
    });
  };

  const handleRenameUnit = async (from: string, to: string) => {
    const affected = items.filter((item) => item.unit === from);
    await Promise.all(
      affected.map((item) => curriculumService.updateCurriculumItem(selectedYear, item.id, item.grade, { unit: to }))
    );
    if (unitColors[from]) handleUnitColorChange(to, unitColors[from]);
    toast({ title: "Unit updated", description: `${affected.length} lessons now use ${to}.` });
  };

  const applyMoveEntries = async (
    entries: MoveHistoryEntry[],
    {
      allowUndo = true,
      clearSelection = false,
    }: { allowUndo?: boolean; clearSelection?: boolean } = {}
  ) => {
    try {
      await Promise.all(
        entries.map((entry) =>
          curriculumService.updateCurriculumItem(selectedYear, entry.itemId, entry.grade, {
            lessonDate: entry.toDate,
            week: entry.toWeek,
          })
        )
      );

      const targetWeeks = new Set(entries.map((entry) => `${entry.grade}-${entry.toWeek}`));
      const conflicts = items.filter(
        (item) =>
          !entries.some((entry) => entry.itemId === item.id) &&
          targetWeeks.has(`${item.grade}-${item.week}`)
      ).length;

      toast({
        title: entries.length === 1 ? "Lesson moved" : "Lessons moved",
        description:
          conflicts > 0
            ? `${entries.length} lesson${entries.length === 1 ? "" : "s"} moved. ${conflicts} existing lesson${conflicts === 1 ? "" : "s"} already in the target week.`
            : `${entries.length} lesson${entries.length === 1 ? "" : "s"} moved successfully.`,
        action:
          allowUndo && entries.length > 0 ? (
            <ToastAction
              altText="Undo move"
              onClick={() =>
                applyMoveEntries(
                  entries.map((entry) => ({
                    ...entry,
                    fromWeek: entry.toWeek,
                    toWeek: entry.fromWeek,
                    fromDate: entry.toDate,
                    toDate: entry.fromDate,
                  })),
                  { allowUndo: false }
                )
              }
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Undo
            </ToastAction>
          ) : undefined,
      });

      if (clearSelection) {
        handleClearMonthSelection();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to move lesson",
        variant: "destructive",
      });
    }
  };

  const handleMoveItem = async (itemId: string, newWeek: number) => {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;

    await applyMoveEntries([
      {
        itemId: item.id,
        grade: item.grade,
        title: item.title,
        fromWeek: item.week,
        toWeek: newWeek,
        fromDate:
          item.lessonDate || getApproxLessonDateFromWeek(item.week, parseInt(selectedYear)),
        toDate: getApproxLessonDateFromWeek(newWeek, parseInt(selectedYear)),
      },
    ]);
  };

  const handleMoveItems = async (itemIds: string[], newWeek: number) => {
    const moveItems = items.filter((item) => itemIds.includes(item.id));
    if (moveItems.length === 0) return;

    const grade = moveItems[0].grade;
    if (!moveItems.every((item) => item.grade === grade)) {
      toast({
        title: "Selection mismatch",
        description: "Select lessons from a single grade before moving them together.",
        variant: "destructive",
      });
      return;
    }

    await applyMoveEntries(
      moveItems.map((item) => ({
        itemId: item.id,
        grade: item.grade,
        title: item.title,
        fromWeek: item.week,
        toWeek: newWeek,
        fromDate:
          item.lessonDate || getApproxLessonDateFromWeek(item.week, parseInt(selectedYear)),
        toDate: getApproxLessonDateFromWeek(newWeek, parseInt(selectedYear)),
      })),
      { clearSelection: true }
    );
  };

  const handleBulkEdit = async (updates: { itemId: string; week: number }[]) => {
    try {
      const updatePromises = updates.map((update) => {
        const item = items.find((i) => i.id === update.itemId);
        if (!item) return Promise.resolve();
        
        return curriculumService.updateCurriculumItem(
          selectedYear,
          update.itemId,
          item.grade,
          { week: update.week }
        );
      });

      await Promise.all(updatePromises);
      
      toast({
        title: "Updated",
        description: `${updates.length} item(s) moved to new week(s).`,
      });
      
      setIsBulkEditDialogOpen(false);
      setSelectedItems([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update items",
        variant: "destructive",
      });
    }
  };

  const selectedCurriculumItems = () => items.filter((item) => selectedItems.includes(item.id));

  const handleBulkAssignUnit = async () => {
    const unit = window.prompt("Assign selected lessons to which unit?");
    if (!unit?.trim()) return;
    await Promise.all(selectedCurriculumItems().map((item) => curriculumService.updateCurriculumItem(selectedYear, item.id, item.grade, { unit: unit.trim() })));
    toast({ title: "Unit assigned", description: `${selectedItems.length} lessons updated.` });
  };

  const handleBulkShiftWeeks = async () => {
    const raw = window.prompt("Shift selected lessons by how many weeks? Use a negative number to move earlier.", "1");
    if (raw === null) return;
    const offset = Number(raw);
    if (!Number.isInteger(offset) || offset === 0) return;
    await Promise.all(selectedCurriculumItems().map((item) => {
      const date = new Date(`${item.lessonDate || getApproxLessonDateFromWeek(item.week, parseInt(selectedYear))}T00:00:00`);
      date.setDate(date.getDate() + offset * 7);
      const lessonDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return curriculumService.updateCurriculumItem(selectedYear, item.id, item.grade, { lessonDate });
    }));
    toast({ title: "Dates shifted", description: `${selectedItems.length} lessons moved by ${offset} weeks.` });
  };

  const handleBulkAddResource = async () => {
    const name = window.prompt("Resource name:"); if (!name?.trim()) return;
    const url = window.prompt("Resource URL:"); if (!url?.trim()) return;
    try { new URL(url); } catch { toast({ title: "Invalid URL", description: "Enter a complete URL including https://", variant: "destructive" }); return; }
    await Promise.all(selectedCurriculumItems().map((item) => curriculumService.updateCurriculumItem(selectedYear, item.id, item.grade, { resources: [...item.resources, { name: name.trim(), url: url.trim(), type: "link" }] })));
    toast({ title: "Resource added", description: `Added to ${selectedItems.length} lessons.` });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if ((modKey && e.key === "n") || (!modKey && e.key.toLowerCase() === "n")) {
        e.preventDefault();
        handleAddItem();
      } else if (modKey && e.key === "f") {
        e.preventDefault();
        document.getElementById("curriculum-search")?.focus();
      } else if (e.key === "/") {
        e.preventDefault();
        document.getElementById("curriculum-search")?.focus();
      } else if (e.key === "?") {
        e.preventDefault();
        setIsKeyboardHelpOpen(true);
      } else if (e.key === "Delete" && selectedItems.length > 0) {
        e.preventDefault();
        handleBulkDelete();
      } else if (modKey && e.key === "e" && selectedItems.length === 1) {
        e.preventDefault();
        const item = items.find((i) => i.id === selectedItems[0]);
        if (item) handleEditItem(item);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItems, items]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Curriculum</h1>
        <p className="text-muted-foreground">Find, plan, and manage your computer class lessons.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-4">
          <YearSelector
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
          <GradeSelector
            selectedGrade={selectedGrade}
            onGradeChange={setSelectedGrade}
          />
          <div className="flex items-center gap-2">
            <Label htmlFor="unit-filter">Unit:</Label>
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger id="unit-filter" className="w-[190px]">
                <SelectValue placeholder="All Units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {availableUnits.map((unit) => (
                  <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AdvancedSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            weekRange={weekRange}
            onWeekRangeChange={setWeekRange}
            topicTypeFilter={topicTypeFilter}
            onTopicTypeFilterChange={setTopicTypeFilter}
            onClearFilters={handleClearFilters}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsKeyboardHelpOpen(true)} title="Keyboard shortcuts"><HelpCircle className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => setIsTemplateManagerOpen(true)} className="shadow-sm">
            <LayoutTemplate className="mr-2 h-4 w-4" /> Templates
          </Button>
          <Button variant="outline" onClick={() => setIsUnitManagerOpen(true)} className="shadow-sm">
            <Settings2 className="mr-2 h-4 w-4" /> Units
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsBackupDialogOpen(true)}
            className="shadow-sm"
          >
            <DatabaseBackup className="mr-2 h-4 w-4" />
            Backup
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsCopyDialogOpen(true)}
            className="shadow-sm hover:shadow-md transition-shadow border-2"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy School Year
          </Button>
          <Button 
            onClick={handleAddItem}
            className="shadow-md hover:shadow-lg transition-shadow"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Lesson
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "month")}>
          <TabsList className="bg-background shadow-sm">
            <TabsTrigger value="week" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <List className="h-4 w-4 mr-2" />
              List
            </TabsTrigger>
            <TabsTrigger value="month" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              Year Planner
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="text-sm">
          <span className="font-medium">{selectedYear}–{parseInt(selectedYear) + 1}</span>
          <span className="text-muted-foreground"> · {selectedGrade === "all" ? "All grades" : `Grade ${selectedGrade}`} · {filteredAndSortedItems.length} of {items.length} lessons</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleSelectAll(true)} disabled={!filteredAndSortedItems.length}>Select Visible</Button>
          <Button variant="ghost" size="sm" onClick={handleClearMonthSelection} disabled={!selectedItems.length}>Clear Selection</Button>
          {savedViews.length > 0 && (
            <Select value={activeSavedViewId} onValueChange={applySavedView}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Saved views" /></SelectTrigger>
              <SelectContent>{savedViews.map((view) => <SelectItem key={view.id} value={view.id}>{view.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={saveCurrentView}>Save View</Button>
          <Button variant="ghost" size="sm" onClick={deleteActiveSavedView} disabled={!activeSavedViewId}>Delete View</Button>
        </div>
      </div>

      <AttentionPanel items={items} year={parseInt(selectedYear)} active={attentionFilter} onSelect={setAttentionFilter} />

      {viewMode === "week" && (
        <>
          <div className="flex justify-end">
            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as typeof groupBy)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Group lessons" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grouping</SelectItem>
                <SelectItem value="grade">Group by grade</SelectItem>
                <SelectItem value="unit">Group by unit</SelectItem>
                <SelectItem value="month">Group by month</SelectItem>
                <SelectItem value="topic">Group by activity type</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <BulkActionsToolbar
            selectedCount={selectedItems.length}
            onBulkCopyToGrade={handleOpenCopyToGrade}
            onBulkDelete={handleBulkDelete}
            onBulkEdit={() => setIsBulkEditDialogOpen(true)}
            onExport={handleBulkExport}
            onImport={() => setIsImportDialogOpen(true)}
            onAssignUnit={handleBulkAssignUnit}
            onShiftWeeks={handleBulkShiftWeeks}
            onAddResource={handleBulkAddResource}
          />

          {isLoading ? (
            <div className="rounded-lg border-2 border-border/50 bg-card shadow-lg p-8">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <div className="text-muted-foreground">Loading curriculum...</div>
              </div>
            </div>
          ) : (
            <CurriculumTable
              items={groupedListItems}
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
              onSelectAll={handleSelectAll}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onDuplicate={handleDuplicate}
              sortConfig={sortConfig ? { field: sortConfig.field, direction: sortConfig.direction } : undefined}
              onSort={handleSort}
              groupBy={groupBy}
              year={parseInt(selectedYear)}
              searchQuery={searchQuery}
            />
          )}
        </>
      )}

      {viewMode === "month" && (
        <>
          {selectedGrade === "all" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              You are viewing every grade. Choose one grade above for a simpler planning view and to move several lessons together.
            </div>
          )}
          <div className="mb-4 space-y-3 rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[200px]">
                <Select value={monthResourceFilter} onValueChange={(value) => setMonthResourceFilter(value as typeof monthResourceFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All lessons</SelectItem>
                    <SelectItem value="with-resources">With resources</SelectItem>
                    <SelectItem value="without-resources">Without resources</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant={monthShowSelectedOnly ? "default" : "outline"}
                onClick={() => setMonthShowSelectedOnly((prev) => !prev)}
                disabled={selectedItems.length === 0}
              >
                <Filter className="mr-2 h-4 w-4" />
                Selected Only
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Showing {visibleMonthItems.length} lesson{visibleMonthItems.length === 1 ? "" : "s"}
                {selectedItems.length > 0
                  ? ` • ${selectedItems.length} selected`
                  : ""}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      exportService.exportMonthViewToPDF(
                        visibleMonthItems,
                        parseInt(selectedYear),
                        selectedGrade,
                        "Curriculum Month View"
                      );
                      toast({
                        title: "Exported",
                        description: "Month view PDF has been generated from the current visible view.",
                      });
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to export PDF",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      exportService.exportMonthViewToExcel(
                        visibleMonthItems,
                        parseInt(selectedYear),
                        selectedGrade,
                        "Curriculum Month View"
                      );
                      toast({
                        title: "Exported",
                        description: "Month view Excel has been generated from the current visible view.",
                      });
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to export Excel",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
                <Button
                  variant="destructive"
                  disabled={selectedItems.length === 0}
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
                <Button
                  variant="ghost"
                  disabled={
                    selectedItems.length === 0 ||
                    !visibleMonthItems.some((item) => selectedItems.includes(item.id))
                  }
                  onClick={handleClearMonthSelection}
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Clear Month Selection
                </Button>
              </div>
            </div>
          </div>
          <MonthView
            items={visibleMonthItems}
            year={parseInt(selectedYear)}
            selectedGrade={selectedGrade}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onBulkDelete={handleBulkDelete}
            onBulkCopy={handleOpenCopyToGrade}
            onMoveItem={handleMoveItem}
            onMoveItems={handleMoveItems}
            selectedItemIds={selectedItems}
            onToggleSelectItem={handleSelectItem}
            onClearSelection={handleClearMonthSelection}
            onAddLesson={handleAddLessonToMonth}
            unitColors={unitColors}
          />
        </>
      )}

      <CurriculumForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        initialData={editingItem}
        schoolYear={parseInt(selectedYear)}
        defaultGrade={newLessonDefaults.grade}
        defaultLessonDate={newLessonDefaults.lessonDate}
        defaultUnit={newLessonDefaults.unit}
        defaultTemplateId={defaultTemplateId}
      />

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={deleteItemId ? confirmDelete : confirmBulkDelete}
        itemCount={deleteItemId ? 1 : selectedItems.length}
        items={
          deleteItemId
            ? items.filter((i) => i.id === deleteItemId)
            : items.filter((i) => selectedItems.includes(i.id))
        }
      />

      <BulkImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImport={handleImportSubmit}
      />

      <CopyYearDialog
        open={isCopyDialogOpen}
        onOpenChange={setIsCopyDialogOpen}
        onConfirm={handleCopyYear}
        sourceYear={selectedYear}
        loading={isCopying}
      />

      <BulkEditDialog
        open={isBulkEditDialogOpen}
        onOpenChange={setIsBulkEditDialogOpen}
        onConfirm={handleBulkEdit}
        items={items}
        selectedItemIds={selectedItems}
        year={parseInt(selectedYear)}
      />

      <CopyToGradeDialog
        open={isCopyToGradeDialogOpen}
        onOpenChange={setIsCopyToGradeDialogOpen}
        schoolYear={parseInt(selectedYear)}
        items={items.filter((item) => selectedItems.includes(item.id))}
        onConfirm={handleBulkCopyToGrade}
      />

      <BackupRestoreDialog
        open={isBackupDialogOpen}
        onOpenChange={setIsBackupDialogOpen}
        userId={currentUser!.uid}
        onComplete={(message) => toast({ title: "Backup", description: message })}
      />

      <UnitManagerDialog
        open={isUnitManagerOpen}
        onOpenChange={setIsUnitManagerOpen}
        items={items}
        colors={unitColors}
        onColorChange={handleUnitColorChange}
        onRename={handleRenameUnit}
      />

      <TemplateManagerDialog
        open={isTemplateManagerOpen}
        onOpenChange={setIsTemplateManagerOpen}
        onUse={(templateId) => {
          setDefaultTemplateId(templateId);
          setEditingItem(undefined);
          setNewLessonDefaults({
            grade: selectedGrade === "all" ? undefined : selectedGrade,
            unit: unitFilter === "all" ? undefined : unitFilter,
          });
          setIsTemplateManagerOpen(false);
          setIsFormOpen(true);
        }}
      />

      <KeyboardHelpDialog open={isKeyboardHelpOpen} onOpenChange={setIsKeyboardHelpOpen} />

      {/* Floating Action Button */}
      <Button
        onClick={handleAddItem}
        size="lg"
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
        title="Add new item (Cmd/Ctrl+N)"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
