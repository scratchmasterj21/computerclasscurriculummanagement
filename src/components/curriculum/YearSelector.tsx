import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface YearSelectorProps {
  selectedYear: string;
  onYearChange: (year: string) => void;
}

export function YearSelector({ selectedYear, onYearChange }: YearSelectorProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="year-select">Year:</Label>
      <Select value={selectedYear} onValueChange={onYearChange}>
        <SelectTrigger id="year-select" className="w-[140px]">
          <SelectValue placeholder="Select year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

