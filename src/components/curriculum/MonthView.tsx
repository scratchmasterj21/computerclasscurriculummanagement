import { useMemo, useState } from "react";
import { CurriculumItem, GradeLevel } from "@/types/curriculum";
import { getSchoolYearMonths, getMonthFromWeek, getWeekForMonth, getFirstWeekForMonth, getLastWeekForMonth } from "@/utils/dateHelpers";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, GripVertical } from "lucide-react";
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
  onMoveItem?: (itemId: string, newWeek: number) => void;
}

export function MonthView({
  items,
  year,
  selectedGrade,
  onEdit,
  onDelete,
  onMoveItem,
}: MonthViewProps) {
  const months = getSchoolYearMonths(year);
  const grades: GradeLevel[] = [1, 2, 3, 4, 5, 6];
  const displayGrades = selectedGrade === "all" ? grades : [selectedGrade];
  const [draggedItem, setDraggedItem] = useState<CurriculumItem | null>(null);
  const [dragOverMonth, setDragOverMonth] = useState<number | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<{ index: number; above: boolean } | null>(null);

  // Group items by grade and month, sorted by week
  const itemsByGradeAndMonth = useMemo(() => {
    const grouped: Record<number, Record<number, CurriculumItem[]>> = {};

    displayGrades.forEach((grade) => {
      grouped[grade] = {};
      months.forEach((month) => {
        grouped[grade][month.monthIndex] = [];
      });
    });

    items.forEach((item) => {
      const monthIndex = getMonthFromWeek(item.week, year);
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

  return (
    <div className="rounded-lg border-2 border-border/50 bg-card shadow-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[120px] w-[120px] font-bold text-base border-r-2 whitespace-nowrap">
              Grade
            </TableHead>
            {months.map((month) => (
              <TableHead
                key={`${month.year}-${month.monthIndex}`}
                className="min-w-[200px] text-center bg-gradient-to-b from-primary/5 to-transparent border-r"
              >
                <div className="flex flex-col py-2">
                  <span className="font-bold text-primary">{month.name}</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {month.year}
                  </span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayGrades.map((grade) => (
            <TableRow key={grade} className="hover:bg-muted/30 transition-colors border-b">
              <TableCell className="sticky left-0 bg-gradient-to-r from-muted/50 to-background z-10 font-bold text-base border-r-2 whitespace-nowrap min-w-[120px] w-[120px]">
                <span className="px-3 py-1.5 rounded-md bg-primary/15 text-primary inline-block">
                  Grade {grade}
                </span>
              </TableCell>
              {months.map((month) => {
                const monthItems = itemsByGradeAndMonth[grade]?.[month.monthIndex] || [];
                const isDragOver = dragOverMonth === month.monthIndex;
                return (
                  <TableCell 
                    key={`${grade}-${month.monthIndex}`} 
                    className={`p-2 border-r bg-gradient-to-br from-background to-muted/20 ${isDragOver ? 'bg-primary/10 border-primary/50' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedItem && draggedItem.grade === grade) {
                        setDragOverMonth(month.monthIndex);
                        setDropPosition(null); // Reset drop position when dragging over empty area
                      }
                    }}
                    onDragLeave={() => {
                      setDragOverMonth(null);
                      setDropPosition(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedItem && draggedItem.grade === grade && onMoveItem) {
                        let newWeek: number;
                        
                        if (monthItems.length === 0) {
                          // Empty cell - use middle of month
                          newWeek = getWeekForMonth(month.monthIndex, year);
                        } else if (dropPosition) {
                          // Dropping above or below an existing item
                          const targetItem = monthItems[dropPosition.index];
                          if (dropPosition.above) {
                            // Drop above - use week before target item, but not less than first week of month
                            const firstWeek = getFirstWeekForMonth(month.monthIndex, year);
                            if (dropPosition.index === 0) {
                              // Dropping above first item - use first week of month or week before
                              newWeek = Math.max(firstWeek, targetItem.week - 1);
                            } else {
                              // Dropping above a middle item - use week between previous and target
                              const prevItem = monthItems[dropPosition.index - 1];
                              const midWeek = Math.floor((prevItem.week + targetItem.week) / 2);
                              newWeek = midWeek > prevItem.week && midWeek < targetItem.week 
                                ? midWeek 
                                : Math.max(prevItem.week + 1, targetItem.week - 1);
                            }
                          } else {
                            // Drop below - use week after target item
                            const lastWeek = getLastWeekForMonth(month.monthIndex, year);
                            if (dropPosition.index === monthItems.length - 1) {
                              // Dropping below last item - use last week of month or week after
                              newWeek = Math.min(lastWeek, targetItem.week + 1);
                            } else {
                              // Dropping below a middle item - use week between target and next
                              const nextItem = monthItems[dropPosition.index + 1];
                              const midWeek = Math.floor((targetItem.week + nextItem.week) / 2);
                              newWeek = midWeek > targetItem.week && midWeek < nextItem.week 
                                ? midWeek 
                                : Math.min(targetItem.week + 1, nextItem.week - 1);
                            }
                          }
                          // Ensure week is within valid range
                          newWeek = Math.max(1, Math.min(52, newWeek));
                        } else {
                          // Fallback: use middle of month
                          newWeek = getWeekForMonth(month.monthIndex, year);
                        }
                        
                        onMoveItem(draggedItem.id, newWeek);
                      }
                      setDragOverMonth(null);
                      setDraggedItem(null);
                      setDropPosition(null);
                    }}
                  >
                    <div className="space-y-2 min-h-[60px]">
                      {monthItems.length === 0 ? (
                        <div className={`text-xs text-center py-4 font-medium rounded-lg border-2 border-dashed transition-colors ${
                          isDragOver 
                            ? "text-primary border-primary bg-primary/5" 
                            : "text-muted-foreground/50 border-transparent"
                        }`}>
                          {isDragOver ? "Drop here to move" : "-"}
                        </div>
                      ) : (
                        monthItems.map((item, index) => {
                          const isDropAbove = dropPosition?.index === index && dropPosition?.above;
                          const isDropBelow = dropPosition?.index === index && !dropPosition?.above;
                          
                          return (
                            <div key={item.id}>
                              {/* Drop zone above item */}
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
                                    const firstWeek = getFirstWeekForMonth(month.monthIndex, year);
                                    let newWeek: number;
                                    if (index === 0) {
                                      // Dropping above first item
                                      newWeek = Math.max(firstWeek, item.week - 1);
                                    } else {
                                      // Dropping above a middle item - use week between previous and target
                                      const prevItem = monthItems[index - 1];
                                      const midWeek = Math.floor((prevItem.week + item.week) / 2);
                                      newWeek = midWeek > prevItem.week && midWeek < item.week 
                                        ? midWeek 
                                        : Math.max(prevItem.week + 1, item.week - 1);
                                    }
                                    newWeek = Math.max(1, Math.min(52, newWeek));
                                    onMoveItem(draggedItem.id, newWeek);
                                  }
                                  setDragOverMonth(null);
                                  setDraggedItem(null);
                                  setDropPosition(null);
                                }}
                              />
                              <div
                                draggable
                                onDragStart={(e) => {
                                  setDraggedItem(item);
                                  e.dataTransfer.effectAllowed = "move";
                                  if (e.dataTransfer) {
                                    e.dataTransfer.effectAllowed = "move";
                                  }
                                }}
                                onDragEnd={() => {
                                  setDraggedItem(null);
                                  setDragOverMonth(null);
                                  setDropPosition(null);
                                }}
                                className={`group relative p-3 rounded-lg border-2 border-primary/20 bg-gradient-to-br from-card to-card/50 hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-move ${
                                  draggedItem?.id === item.id ? "opacity-50" : ""
                                } ${isDropBelow ? "border-primary/60 bg-primary/5" : ""}`}
                              >
                            <div className="space-y-1.5">
                              <div className="flex items-start gap-2">
                                <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="font-semibold text-sm text-foreground leading-tight flex-1">{item.title}</div>
                              </div>
                              {item.description && (
                                <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                  {item.description}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                  Week {item.week}
                                </span>
                                {item.topics.length > 0 && (
                                  <span className="text-muted-foreground">
                                    • {item.topics.length} topic{item.topics.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                                onClick={() => onEdit(item)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => onDelete(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          {/* Drop zone below last item */}
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
                                  const lastWeek = getLastWeekForMonth(month.monthIndex, year);
                                  let newWeek: number;
                                  if (index === monthItems.length - 1) {
                                    // Dropping below last item
                                    newWeek = Math.min(lastWeek, item.week + 1);
                                  } else {
                                    // Dropping below a middle item - use week between target and next
                                    const nextItem = monthItems[index + 1];
                                    const midWeek = Math.floor((item.week + nextItem.week) / 2);
                                    newWeek = midWeek > item.week && midWeek < nextItem.week 
                                      ? midWeek 
                                      : Math.min(item.week + 1, nextItem.week - 1);
                                  }
                                  newWeek = Math.max(1, Math.min(52, newWeek));
                                  onMoveItem(draggedItem.id, newWeek);
                                }
                                setDragOverMonth(null);
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
  );
}

