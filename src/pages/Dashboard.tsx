import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { curriculumService } from "@/services/curriculumService";
import { importExportService } from "@/services/importExportService";
import { CurriculumItem, CurriculumItemInput, GradeLevel } from "@/types/curriculum";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Calendar, List, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  // Load curriculum data
  useEffect(() => {
    if (!currentUser) return;

    const grade = selectedGrade === "all" ? undefined : selectedGrade;
    const unsubscribe = curriculumService.getCurriculum(
      selectedYear,
      (data) => {
        setItems(data);
      },
      grade
    );

    return () => unsubscribe();
  }, [selectedYear, selectedGrade, currentUser]);

  // Filter items based on search
  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.topics.some((topic) => topic.name.toLowerCase().includes(query))
    );
  });

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

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    setDeleteItemId(null);
    setIsDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      if (selectedItems.length > 0) {
        const itemsToDelete = items
          .filter((item) => selectedItems.includes(item.id))
          .map((item) => ({ id: item.id, grade: item.grade }));
        await curriculumService.bulkDelete(selectedYear, itemsToDelete);
        toast({
          title: "Deleted",
          description: `${selectedItems.length} item(s) have been deleted.`,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/5 via-background to-background border-2 border-primary/10 shadow-sm">
        <div className="flex items-center gap-4">
          <YearSelector
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
          <GradeSelector
            selectedGrade={selectedGrade}
            onGradeChange={setSelectedGrade}
          />
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search curriculum..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 shadow-sm border-2 focus:border-primary/50"
            />
          </div>
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

          <CurriculumTable
            items={filteredItems}
            selectedItems={selectedItems}
            onSelectItem={handleSelectItem}
            onSelectAll={handleSelectAll}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
          />
        </>
      )}

      {viewMode === "month" && (
        <MonthView
          items={filteredItems}
          year={parseInt(selectedYear)}
          selectedGrade={selectedGrade}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          onMoveItem={handleMoveItem}
        />
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
    </div>
  );
}

