import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CurriculumItemInput, GradeLevel } from "@/types/curriculum";
import { importExportService } from "@/services/importExportService";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (items: CurriculumItemInput[]) => void;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  onImport,
}: BulkImportDialogProps) {
  const [activeTab, setActiveTab] = useState<"csv" | "json">("csv");
  const [jsonText, setJsonText] = useState("");
  const [previewItems, setPreviewItems] = useState<CurriculumItemInput[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setErrors([]);

    try {
      let items: CurriculumItemInput[];
      if (activeTab === "csv") {
        items = await importExportService.parseCSV(selectedFile);
      } else {
        items = await importExportService.parseJSON(selectedFile);
      }

      const validation = importExportService.validateImportData(items);
      if (validation.valid) {
        setPreviewItems(items);
      } else {
        setErrors(validation.errors);
        setPreviewItems([]);
      }
    } catch (error: any) {
      setErrors([error.message]);
      setPreviewItems([]);
    }
  };

  const handleJsonTextChange = async (text: string) => {
    setJsonText(text);
    setErrors([]);

    if (!text.trim()) {
      setPreviewItems([]);
      return;
    }

    try {
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : [data];
      const validatedItems: CurriculumItemInput[] = items.map((item: any) => ({
        title: item.title || "",
        description: item.description || "",
        week: parseInt(item.week) || 1,
        grade: (parseInt(item.grade) || 1) as GradeLevel,
        topics: item.topics || [],
        resources: item.resources || [],
      }));

      const validation = importExportService.validateImportData(validatedItems);
      if (validation.valid) {
        setPreviewItems(validatedItems);
      } else {
        setErrors(validation.errors);
        setPreviewItems([]);
      }
    } catch (error: any) {
      setErrors([`JSON parsing error: ${error.message}`]);
      setPreviewItems([]);
    }
  };

  const handleImport = () => {
    if (previewItems.length === 0) {
      toast({
        title: "No items to import",
        description: "Please provide valid data to import.",
        variant: "destructive",
      });
      return;
    }

    onImport(previewItems);
    onOpenChange(false);
    setJsonText("");
    setPreviewItems([]);
    setErrors([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import</DialogTitle>
          <DialogDescription>
            Import curriculum items from a CSV or JSON file.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "csv" | "json")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv">CSV File</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="space-y-4">
            <div>
              <Label htmlFor="csv-file">Upload CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="mt-1"
              />
            </div>
          </TabsContent>

          <TabsContent value="json" className="space-y-4">
            <div>
              <Label htmlFor="json-text">Paste JSON or Upload File</Label>
              <Textarea
                id="json-text"
                value={jsonText}
                onChange={(e) => handleJsonTextChange(e.target.value)}
                placeholder='[{"week": 1, "title": "...", ...}]'
                rows={10}
                className="mt-1 font-mono text-sm"
              />
              <Input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="mt-2"
              />
            </div>
          </TabsContent>
        </Tabs>

        {errors.length > 0 && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <h4 className="font-semibold text-destructive mb-2">Validation Errors:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {previewItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">
              Preview ({previewItems.length} items)
            </h4>
            <div className="rounded-md border max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grade</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Topics</TableHead>
                    <TableHead>Resources</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>Grade {item.grade}</TableCell>
                      <TableCell>{item.week}</TableCell>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{item.topics.length}</TableCell>
                      <TableCell>{item.resources.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={previewItems.length === 0 || errors.length > 0}
          >
            Import {previewItems.length > 0 ? `${previewItems.length} items` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

