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

interface CopyYearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (targetYear: string) => void;
  sourceYear: string;
  loading?: boolean;
}

export function CopyYearDialog({
  open,
  onOpenChange,
  onConfirm,
  sourceYear,
  loading = false,
}: CopyYearDialogProps) {
  const currentYear = parseInt(sourceYear);
  const nextYear = currentYear + 1;

  const handleConfirm = () => {
    onConfirm(nextYear.toString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Curriculum to Next Year</DialogTitle>
          <DialogDescription>
            This will copy all curriculum items from {sourceYear} to {nextYear}.
            You can edit the copied items after the copy is complete.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Source Year: {sourceYear}</Label>
          </div>
          <div>
            <Label>Target Year: {nextYear}</Label>
          </div>
          <div className="text-sm text-muted-foreground">
            All curriculum items will be copied. You can edit or delete items in
            the new year as needed.
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Copying..." : `Copy to ${nextYear}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

