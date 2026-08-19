import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STORAGE_KEY = "curriculum-lesson-templates";
interface StoredTemplate { id: string; name: string; unit?: string; objectives?: string[]; topics?: unknown[]; resources?: unknown[]; }

export function TemplateManagerDialog({ open, onOpenChange, onUse }: { open: boolean; onOpenChange: (open: boolean) => void; onUse: (id: string) => void }) {
  const [templates, setTemplates] = useState<StoredTemplate[]>([]);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!open) return;
    try { setTemplates(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { setTemplates([]); }
  }, [open]);
  const save = (next: StoredTemplate[]) => { setTemplates(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Lesson Templates</DialogTitle><DialogDescription>Rename, inspect, use, or remove your reusable lesson structures.</DialogDescription></DialogHeader>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates by name or unit..." />
      <div className="space-y-3">
        {templates.length === 0 ? <p className="text-sm text-muted-foreground">No templates saved yet. Save one from the lesson form.</p> : templates.filter((template) => `${template.name} ${template.unit || ""}`.toLowerCase().includes(query.toLowerCase())).map((template) => (
          <div key={template.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input className="min-w-[200px] flex-1" value={template.name} onChange={(event) => save(templates.map((entry) => entry.id === template.id ? { ...entry, name: event.target.value } : entry))} />
              <Button size="sm" onClick={() => onUse(template.id)}>Use</Button>
              <Button size="sm" variant="outline" onClick={() => save([...templates, { ...template, id: String(Date.now()), name: `${template.name} Copy` }])}>Duplicate</Button>
              <Button size="sm" variant="ghost" onClick={() => save(templates.filter((entry) => entry.id !== template.id))}>Delete</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{template.unit || "No unit"} · {template.objectives?.length || 0} objectives · {template.topics?.length || 0} topics · {template.resources?.length || 0} resources</p>
          </div>
        ))}
      </div>
      <DialogFooter><Button onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
