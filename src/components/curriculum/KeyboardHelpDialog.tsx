import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const shortcuts = [["N or Ctrl/⌘ N", "Add lesson"], ["/ or Ctrl/⌘ F", "Focus curriculum search"], ["Ctrl/⌘ E", "Edit the selected lesson"], ["Delete", "Delete selected lessons"], ["?", "Show this shortcut guide"], ["Escape", "Close the active dialog"]];
export function KeyboardHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Keyboard Shortcuts</DialogTitle><DialogDescription>Use these shortcuts when you are not typing in a field.</DialogDescription></DialogHeader><div className="space-y-2">{shortcuts.map(([keys, action]) => <div key={keys} className="flex items-center justify-between gap-4 rounded border p-2 text-sm"><kbd className="rounded bg-muted px-2 py-1 font-mono text-xs">{keys}</kbd><span>{action}</span></div>)}</div><DialogFooter><Button onClick={() => onOpenChange(false)}>Done</Button></DialogFooter></DialogContent></Dialog>;
}
