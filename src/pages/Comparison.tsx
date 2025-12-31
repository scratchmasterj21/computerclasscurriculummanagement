import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { curriculumService } from "@/services/curriculumService";
import { analyticsService, ComparisonData } from "@/services/analyticsService";
import { exportService } from "@/services/exportService";
import { CurriculumItem } from "@/types/curriculum";
import { YearSelector } from "@/components/curriculum/YearSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, Plus, Minus, Edit, CheckCircle2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function Comparison() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear().toString();
  const [year1, setYear1] = useState((parseInt(currentYear) - 1).toString());
  const [year2, setYear2] = useState(currentYear);
  const [year1Items, setYear1Items] = useState<CurriculumItem[]>([]);
  const [year2Items, setYear2Items] = useState<CurriculumItem[]>([]);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    loadComparison();
  }, [year1, year2, currentUser]);

  const loadComparison = async () => {
    setIsLoading(true);
    try {
      // Load both years
      const loadYear = (year: string): Promise<CurriculumItem[]> => {
        return new Promise((resolve) => {
          const unsubscribe = curriculumService.getCurriculum(year, (data) => {
            unsubscribe();
            resolve(data);
          });
        });
      };

      const [items1, items2] = await Promise.all([
        loadYear(year1),
        loadYear(year2),
      ]);

      setYear1Items(items1);
      setYear2Items(items2);

      if (items1.length > 0 || items2.length > 0) {
        const comparisonData = analyticsService.compareYears(
          items1,
          items2,
          year1,
          year2
        );
        setComparison(comparisonData);
      } else {
        setComparison(null);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load comparison data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!comparison) return;
    try {
      exportService.exportComparisonToPDF(comparison);
      toast({
        title: "Exported",
        description: "Comparison PDF has been generated and downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to export PDF",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading comparison...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Curriculum Comparison</h1>
          <p className="text-muted-foreground mt-1">
            Compare curriculum between two academic years
          </p>
        </div>
        {comparison && (
          <Button onClick={handleExportPDF} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Year 1</label>
          <YearSelector selectedYear={year1} onYearChange={setYear1} />
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground mt-6" />
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Year 2</label>
          <YearSelector selectedYear={year2} onYearChange={setYear2} />
        </div>
      </div>

      {!comparison ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <p>No data available for comparison</p>
              <p className="text-sm mt-2">
                Select years that have curriculum data
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Statistics */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{year1} Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{comparison.stats.year1Total}</div>
                <p className="text-xs text-muted-foreground">Items</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{year2} Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{comparison.stats.year2Total}</div>
                <p className="text-xs text-muted-foreground">Items</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-600" />
                  Added
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {comparison.stats.addedCount}
                </div>
                <p className="text-xs text-muted-foreground">New items</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Minus className="h-4 w-4 text-red-600" />
                  Removed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {comparison.stats.removedCount}
                </div>
                <p className="text-xs text-muted-foreground">Deleted items</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Edit className="h-4 w-4 text-blue-600" />
                  Modified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {comparison.stats.modifiedCount}
                </div>
                <p className="text-xs text-muted-foreground">Changed items</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Comparison */}
          <Tabs defaultValue="added" className="space-y-4">
            <TabsList>
              <TabsTrigger value="added">
                Added ({comparison.stats.addedCount})
              </TabsTrigger>
              <TabsTrigger value="removed">
                Removed ({comparison.stats.removedCount})
              </TabsTrigger>
              <TabsTrigger value="modified">
                Modified ({comparison.stats.modifiedCount})
              </TabsTrigger>
              <TabsTrigger value="unchanged">
                Unchanged ({comparison.stats.unchangedCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="added">
              <Card>
                <CardHeader>
                  <CardTitle>Items Added in {year2}</CardTitle>
                  <CardDescription>
                    New curriculum items that weren't in {year1}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {comparison.added.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Week</TableHead>
                          <TableHead>Topics</TableHead>
                          <TableHead>Resources</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparison.added.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">Grade {item.grade}</Badge>
                            </TableCell>
                            <TableCell>Week {item.week}</TableCell>
                            <TableCell>{item.topics.length}</TableCell>
                            <TableCell>{item.resources.length}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No items were added
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="removed">
              <Card>
                <CardHeader>
                  <CardTitle>Items Removed from {year1}</CardTitle>
                  <CardDescription>
                    Items that existed in {year1} but not in {year2}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {comparison.removed.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Week</TableHead>
                          <TableHead>Topics</TableHead>
                          <TableHead>Resources</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparison.removed.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">Grade {item.grade}</Badge>
                            </TableCell>
                            <TableCell>Week {item.week}</TableCell>
                            <TableCell>{item.topics.length}</TableCell>
                            <TableCell>{item.resources.length}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No items were removed
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="modified">
              <Card>
                <CardHeader>
                  <CardTitle>Modified Items</CardTitle>
                  <CardDescription>
                    Items that exist in both years but have been changed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {comparison.modified.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Week</TableHead>
                          <TableHead>Changes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparison.modified.map(({ item, changes }) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">Grade {item.grade}</Badge>
                            </TableCell>
                            <TableCell>Week {item.week}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {changes.map((change, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {change}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No items were modified
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="unchanged">
              <Card>
                <CardHeader>
                  <CardTitle>Unchanged Items</CardTitle>
                  <CardDescription>
                    Items that remain the same in both years
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {comparison.unchanged.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Week</TableHead>
                          <TableHead>Topics</TableHead>
                          <TableHead>Resources</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparison.unchanged.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">Grade {item.grade}</Badge>
                            </TableCell>
                            <TableCell>Week {item.week}</TableCell>
                            <TableCell>{item.topics.length}</TableCell>
                            <TableCell>{item.resources.length}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No unchanged items
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
