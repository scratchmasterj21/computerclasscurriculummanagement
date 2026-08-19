import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurriculumItem } from "@/types/curriculum";
import { isDateInSchoolYear } from "@/utils/dateHelpers";

export type AttentionFilter = "none" | "objectives" | "resources" | "conflicts" | "dates" | "single-unit" | "theory-only" | "overloaded" | "invalid-links";

const hasInvalidLink = (item: CurriculumItem) => item.resources.some((resource) => {
  try { new URL(resource.url); return false; } catch { return true; }
});

export function AttentionPanel({ items, year, active, onSelect }: { items: CurriculumItem[]; year: number; active: AttentionFilter; onSelect: (filter: AttentionFilter) => void }) {
  const duplicateKeys = new Set<string>();
  const counts = new Map<string, number>();
  items.forEach((item) => { const key = `${item.grade}|${item.lessonDate || item.week}`; counts.set(key, (counts.get(key) || 0) + 1); });
  counts.forEach((count, key) => { if (count > 1) duplicateKeys.add(key); });
  const unitCounts = new Map<string, number>();
  const weekCounts = new Map<string, number>();
  items.forEach((item) => { if (item.unit) unitCounts.set(item.unit, (unitCounts.get(item.unit) || 0) + 1); });
  items.forEach((item) => { const key = `${item.grade}|${item.week}`; weekCounts.set(key, (weekCounts.get(key) || 0) + 1); });
  const checks: Array<{ id: AttentionFilter; label: string; count: number }> = [
    { id: "objectives", label: "Without objectives", count: items.filter((item) => !item.objectives?.length).length },
    { id: "resources", label: "Without resources", count: items.filter((item) => !item.resources.length).length },
    { id: "conflicts", label: "Schedule conflicts", count: items.filter((item) => duplicateKeys.has(`${item.grade}|${item.lessonDate || item.week}`)).length },
    { id: "dates", label: "Outside school year", count: items.filter((item) => item.lessonDate && !isDateInSchoolYear(item.lessonDate, year)).length },
    { id: "single-unit", label: "Single-lesson units", count: items.filter((item) => item.unit && unitCounts.get(item.unit) === 1).length },
    { id: "theory-only", label: "No practical activity", count: items.filter((item) => !item.topics.some((topic) => topic.type === "lab" || topic.type === "project")).length },
    { id: "overloaded", label: "Busy weeks", count: items.filter((item) => (weekCounts.get(`${item.grade}|${item.week}`) || 0) >= 3).length },
    { id: "invalid-links", label: "Invalid resource links", count: items.filter(hasInvalidLink).length },
  ];
  const total = checks.reduce((sum, check) => sum + check.count, 0);
  return <div className="rounded-lg border bg-card p-4 shadow-sm">
    <div className="flex items-center gap-2">
      {total ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
      <span className="font-semibold">Attention Needed</span>
      <span className="text-sm text-muted-foreground">{total ? "Review possible curriculum gaps" : "No planning issues found"}</span>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      {checks.map((check) => <Button key={check.id} size="sm" variant={active === check.id ? "default" : "outline"} onClick={() => onSelect(active === check.id ? "none" : check.id)} disabled={!check.count}>{check.label} ({check.count})</Button>)}
    </div>
  </div>;
}
