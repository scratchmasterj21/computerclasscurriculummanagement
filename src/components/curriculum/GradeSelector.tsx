import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { GradeLevel } from "@/types/curriculum";

interface GradeSelectorProps {
  selectedGrade: GradeLevel | "all";
  onGradeChange: (grade: GradeLevel | "all") => void;
}

export function GradeSelector({ selectedGrade, onGradeChange }: GradeSelectorProps) {
  const grades: GradeLevel[] = [1, 2, 3, 4, 5, 6];

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="grade-select">Grade:</Label>
      <Select 
        value={selectedGrade.toString()} 
        onValueChange={(value) => onGradeChange(value === "all" ? "all" : parseInt(value) as GradeLevel)}
      >
        <SelectTrigger id="grade-select" className="w-[140px]">
          <SelectValue placeholder="Select grade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Grades</SelectItem>
          {grades.map((grade) => (
            <SelectItem key={grade} value={grade.toString()}>
              Grade {grade}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

