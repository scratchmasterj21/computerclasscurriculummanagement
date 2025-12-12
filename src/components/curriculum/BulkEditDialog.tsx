import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurriculumItem } from "@/types/curriculum";

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (updates: { itemId: string; week: number }[]) => void;
  items: CurriculumItem[];
  selectedItemIds: string[];
  year: number;
}

export function BulkEditDialog({
  open,
  onOpenChange,
  onConfirm,
  items,
  selectedItemIds,
  year,
}: BulkEditDialogProps) {
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const selectedItems = items.filter((item) => selectedItemIds.includes(item.id));

  const handleConfirm = () => {
    const updates = selectedItems.map((item) => ({
      itemId: item.id,
      week: selectedWeek,
    }));
    onConfirm(updates);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Edit - Change Week</DialogTitle>
          <DialogDescription>
            Move {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} to a different week.
            This will change which month they appear in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="week-select">New Week (1-52)</Label>
            <Select
              value={selectedWeek.toString()}
              onValueChange={(value) => setSelectedWeek(parseInt(value))}
            >
              <SelectTrigger id="week-select" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
                  <SelectItem key={week} value={week.toString()}>
                    Week {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold mb-2">Items to move:</p>
            <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
              {selectedItems.map((item) => (
                <li key={item.id}>
                  {item.title} (Currently Week {item.week})
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Move to Week {selectedWeek}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

