import { useMemo, useState } from "react";
import { CurriculumItem, GradeLevel } from "@/types/curriculum";
import {
  getSchoolYearMonths,
  getMonthFromWeek,
  getWeekForMonth,
  getFirstWeekForMonth,
  getLastWeekForMonth,
  getMonthFromLessonDate,
  formatLessonDate,
  getApproxLessonDateFromWeek,
} from "@/utils/dateHelpers";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Trash2,
  GripVertical,
  ArrowRightLeft,
  Eye,
  AlertCircle,
  CheckSquare,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MonthViewProps {
  items: CurriculumItem[];
  year: number;
  selectedGrade: GradeLevel | "all";
  onEdit: (item: CurriculumItem) => void;
  onDelete: (id: string) => void;
  onBulkDelete?: () => void;
  onMoveItem?: (itemId: string, newWeek: number) => void;
  onMoveItems?: (itemIds: string[], newWeek: number) => void;
  selectedItemIds?: string[];
  onToggleSelectItem?: (id: string) => void;
  onClearSelection?: () => void;
}

export function MonthView({
  items,
  year,
  selectedGrade,
  onEdit,
  onDelete,
  onBulkDelete,
  onMoveItem,
  onMoveItems,
  selectedItemIds = [],
  onToggleSelectItem,
  onClearSelection,
}: MonthViewProps) {
  const months = getSchoolYearMonths(year);
  const grades: GradeLevel[] = [1, 2, 3, 4, 5, 6];
  const displayGrades = selectedGrade === "all" ? grades : [selectedGrade];
  const [draggedItem, setDraggedItem] = useState<CurriculumItem | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [invalidDragCell, setInvalidDragCell] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<{ index: number; above: boolean } | null>(null);
  const [previewItem, setPreviewItem] = useState<CurriculumItem | null>(null);
  const [moveItem, setMoveItem] = useState<CurriculumItem | null>(null);
  const [moveMonthValue, setMoveMonthValue] = useState<string>("");
  const [showBatchMove, setShowBatchMove] = useState(false);
  const [batchMoveMonthValue, setBatchMoveMonthValue] = useState<string>("");

  const selectedMonthItems = useMemo(
    () => items.filter((item) => selectedItemIds.includes(item.id)),
    [items, selectedItemIds]
  );

  const selectedMonthGrade =
    selectedMonthItems.length > 0 &&
    selectedMonthItems.every((item) => item.grade === selectedMonthItems[0].grade)
      ? selectedMonthItems[0].grade
      : null;

  const calculateDropWeek = (
    monthItems: CurriculumItem[],
    monthIndex: number,
    position: { index: number; above: boolean } | null
  ) => {
    if (monthItems.length === 0) {
      return getWeekForMonth(monthIndex, year);
    }

    if (!position) {
      return getWeekForMonth(monthIndex, year);
    }

    const targetItem = monthItems[position.index];
    let newWeek: number;

    if (position.above) {
      const firstWeek = getFirstWeekForMonth(monthIndex, year);
      if (position.index === 0) {
        newWeek = Math.max(firstWeek, targetItem.week - 1);
      } else {
        const prevItem = monthItems[position.index - 1];
        const midWeek = Math.floor((prevItem.week + targetItem.week) / 2);
        newWeek =
          midWeek > prevItem.week && midWeek < targetItem.week
            ? midWeek
            : Math.max(prevItem.week + 1, targetItem.week - 1);
      }
    } else {
      const lastWeek = getLastWeekForMonth(monthIndex, year);
      if (position.index === monthItems.length - 1) {
        newWeek = Math.min(lastWeek, targetItem.week + 1);
      } else {
        const nextItem = monthItems[position.index + 1];
        const midWeek = Math.floor((targetItem.week + nextItem.week) / 2);
        newWeek =
          midWeek > targetItem.week && midWeek < nextItem.week
            ? midWeek
            : Math.min(targetItem.week + 1, nextItem.week - 1);
      }
    }

    return Math.max(1, Math.min(52, newWeek));
  };

  const itemsByGradeAndMonth = useMemo(() => {
    const grouped: Record<number, Record<number, CurriculumItem[]>> = {};

    displayGrades.forEach((grade) => {
      grouped[grade] = {};
      months.forEach((month) => {
        grouped[grade][month.monthIndex] = [];
      });
    });

    items.forEach((item) => {
      const monthIndex = item.lessonDate
        ? getMonthFromLessonDate(item.lessonDate, year)
        : getMonthFromWeek(item.week, year);
      if (grouped[item.grade] && grouped[item.grade][monthIndex]) {
        grouped[item.grade][monthIndex].push(item);
      }
    });

    // Sort items by week within each month
    displayGrades.forEach((grade) => {
      months.forEach((month) => {
        grouped[grade][month.monthIndex].sort((a, b) => a.week - b.week);
      });
    });

    return grouped;
  }, [items, year, displayGrades, months]);

  const monthSummary = useMemo(
    () =>
      months.map((month) => ({
        monthIndex: month.monthIndex,
        count: items.filter((item) => {
          const monthIndex = item.lessonDate
            ? getMonthFromLessonDate(item.lessonDate, year)
            : getMonthFromWeek(item.week, year);
          return monthIndex === month.monthIndex;
        }).length,
      })),
    [items, months, year]
  );

  const handleSingleMove = (item: CurriculumItem) => {
    if (!moveMonthValue || !onMoveItem) return;
    onMoveItem(item.id, getWeekForMonth(Number(moveMonthValue), year));
    setMoveItem(null);
    setMoveMonthValue("");
  };

  const handleBatchMove = () => {
    if (!batchMoveMonthValue || !selectedMonthGrade || !onMoveItems) return;
    const itemIds = selectedMonthItems.map((item) => item.id);
    onMoveItems(itemIds, getWeekForMonth(Number(batchMoveMonthValue), year));
    setShowBatchMove(false);
    setBatchMoveMonthValue("");
    onClearSelection?.();
  };

  return (
    <div className="space-y-4">
      {selectedMonthItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {selectedMonthItems.length} lesson{selectedMonthItems.length === 1 ? "" : "s"} selected
            </span>
            {selectedMonthGrade ? (
              <span className="text-muted-foreground">for Grade {selectedMonthGrade}</span>
            ) : (
              <span className="text-destructive">Select lessons from one grade to move together.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedMonthGrade}
              onClick={() => setShowBatchMove(true)}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Move Selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onBulkDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border-2 border-border/50 bg-card shadow-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[120px] w-[120px] font-bold text-base border-r-2 whitespace-nowrap">
              Grade
            </TableHead>
            {months.map((month) => {
              const summary = monthSummary.find((entry) => entry.monthIndex === month.monthIndex);
              return (
              <TableHead
                key={`${month.year}-${month.monthIndex}`}
                className="min-w-[200px] text-center bg-gradient-to-b from-primary/5 to-transparent border-r"
              >
                <div className="flex flex-col py-2">
                  <span className="font-bold text-primary">{month.name}</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {month.year}
                  </span>
                  <span className="mt-1 text-[11px] text-muted-foreground">
                    {summary?.count ?? 0} lesson{summary?.count === 1 ? "" : "s"}
                  </span>
                </div>
              </TableHead>
            )})}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayGrades.map((grade) => (
            <TableRow key={grade} className="hover:bg-muted/30 transition-colors border-b">
              <TableCell className="sticky left-0 bg-gradient-to-r from-muted/50 to-background z-10 font-bold text-base border-r-2 whitespace-nowrap min-w-[120px] w-[120px]">
                <div className="space-y-2">
                  <span className="px-3 py-1.5 rounded-md bg-primary/15 text-primary inline-block">
                    Grade {grade}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {items.filter((item) => item.grade === grade).length} lessons
                  </div>
                </div>
              </TableCell>
              {months.map((month) => {
                const monthItems = itemsByGradeAndMonth[grade]?.[month.monthIndex] || [];
                const cellId = `${grade}-${month.monthIndex}`;
                const isDragOver = dragOverCell === cellId;
                const isInvalidDrop = invalidDragCell === cellId;
                const cellTopicCount = monthItems.reduce((sum, item) => sum + item.topics.length, 0);
                return (
                  <TableCell 
                    key={cellId}
                    className={`p-2 border-r bg-gradient-to-br from-background to-muted/20 transition-colors ${
                      isDragOver ? "bg-primary/10 ring-1 ring-primary/40" : ""
                    } ${isInvalidDrop ? "bg-destructive/10 ring-1 ring-destructive/40" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!draggedItem) return;
                      if (draggedItem.grade === grade) {
                        setDragOverCell(cellId);
                        setInvalidDragCell(null);
                        setDropPosition(null);
                      } else {
                        setInvalidDragCell(cellId);
                        setDragOverCell(null);
                      }
                    }}
                    onDragLeave={() => {
                      setDragOverCell(null);
                      setInvalidDragCell(null);
                      setDropPosition(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedItem && draggedItem.grade === grade && onMoveItem) {
                        const newWeek = calculateDropWeek(monthItems, month.monthIndex, dropPosition);
                        onMoveItem(draggedItem.id, newWeek);
                      }
                      setDragOverCell(null);
                      setInvalidDragCell(null);
                      setDraggedItem(null);
                      setDropPosition(null);
                    }}
                  >
                    <div className="space-y-2 min-h-[88px]">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{monthItems.length} lessons</span>
                        <span>{cellTopicCount} topics</span>
                      </div>
                      {monthItems.length === 0 ? (
                        <div className={`text-xs text-center py-4 font-medium rounded-lg border-2 border-dashed transition-colors ${
                          isDragOver
                            ? "text-primary border-primary bg-primary/5"
                            : isInvalidDrop
                              ? "text-destructive border-destructive/40 bg-destructive/5"
                              : "text-muted-foreground/50 border-transparent"
                        }`}>
                          {isDragOver ? "Drop here to move lesson" : isInvalidDrop ? "Drop only within same grade" : "-"}
                        </div>
                      ) : (
                        monthItems.map((item, index) => {
                          const isDropAbove = dropPosition?.index === index && dropPosition?.above;
                          const isDropBelow = dropPosition?.index === index && !dropPosition?.above;
                          const isSelected = selectedItemIds.includes(item.id);
                          
                          return (
                            <div key={item.id}>
                              <div
                                className={`h-2 -mb-1 transition-all ${
                                  isDropAbove
                                    ? "bg-primary/30 border-t-2 border-primary border-dashed"
                                    : "hover:bg-primary/10"
                                }`}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (draggedItem && draggedItem.grade === grade && draggedItem.id !== item.id) {
                                    setDragOverCell(cellId);
                                    setInvalidDragCell(null);
                                    setDropPosition({ index, above: true });
                                  }
                                }}
                                onDragLeave={() => {
                                  setDropPosition(null);
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (draggedItem && draggedItem.grade === grade && draggedItem.id !== item.id && onMoveItem) {
                                    const newWeek = calculateDropWeek(monthItems, month.monthIndex, {
                                      index,
                                      above: true,
                                    });
                                    onMoveItem(draggedItem.id, newWeek);
                                  }
                                  setDragOverCell(null);
                                  setInvalidDragCell(null);
                                  setDraggedItem(null);
                                  setDropPosition(null);
                                }}
                              />
                              <div
                                draggable
                                onDragStart={(e) => {
                                  setDraggedItem(item);
                                  e.dataTransfer.effectAllowed = "move";
                                  setDragOverCell(null);
                                  setInvalidDragCell(null);
                                }}
                                onDragEnd={() => {
                                  setDraggedItem(null);
                                  setDragOverCell(null);
                                  setInvalidDragCell(null);
                                  setDropPosition(null);
                                }}
                                className={`group relative p-3 rounded-lg border-2 bg-gradient-to-br from-card to-card/50 hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-move ${
                                  draggedItem?.id === item.id ? "opacity-50" : ""
                                } ${isDropBelow ? "border-primary/60 bg-primary/5" : "border-primary/20"} ${
                                  isSelected ? "ring-2 ring-primary/40 border-primary/40" : ""
                                }`}
                                onClick={() => setPreviewItem(item)}
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-start gap-2">
                                    <div
                                      className="mt-0.5 flex items-center gap-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => onToggleSelectItem?.(item.id)}
                                        aria-label={`Select ${item.title}`}
                                      />
                                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-semibold text-sm text-foreground leading-tight">
                                        {item.title}
                                      </div>
                                      {item.description && (
                                        <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                                          {item.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                      Week {item.week}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {formatLessonDate(
                                        item.lessonDate || getApproxLessonDateFromWeek(item.week, year)
                                      )}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {item.topics.length} topic{item.topics.length !== 1 ? "s" : ""}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {item.resources.length} resource{item.resources.length !== 1 ? "s" : ""}
                                    </span>
                                  </div>
                                </div>
                                <div
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                                    onClick={() => setPreviewItem(item)}
                                    title="Preview"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                                    onClick={() => {
                                      setMoveItem(item);
                                      setMoveMonthValue(String(month.monthIndex));
                                    }}
                                    title="Move to..."
                                  >
                                    <ArrowRightLeft className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                                    onClick={() => onEdit(item)}
                                    title="Edit"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => onDelete(item.id)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                          {index === monthItems.length - 1 && (
                            <div
                              className={`h-2 -mt-1 transition-all ${
                                isDropBelow
                                  ? "bg-primary/30 border-b-2 border-primary border-dashed"
                                  : "hover:bg-primary/10"
                              }`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (draggedItem && draggedItem.grade === grade && draggedItem.id !== item.id) {
                                  setDragOverCell(cellId);
                                  setInvalidDragCell(null);
                                  setDropPosition({ index, above: false });
                                }
                              }}
                              onDragLeave={() => {
                                setDropPosition(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (draggedItem && draggedItem.grade === grade && draggedItem.id !== item.id && onMoveItem) {
                                  const newWeek = calculateDropWeek(monthItems, month.monthIndex, {
                                    index,
                                    above: false,
                                  });
                                  onMoveItem(draggedItem.id, newWeek);
                                }
                                setDragOverCell(null);
                                setInvalidDragCell(null);
                                setDraggedItem(null);
                                setDropPosition(null);
                              }}
                            />
                          )}
                        </div>
                      );
                      })
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      <Dialog open={Boolean(previewItem)} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewItem?.title}</DialogTitle>
            <DialogDescription>
              Grade {previewItem?.grade} • Week {previewItem?.week} • {previewItem ? formatLessonDate(previewItem.lessonDate || getApproxLessonDateFromWeek(previewItem.week, year)) : ""}
            </DialogDescription>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium">Description</h4>
                <p className="mt-1 text-muted-foreground">
                  {previewItem.description || "No description."}
                </p>
              </div>
              <div>
                <h4 className="font-medium">Topics</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {previewItem.topics.length > 0 ? (
                    previewItem.topics.map((topic, index) => (
                      <span key={`${topic.name}-${index}`} className="rounded-full bg-muted px-3 py-1 text-xs">
                        {topic.name} • {topic.type}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No topics.</span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium">Resources</h4>
                <div className="mt-2 space-y-2">
                  {previewItem.resources.length > 0 ? (
                    previewItem.resources.map((resource, index) => (
                      <div key={`${resource.name}-${index}`} className="rounded-md border p-2">
                        <div className="font-medium">{resource.name}</div>
                        <div className="text-xs text-muted-foreground">{resource.url}</div>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No resources.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(moveItem)} onOpenChange={(open) => !open && setMoveItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Lesson</DialogTitle>
            <DialogDescription>
              Move this lesson to another month within Grade {moveItem?.grade}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={moveMonthValue} onValueChange={setMoveMonthValue}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={`move-${month.monthIndex}`} value={String(month.monthIndex)}>
                    {month.name} {month.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveItem(null)}>
              Cancel
            </Button>
            <Button onClick={() => moveItem && handleSingleMove(moveItem)}>
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBatchMove} onOpenChange={setShowBatchMove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Selected Lessons</DialogTitle>
            <DialogDescription>
              Move {selectedMonthItems.length} selected lesson{selectedMonthItems.length === 1 ? "" : "s"} to a new month within Grade {selectedMonthGrade}.
            </DialogDescription>
          </DialogHeader>
          {!selectedMonthGrade && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Select lessons from a single grade to move them together.
            </div>
          )}
          <Select value={batchMoveMonthValue} onValueChange={setBatchMoveMonthValue}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={`batch-${month.monthIndex}`} value={String(month.monthIndex)}>
                  {month.name} {month.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchMove(false)}>
              Cancel
            </Button>
            <Button disabled={!selectedMonthGrade || !batchMoveMonthValue} onClick={handleBatchMove}>
              Move Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

