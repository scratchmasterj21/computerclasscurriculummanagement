import { useMemo, useState } from "react";
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
import { CurriculumItem, GradeLevel } from "@/types/curriculum";
import { formatLessonDate, getApproxLessonDateFromWeek } from "@/utils/dateHelpers";
import { useToast } from "@/hooks/use-toast";

interface CopyToGradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolYear: number;
  items: CurriculumItem[];
  onConfirm: (targetGrade: GradeLevel) => Promise<void> | void;
}

export function CopyToGradeDialog({
  open,
  onOpenChange,
  schoolYear,
  items,
  onConfirm,
}: CopyToGradeDialogProps) {
  const [targetGrade, setTargetGrade] = useState<GradeLevel>(1);
  const [isCopying, setIsCopying] = useState(false);
  const { toast } = useToast();

  const previewItems = useMemo(() => items.slice(0, 5), [items]);
  const remainingCount = Math.max(0, items.length - previewItems.length);

  const handleCopy = async () => {
    if (items.length === 0) return;
    setIsCopying(true);
    try {
      await onConfirm(targetGrade);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to copy lessons",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy to Grade</DialogTitle>
          <DialogDescription>
            Copy the selected lesson(s) to Grade {targetGrade}. Originals will
            remain in the source grade. Duplicates are allowed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Target Grade</Label>
            <Select
              value={targetGrade.toString()}
              onValueChange={(value) => setTargetGrade(parseInt(value) as GradeLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((grade) => (
                  <SelectItem key={grade} value={grade.toString()}>
                    Grade {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {items.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-2 py-2">
              <div className="text-sm font-semibold text-muted-foreground">
                Items to copy:
              </div>
              {previewItems.map((item) => {
                const displayDate = item.lessonDate
                  ? formatLessonDate(item.lessonDate)
                  : formatLessonDate(
                      getApproxLessonDateFromWeek(item.week, schoolYear)
                    );

                return (
                  <div
                    key={item.id}
                    className="p-2 rounded-md bg-muted/50 border border-border/50"
                  >
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      From Grade {item.grade} • Week {item.week} •{" "}
                      {displayDate}
                    </div>
                  </div>
                );
              })}
              {remainingCount > 0 && (
                <div className="text-sm text-muted-foreground italic">
                  ...and {remainingCount} more item{remainingCount === 1 ? "" : "s"}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCopying}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCopy}
            disabled={items.length === 0 || isCopying}
          >
            {isCopying ? "Copying..." : `Copy ${items.length} item${items.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

