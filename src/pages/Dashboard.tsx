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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToastAction } from "@/components/ui/toast";
import { Plus, Calendar, List, Copy, RotateCcw, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SortField = "grade" | "week" | "title" | "topics" | "resources";
type SortDirection = "asc" | "desc";

interface DeletedItem {
  item: CurriculumItem;
  timestamp: number;
}

export function Dashboard() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | "all">("all");
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CurriculumItem | undefined>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  
  // New state for advanced features
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection } | null>(null);
  const [gradeFilter, setGradeFilter] = useState<GradeLevel | "all">("all");
  const [weekRange, setWeekRange] = useState({ min: 1, max: 52 });
  const [topicTypeFilter, setTopicTypeFilter] = useState<TopicType | "all">("all");
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
          item.topics.some((topic) => topic.name.toLowerCase().includes(query)) ||
          item.resources.some((resource) => resource.name.toLowerCase().includes(query))
      );
    }

    // Grade filter
    if (gradeFilter !== "all") {
      filtered = filtered.filter((item) => item.grade === gradeFilter);
    }

    // Week range filter
    filtered = filtered.filter(
      (item) => item.week >= weekRange.min && item.week <= weekRange.max
    );

    // Topic type filter
    if (topicTypeFilter !== "all") {
      filtered = filtered.filter((item) =>
        item.topics.some((topic) => topic.type === topicTypeFilter)
      );
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
  }, [items, searchQuery, gradeFilter, weekRange, topicTypeFilter, sortConfig]);

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
    setGradeFilter("all");
    setWeekRange({ min: 1, max: 52 });
    setTopicTypeFilter("all");
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
        toast({
          title: "Week Conflict Detected",
          description: `Week ${data.week} already has ${conflicts.length} item(s): ${conflictTitles}. Continue anyway?`,
          variant: "destructive",
        });
        // For now, we'll proceed but show the warning
        // In a full implementation, you might want a confirmation dialog
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
      setIsFormOpen(false);
      setEditingItem(undefined);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save item",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (item: CurriculumItem) => {
    try {
      const duplicateData: CurriculumItemInput = {
        title: `${item.title} (Copy)`,
        description: item.description,
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
          // Store for undo
          setDeletedItems((prev) => [
            ...prev,
            { item, timestamp: Date.now() },
          ]);

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

  const confirmBulkDelete = async () => {
    try {
      if (selectedItems.length > 0) {
        const itemsToDelete = items.filter((item) =>
          selectedItems.includes(item.id)
        );
        
        // Store for undo
        setDeletedItems((prev) => [
          ...prev,
          ...itemsToDelete.map((item) => ({ item, timestamp: Date.now() })),
        ]);

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
    setSelectedItems(checked ? filteredItems.map((item) => item.id) : []);
  };

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

  const handleMoveItem = async (itemId: string, newWeek: number) => {
    try {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      await curriculumService.updateCurriculumItem(
        selectedYear,
        itemId,
        item.grade,
        { week: newWeek }
      );
      
      toast({
        title: "Moved",
        description: `Item moved to Week ${newWeek}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to move item",
        variant: "destructive",
      });
    }
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

      if (modKey && e.key === "n") {
        e.preventDefault();
        handleAddItem();
      } else if (modKey && e.key === "f") {
        e.preventDefault();
        // Focus search - would need a ref for this
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
      <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/5 via-background to-background border-2 border-primary/10 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <YearSelector
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
          <GradeSelector
            selectedGrade={selectedGrade}
            onGradeChange={setSelectedGrade}
          />
          <AdvancedSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            gradeFilter={gradeFilter}
            onGradeFilterChange={setGradeFilter}
            weekRange={weekRange}
            onWeekRangeChange={setWeekRange}
            topicTypeFilter={topicTypeFilter}
            onTopicTypeFilterChange={setTopicTypeFilter}
            onClearFilters={handleClearFilters}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCopyDialogOpen(true)}
            className="shadow-sm hover:shadow-md transition-shadow border-2"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy to Next Year
          </Button>
          <Button 
            onClick={handleAddItem}
            className="shadow-md hover:shadow-lg transition-shadow"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "month")}>
          <TabsList className="bg-background shadow-sm">
            <TabsTrigger value="week" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <List className="h-4 w-4 mr-2" />
              Week View
            </TabsTrigger>
            <TabsTrigger value="month" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              Month View
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === "week" && (
        <>
          <BulkActionsToolbar
            selectedCount={selectedItems.length}
            onBulkDelete={handleBulkDelete}
            onBulkEdit={() => setIsBulkEditDialogOpen(true)}
            onExport={handleBulkExport}
            onImport={() => setIsImportDialogOpen(true)}
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
              items={filteredAndSortedItems}
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
              onSelectAll={handleSelectAll}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
              onDuplicate={handleDuplicate}
              sortConfig={sortConfig ? { field: sortConfig.field, direction: sortConfig.direction } : undefined}
              onSort={handleSort}
            />
          )}
        </>
      )}

      {viewMode === "month" && (
        <>
          <div className="flex items-center justify-end gap-2 mb-4">
            <Button
              variant="outline"
              onClick={() => {
                try {
                  exportService.exportMonthViewToPDF(
                    filteredAndSortedItems,
                    parseInt(selectedYear),
                    selectedGrade
                  );
                  toast({
                    title: "Exported",
                    description: "Month view PDF has been generated and downloaded.",
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
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                try {
                  exportService.exportMonthViewToExcel(
                    filteredAndSortedItems,
                    parseInt(selectedYear),
                    selectedGrade
                  );
                  toast({
                    title: "Exported",
                    description: "Month view Excel has been generated and downloaded.",
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
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
          <MonthView
            items={filteredAndSortedItems}
            year={parseInt(selectedYear)}
            selectedGrade={selectedGrade}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onMoveItem={handleMoveItem}
          />
        </>
      )}

      <CurriculumForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        initialData={editingItem}
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

