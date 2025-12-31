import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";
import { GradeLevel, TopicType } from "@/types/curriculum";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AdvancedSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  gradeFilter: GradeLevel | "all";
  onGradeFilterChange: (grade: GradeLevel | "all") => void;
  weekRange: { min: number; max: number };
  onWeekRangeChange: (range: { min: number; max: number }) => void;
  topicTypeFilter: TopicType | "all";
  onTopicTypeFilterChange: (type: TopicType | "all") => void;
  onClearFilters: () => void;
}

export function AdvancedSearch({
  searchQuery,
  onSearchChange,
  gradeFilter,
  onGradeFilterChange,
  weekRange,
  onWeekRangeChange,
  topicTypeFilter,
  onTopicTypeFilterChange,
  onClearFilters,
}: AdvancedSearchProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const hasActiveFilters = 
    gradeFilter !== "all" || 
    weekRange.min !== 1 || 
    weekRange.max !== 52 || 
    topicTypeFilter !== "all";

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search curriculum..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 shadow-sm border-2 focus:border-primary/50"
        />
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            size="sm"
            className="shadow-sm border-2"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Advanced Filters</DialogTitle>
            <DialogDescription>
              Filter curriculum items by multiple criteria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="grade-filter">Grade</Label>
              <Select
                value={gradeFilter.toString()}
                onValueChange={(value) =>
                  onGradeFilterChange(
                    value === "all" ? "all" : (parseInt(value) as GradeLevel)
                  )
                }
              >
                <SelectTrigger id="grade-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map((grade) => (
                    <SelectItem key={grade} value={grade.toString()}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Week Range</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={weekRange.min}
                  onChange={(e) =>
                    onWeekRangeChange({
                      min: parseInt(e.target.value) || 1,
                      max: weekRange.max,
                    })
                  }
                  className="w-24"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={weekRange.max}
                  onChange={(e) =>
                    onWeekRangeChange({
                      min: weekRange.min,
                      max: parseInt(e.target.value) || 52,
                    })
                  }
                  className="w-24"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="topic-type-filter">Topic Type</Label>
              <Select
                value={topicTypeFilter}
                onValueChange={(value) =>
                  onTopicTypeFilterChange(value as TopicType | "all")
                }
              >
                <SelectTrigger id="topic-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="lecture">Lecture</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={() => {
                  onClearFilters();
                  setIsDialogOpen(false);
                }}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
