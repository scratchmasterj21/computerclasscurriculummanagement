import { useMemo } from "react";
import { CurriculumItem, GradeLevel } from "@/types/curriculum";
import { getSchoolYearMonths, getMonthFromWeek } from "@/utils/dateHelpers";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
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
}

export function MonthView({
  items,
  year,
  selectedGrade,
  onEdit,
  onDelete,
}: MonthViewProps) {
  const months = getSchoolYearMonths(year);
  const grades: GradeLevel[] = [1, 2, 3, 4, 5, 6];
  const displayGrades = selectedGrade === "all" ? grades : [selectedGrade];

  // Group items by grade and month
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
                return (
                  <TableCell key={`${grade}-${month.monthIndex}`} className="p-2 border-r bg-gradient-to-br from-background to-muted/20">
                    <div className="space-y-2 min-h-[60px]">
                      {monthItems.length === 0 ? (
                        <div className="text-xs text-muted-foreground/50 text-center py-4 font-medium">
                          -
                        </div>
                      ) : (
                        monthItems.map((item) => (
                          <div
                            key={item.id}
                            className="group relative p-3 rounded-lg border-2 border-primary/20 bg-gradient-to-br from-card to-card/50 hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer"
                          >
                            <div className="space-y-1.5">
                              <div className="font-semibold text-sm text-foreground leading-tight">{item.title}</div>
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
                        ))
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

