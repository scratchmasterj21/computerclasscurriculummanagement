import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CurriculumItem } from "@/types/curriculum";

interface UnitManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CurriculumItem[];
  colors: Record<string, string>;
  onColorChange: (unit: string, color: string) => void;
  onRename: (from: string, to: string) => Promise<void>;
}

export function UnitManagerDialog({ open, onOpenChange, items, colors, onColorChange, onRename }: UnitManagerDialogProps) {
  const [renames, setRenames] = useState<Record<string, string>>({});
  const [busyUnit, setBusyUnit] = useState("");
  const units = useMemo(() => {
    const map = new Map<string, { lessons: number; minutes: number; grades: Set<number> }>();
    items.forEach((item) => {
      if (!item.unit) return;
      const summary = map.get(item.unit) || { lessons: 0, minutes: 0, grades: new Set<number>() };
      summary.lessons += 1;
      summary.minutes += item.topics.reduce((total, topic) => total + (topic.duration || 0), 0);
      summary.grades.add(item.grade);
      map.set(item.unit, summary);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const rename = async (unit: string) => {
    const next = (renames[unit] || unit).trim();
    if (!next || next === unit) return;
    setBusyUnit(unit);
    try {
      await onRename(unit, next);
      setRenames((current) => ({ ...current, [unit]: "" }));
    } finally {
      setBusyUnit("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Units</DialogTitle>
          <DialogDescription>Rename or merge units and assign planner colors. Renaming to an existing name merges the units.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {units.length === 0 ? <p className="text-sm text-muted-foreground">No units have been assigned yet.</p> : units.map(([unit, summary]) => (
            <div key={unit} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[48px_1fr_auto] sm:items-center">
              <Input type="color" value={colors[unit] || "#2563eb"} onChange={(event) => onColorChange(unit, event.target.value)} className="h-10 w-12 p-1" aria-label={`Color for ${unit}`} />
              <div>
                <Input value={renames[unit] ?? unit} onChange={(event) => setRenames((current) => ({ ...current, [unit]: event.target.value }))} />
                <p className="mt-1 text-xs text-muted-foreground">{summary.lessons} lessons · {Math.round(summary.minutes / 60 * 10) / 10} hours · Grades {[...summary.grades].sort().join(", ")}</p>
              </div>
              <Button variant="outline" onClick={() => rename(unit)} disabled={busyUnit === unit || !(renames[unit] || "").trim() || renames[unit] === unit}>Rename</Button>
            </div>
          ))}
        </div>
        <DialogFooter><Button onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
