import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { curriculumService } from "@/services/curriculumService";
import { importExportService } from "@/services/importExportService";

interface BackupRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onComplete: (message: string) => void;
}

interface CurriculumBackup {
  version: number;
  exportedAt?: string;
  curriculum: Record<string, unknown>;
  lessonTemplates?: unknown[];
}

const TEMPLATE_STORAGE_KEY = "curriculum-lesson-templates";

function countBackupLessons(backup: CurriculumBackup): number {
  let count = 0;
  for (const rawGrades of Object.values(backup.curriculum)) {
    if (!rawGrades || typeof rawGrades !== "object") continue;
    for (const rawItems of Object.values(rawGrades as Record<string, unknown>)) {
      if (!rawItems || typeof rawItems !== "object") continue;
      count += Object.keys(rawItems as Record<string, unknown>).length;
    }
  }
  return count;
}

export function BackupRestoreDialog({
  open,
  onOpenChange,
  userId,
  onComplete,
}: BackupRestoreDialogProps) {
  const [backup, setBackup] = useState<CurriculumBackup | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastBackup, setLastBackup] = useState(() => localStorage.getItem("curriculum-last-backup") || "");

  const exportBackup = async () => {
    setBusy(true);
    try {
      const data = await curriculumService.exportBackup();
      let lessonTemplates: unknown[] = [];
      try {
        lessonTemplates = JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) || "[]");
      } catch {
        lessonTemplates = [];
      }
      importExportService.downloadFile(
        JSON.stringify({ ...data, lessonTemplates }, null, 2),
        `curriculum-full-backup-${new Date().toISOString().slice(0, 10)}.json`,
        "application/json"
      );
      const timestamp = new Date().toISOString();
      localStorage.setItem("curriculum-last-backup", timestamp);
      setLastBackup(timestamp);
      onComplete("Full curriculum backup downloaded.");
    } finally {
      setBusy(false);
    }
  };

  const selectBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setBackup(null);
    setError("");
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as CurriculumBackup;
      if (parsed.version !== 1 || !parsed.curriculum || typeof parsed.curriculum !== "object") {
        throw new Error("Choose a full curriculum backup created by this system.");
      }
      setBackup(parsed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read this backup.");
    }
  };

  const restoreBackup = async () => {
    if (!backup) return;
    setBusy(true);
    setError("");
    try {
      const count = await curriculumService.restoreBackupMerge(backup, userId);
      if (Array.isArray(backup.lessonTemplates)) {
        let existingTemplates: unknown[] = [];
        try {
          existingTemplates = JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) || "[]");
        } catch {
          existingTemplates = [];
        }
        const byId = new Map<string, unknown>();
        [...existingTemplates, ...backup.lessonTemplates].forEach((template) => {
          if (template && typeof template === "object" && "id" in template) {
            byId.set(String((template as { id: unknown }).id), template);
          }
        });
        localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify([...byId.values()]));
      }
      onComplete(`Restored ${count} lessons. Existing lessons were kept.`);
      setBackup(null);
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Restore failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Backup and Restore</DialogTitle>
          <DialogDescription>
            Download every school year or merge lessons from a previous full backup. Restore never deletes existing lessons.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <p className="text-sm text-muted-foreground">Last backup: {lastBackup ? new Date(lastBackup).toLocaleString() : "No backup recorded on this device"}</p>
          <Button className="w-full" variant="outline" onClick={exportBackup} disabled={busy}>
            <Download className="mr-2 h-4 w-4" /> Download Full Backup
          </Button>
          <div className="space-y-2 border-t pt-4">
            <label htmlFor="backup-file" className="text-sm font-medium">Restore from backup</label>
            <Input id="backup-file" type="file" accept="application/json,.json" onChange={selectBackup} disabled={busy} />
            {backup && (
              <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                <p>Ready to merge {countBackupLessons(backup)} lessons across {Object.keys(backup.curriculum).length} school years.</p>
                <p>{backup.lessonTemplates?.length || 0} lesson templates included{backup.exportedAt ? ` · created ${new Date(backup.exportedAt).toLocaleString()}` : ""}.</p>
                <p className="mt-1">Existing matching lessons and templates will be skipped; nothing will be deleted.</p>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Close</Button>
          <Button onClick={restoreBackup} disabled={!backup || busy}>
            <Upload className="mr-2 h-4 w-4" /> {busy ? "Working..." : "Merge Backup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
