import { Button } from "@/components/ui/button";
import { Trash2, Download, Upload, Edit } from "lucide-react";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onBulkDelete: () => void;
  onBulkEdit: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onBulkDelete,
  onBulkEdit,
  onExport,
  onImport,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border-2 border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background p-4 shadow-lg backdrop-blur-sm">
      <div className="text-sm font-semibold text-primary flex items-center gap-2">
        <span className="px-2 py-1 rounded-md bg-primary text-primary-foreground font-bold">
          {selectedCount}
        </span>
        <span>item{selectedCount !== 1 ? "s" : ""} selected</span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onBulkEdit} className="shadow-sm hover:shadow-md border-2">
          <Edit className="h-4 w-4 mr-2" />
          Bulk Edit
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} className="shadow-sm hover:shadow-md border-2">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button variant="outline" size="sm" onClick={onImport} className="shadow-sm hover:shadow-md border-2">
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
        <Button variant="destructive" size="sm" onClick={onBulkDelete} className="shadow-md hover:shadow-lg">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
}

