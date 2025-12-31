import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurriculumItem } from "@/types/curriculum";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemCount: number;
  items?: CurriculumItem[];
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  itemCount,
  items = [],
}: DeleteConfirmDialogProps) {
  const displayItems = items.slice(0, 5); // Show first 5 items
  const remainingCount = items.length > 5 ? items.length - 5 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {itemCount} item
            {itemCount !== 1 ? "s" : ""}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {displayItems.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-2 py-2">
            <div className="text-sm font-semibold text-muted-foreground">
              Items to be deleted:
            </div>
            {displayItems.map((item) => (
              <div
                key={item.id}
                className="p-2 rounded-md bg-muted/50 border border-border/50"
              >
                <div className="font-medium text-sm">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  Grade {item.grade} • Week {item.week}
                </div>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="text-sm text-muted-foreground italic">
                ...and {remainingCount} more item{remainingCount !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete {itemCount} {itemCount === 1 ? "Item" : "Items"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

