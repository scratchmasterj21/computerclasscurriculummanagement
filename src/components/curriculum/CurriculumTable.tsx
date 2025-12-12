import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CurriculumItem } from "@/types/curriculum";
import { Edit, Trash2 } from "lucide-react";

interface CurriculumTableProps {
  items: CurriculumItem[];
  selectedItems: string[];
  onSelectItem: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onEdit: (item: CurriculumItem) => void;
  onDelete: (id: string) => void;
}

export function CurriculumTable({
  items,
  selectedItems,
  onSelectItem,
  onSelectAll,
  onEdit,
  onDelete,
}: CurriculumTableProps) {
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const someSelected = selectedItems.length > 0 && selectedItems.length < items.length;

  return (
    <div className="rounded-lg border-2 border-border/50 bg-card shadow-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-primary/10 to-primary/5 hover:bg-gradient-to-r hover:from-primary/15 hover:to-primary/10">
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="font-bold">Grade</TableHead>
            <TableHead className="font-bold">Week</TableHead>
            <TableHead className="font-bold">Title</TableHead>
            <TableHead className="font-bold">Topics</TableHead>
            <TableHead className="font-bold">Resources</TableHead>
            <TableHead className="text-right font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No curriculum items found. Click "Add Item" to get started.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow 
                key={item.id}
                className="hover:bg-primary/5 transition-colors border-b border-border/50"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => onSelectItem(item.id)}
                    aria-label={`Select ${item.title}`}
                  />
                </TableCell>
                <TableCell className="font-semibold">
                  <span className="px-2 py-1 rounded-md bg-primary/10 text-primary">
                    Grade {item.grade || "N/A"}
                  </span>
                </TableCell>
                <TableCell className="font-semibold">
                  <span className="px-2 py-1 rounded-md bg-muted text-foreground">
                    Week {item.week}
                  </span>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-semibold text-foreground">{item.title}</div>
                    {item.description && (
                      <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {item.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-sm font-medium">
                    {(item.topics || []).length} topic{(item.topics || []).length !== 1 ? 's' : ''}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-md bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-sm font-medium">
                    {(item.resources || []).length} resource{(item.resources || []).length !== 1 ? 's' : ''}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(item)}
                      className="hover:bg-primary/10 hover:text-primary"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(item.id)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

