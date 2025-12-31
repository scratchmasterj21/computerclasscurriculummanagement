import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { curriculumService } from "@/services/curriculumService";
import { analyticsService, AnalyticsData } from "@/services/analyticsService";
import { exportService } from "@/services/exportService";
import { CurriculumItem, GradeLevel } from "@/types/curriculum";
import { YearSelector } from "@/components/curriculum/YearSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, BarChart3, TrendingUp, Calendar, BookOpen, Link2, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export function Analytics() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);

    const unsubscribe = curriculumService.getCurriculum(
      selectedYear,
      (data) => {
        setItems(data);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedYear, currentUser]);

  useEffect(() => {
    if (items.length > 0) {
      const analyticsData = analyticsService.calculateAnalytics(items);
      setAnalytics(analyticsData);
    } else {
      setAnalytics(null);
    }
  }, [items]);

  const handleExportPDF = () => {
    if (!analytics) return;
    try {
      exportService.exportToPDF(items, analytics, selectedYear);
      toast({
        title: "Exported",
        description: "PDF report has been generated and downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to export PDF",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    if (!analytics) return;
    try {
      exportService.exportToExcel(items, analytics, selectedYear);
      toast({
        title: "Exported",
        description: "Excel report has been generated and downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to export Excel",
        variant: "destructive",
      });
    }
  };

  // Chart data preparation
  const gradeChartData = useMemo(() => {
    if (!analytics) return [];
    return [1, 2, 3, 4, 5, 6].map((grade) => ({
      grade: `Grade ${grade}`,
      items: analytics.itemsByGrade[grade as GradeLevel],
    }));
  }, [analytics]);

  const topicTypeChartData = useMemo(() => {
    if (!analytics) return [];
    return Object.entries(analytics.itemsByTopicType).map(([type, count]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count,
    }));
  }, [analytics]);

  const weekCoverageChartData = useMemo(() => {
    if (!analytics) return [];
    // Group by month for better visualization
    const monthlyData: Record<number, number> = {};
    analytics.weekCoverage.forEach((wc) => {
      const month = Math.floor((wc.week - 1) / 4.33) + 1; // Approximate month
      monthlyData[month] = (monthlyData[month] || 0) + wc.itemCount;
    });
    return Object.entries(monthlyData).map(([month, count]) => ({
      month: `Month ${month}`,
      items: count,
    }));
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics || items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No curriculum data available for {selectedYear}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into your curriculum
          </p>
        </div>
        <div className="flex items-center gap-4">
          <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
          <div className="flex gap-2">
            <Button onClick={handleExportPDF} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={handleExportExcel} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Curriculum items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Topics</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTopics}</div>
            <p className="text-xs text-muted-foreground">
              Across all items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalResources}</div>
            <p className="text-xs text-muted-foreground">
              Links and materials
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analytics.totalDuration / 60)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated teaching time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="gaps">Gaps Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Items by Grade</CardTitle>
                <CardDescription>Distribution of curriculum items across grades</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={gradeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="grade" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="items" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Items by Topic Type</CardTitle>
                <CardDescription>Breakdown of topic types</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topicTypeChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {topicTypeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Week Coverage</CardTitle>
              <CardDescription>Items distributed across weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.weekCoverage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="itemCount" stroke="#8884d8" name="Items" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {analytics.gradeCoverage.map((gc) => (
              <Card key={gc.grade}>
                <CardHeader>
                  <CardTitle>Grade {gc.grade} Coverage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Items:</span>
                      <span className="font-bold">{gc.itemCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Weeks Covered:</span>
                      <span className="font-bold">{gc.weekCount} / 52</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${(gc.weekCount / 52) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Topic Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topicTypeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4">
          {analytics.gaps.length > 0 ? (
            <div className="grid gap-4">
              {analytics.gaps.map((gap) => (
                <Card key={gap.grade}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      Grade {gap.grade} - Missing Weeks
                    </CardTitle>
                    <CardDescription>
                      {gap.weeks.length} weeks without curriculum items
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {gap.weeks.map((week) => (
                        <span
                          key={week}
                          className="px-2 py-1 rounded-md bg-muted text-sm"
                        >
                          Week {week}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No gaps detected! All weeks have curriculum items.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
