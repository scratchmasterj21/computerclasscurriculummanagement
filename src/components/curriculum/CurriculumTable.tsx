import { useState } from "react";
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
import { CurriculumItem, TopicType } from "@/types/curriculum";
import { Edit, Trash2, ChevronDown, ChevronRight, ArrowUpDown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CurriculumTableProps {
  items: CurriculumItem[];
  selectedItems: string[];
  onSelectItem: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onEdit: (item: CurriculumItem) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (item: CurriculumItem) => void;
  sortConfig?: { field: string; direction: "asc" | "desc" };
  onSort?: (field: string) => void;
}

const topicTypeColors: Record<TopicType, string> = {
  lecture: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  lab: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  assignment: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  project: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
};

export function CurriculumTable({
  items,
  selectedItems,
  onSelectItem,
  onSelectAll,
  onEdit,
  onDelete,
  onDuplicate,
  sortConfig,
  onSort,
}: CurriculumTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => {
    if (!onSort) return <TableHead className="font-bold">{children}</TableHead>;
    
    const isSorted = sortConfig?.field === field;
    const isAsc = sortConfig?.direction === "asc";
    
    return (
      <TableHead className="font-bold">
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 font-bold hover:bg-transparent"
          onClick={() => onSort(field)}
        >
          {children}
          <ArrowUpDown className="ml-2 h-3 w-3" />
          {isSorted && (
            <span className="ml-1 text-xs">
              {isAsc ? "↑" : "↓"}
            </span>
          )}
        </Button>
      </TableHead>
    );
  };

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
            <SortableHeader field="grade">Grade</SortableHeader>
            <SortableHeader field="week">Week</SortableHeader>
            <SortableHeader field="title">Title</SortableHeader>
            <SortableHeader field="topics">Topics</SortableHeader>
            <SortableHeader field="resources">Resources</SortableHeader>
            <TableHead className="text-right font-bold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 py-4">
                  <div className="text-muted-foreground text-lg">No curriculum items found</div>
                  <div className="text-sm text-muted-foreground">
                    Click "Add Item" to get started or adjust your filters.
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const isExpanded = expandedRows.has(item.id);
              return (
                <>
                  <TableRow 
                    key={item.id}
                    className="hover:bg-primary/5 transition-colors border-b border-border/50 cursor-pointer"
                    onClick={() => toggleRow(item.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => onSelectItem(item.id)}
                        aria-label={`Select ${item.title}`}
                        onClick={(e) => e.stopPropagation()}
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
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-semibold text-foreground">{item.title}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {item.description}
                            </div>
                          )}
                        </div>
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
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(item)}
                          className="hover:bg-primary/10 hover:text-primary"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {onDuplicate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDuplicate(item)}
                            className="hover:bg-blue-10 hover:text-blue-600"
                            title="Duplicate"
                          >
                            <ChevronRight className="h-4 w-4 rotate-90" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(item.id)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${item.id}-expanded`} className="bg-muted/20">
                      <TableCell colSpan={7} className="p-4">
                        <div className="space-y-4">
                          {item.description && (
                            <div>
                              <h4 className="font-semibold mb-2 text-sm">Description</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {item.description}
                              </p>
                            </div>
                          )}
                          {item.topics && item.topics.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2 text-sm">Topics</h4>
                              <div className="flex flex-wrap gap-2">
                                {item.topics.map((topic, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className={topicTypeColors[topic.type] || topicTypeColors.other}
                                  >
                                    {topic.name}
                                    {topic.duration && (
                                      <span className="ml-1 text-xs">({topic.duration} min)</span>
                                    )}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.resources && item.resources.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2 text-sm">Resources</h4>
                              <div className="space-y-2">
                                {item.resources.map((resource, idx) => (
                                  <a
                                    key={idx}
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    <span>{resource.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {resource.type}
                                    </Badge>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                            <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                            {item.updatedAt !== item.createdAt && (
                              <span>Updated: {new Date(item.updatedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

