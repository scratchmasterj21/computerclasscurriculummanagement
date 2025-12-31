import { CurriculumItem, GradeLevel } from "@/types/curriculum";
import { AnalyticsData } from "./analyticsService";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { getSchoolYearMonths, getMonthFromWeek } from "@/utils/dateHelpers";

export const exportService = {
  exportToPDF: (
    items: CurriculumItem[],
    analytics: AnalyticsData,
    year: string,
    title: string = "Curriculum Report"
  ) => {
    const doc = new jsPDF();
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;

    // Helper to add new page if needed
    const checkNewPage = (requiredSpace: number = 10) => {
      if (yPos + requiredSpace > pageHeight - margin) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // Title
    doc.setFontSize(20);
    doc.text(title, margin, yPos);
    yPos += 10;
    doc.setFontSize(12);
    doc.text(`Year: ${year}`, margin, yPos);
    yPos += 10;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Summary Statistics
    doc.setFontSize(16);
    doc.text("Summary Statistics", margin, yPos);
    yPos += 10;
    doc.setFontSize(11);
    
    const stats = [
      `Total Items: ${analytics.totalItems}`,
      `Total Topics: ${analytics.totalTopics}`,
      `Total Resources: ${analytics.totalResources}`,
      `Total Duration: ${Math.round(analytics.totalDuration / 60)} hours`,
      `Average Items per Week: ${analytics.averageItemsPerWeek.toFixed(1)}`,
    ];
    
    stats.forEach((stat) => {
      checkNewPage();
      doc.text(stat, margin + 5, yPos);
      yPos += lineHeight;
    });
    yPos += 5;

    // Items by Grade
    checkNewPage(15);
    doc.setFontSize(14);
    doc.text("Items by Grade", margin, yPos);
    yPos += 8;
    doc.setFontSize(10);
    [1, 2, 3, 4, 5, 6].forEach((grade) => {
      checkNewPage();
      doc.text(
        `Grade ${grade}: ${analytics.itemsByGrade[grade as keyof typeof analytics.itemsByGrade]} items`,
        margin + 5,
        yPos
      );
      yPos += lineHeight;
    });
    yPos += 5;

    // Curriculum Items
    checkNewPage(20);
    doc.setFontSize(16);
    doc.text("Curriculum Items", margin, yPos);
    yPos += 10;

    items.forEach((item, index) => {
      checkNewPage(30);
      
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(`${index + 1}. ${item.title}`, margin, yPos);
      yPos += 7;
      
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text(`Grade ${item.grade} • Week ${item.week}`, margin + 5, yPos);
      yPos += 6;
      
      if (item.description) {
        const descLines = doc.splitTextToSize(item.description, 170);
        descLines.forEach((line: string) => {
          checkNewPage();
          doc.text(line, margin + 5, yPos);
          yPos += lineHeight;
        });
      }
      
      if (item.topics.length > 0) {
        checkNewPage();
        doc.text(`Topics (${item.topics.length}):`, margin + 5, yPos);
        yPos += 6;
        item.topics.forEach((topic) => {
          checkNewPage();
          doc.text(`  • ${topic.name} (${topic.type})`, margin + 10, yPos);
          yPos += lineHeight;
        });
      }
      
      yPos += 3;
    });

    // Save PDF
    doc.save(`curriculum-report-${year}-${Date.now()}.pdf`);
  },

  exportToExcel: (
    items: CurriculumItem[],
    analytics: AnalyticsData,
    year: string,
    title: string = "Curriculum Report"
  ) => {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ["Curriculum Report", year],
      ["Generated", new Date().toLocaleDateString()],
      [],
      ["Summary Statistics"],
      ["Total Items", analytics.totalItems],
      ["Total Topics", analytics.totalTopics],
      ["Total Resources", analytics.totalResources],
      ["Total Duration (hours)", Math.round(analytics.totalDuration / 60)],
      ["Average Items per Week", analytics.averageItemsPerWeek.toFixed(1)],
      [],
      ["Items by Grade"],
      ["Grade", "Item Count", "Weeks Covered"],
      ...analytics.gradeCoverage.map((gc) => [
        `Grade ${gc.grade}`,
        gc.itemCount,
        gc.weekCount,
      ]),
      [],
      ["Items by Topic Type"],
      ["Type", "Count"],
      ...Object.entries(analytics.itemsByTopicType).map(([type, count]) => [
        type,
        count,
      ]),
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Sheet 2: All Items
    const itemsData = [
      [
        "Title",
        "Grade",
        "Week",
        "Description",
        "Topics Count",
        "Resources Count",
        "Created",
        "Updated",
      ],
      ...items.map((item) => [
        item.title,
        item.grade,
        item.week,
        item.description || "",
        item.topics.length,
        item.resources.length,
        new Date(item.createdAt).toLocaleDateString(),
        new Date(item.updatedAt).toLocaleDateString(),
      ]),
    ];
    const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(workbook, itemsSheet, "All Items");

    // Sheet 3: Items by Grade
    [1, 2, 3, 4, 5, 6].forEach((grade) => {
      const gradeItems = items.filter((item) => item.grade === grade);
      if (gradeItems.length > 0) {
        const gradeData = [
          [`Grade ${grade} - Curriculum Items`],
          ["Title", "Week", "Description", "Topics", "Resources"],
          ...gradeItems.map((item) => [
            item.title,
            item.week,
            item.description || "",
            item.topics.map((t) => t.name).join(", "),
            item.resources.map((r) => r.name).join(", "),
          ]),
        ];
        const gradeSheet = XLSX.utils.aoa_to_sheet(gradeData);
        XLSX.utils.book_append_sheet(workbook, gradeSheet, `Grade ${grade}`);
      }
    });

    // Sheet 4: Week Coverage
    const coverageData = [
      ["Week", "Has Items", "Item Count"],
      ...analytics.weekCoverage.map((wc) => [
        wc.week,
        wc.hasItems ? "Yes" : "No",
        wc.itemCount,
      ]),
    ];
    const coverageSheet = XLSX.utils.aoa_to_sheet(coverageData);
    XLSX.utils.book_append_sheet(workbook, coverageSheet, "Week Coverage");

    // Sheet 5: Gaps Analysis
    if (analytics.gaps.length > 0) {
      const gapsData = [
        ["Grade", "Missing Weeks"],
        ...analytics.gaps.map((gap) => [
          `Grade ${gap.grade}`,
          gap.weeks.join(", "),
        ]),
      ];
      const gapsSheet = XLSX.utils.aoa_to_sheet(gapsData);
      XLSX.utils.book_append_sheet(workbook, gapsSheet, "Gaps Analysis");
    }

    // Sheet 6: Resources
    if (analytics.mostUsedResources.length > 0) {
      const resourcesData = [
        ["Resource Name", "URL", "Usage Count"],
        ...analytics.mostUsedResources.map((r) => [r.name, r.url, r.count]),
      ];
      const resourcesSheet = XLSX.utils.aoa_to_sheet(resourcesData);
      XLSX.utils.book_append_sheet(workbook, resourcesSheet, "Resources");
    }

    // Save Excel file
    XLSX.writeFile(workbook, `curriculum-report-${year}-${Date.now()}.xlsx`);
  },

  exportComparisonToPDF: (
    comparisonData: any,
    title: string = "Curriculum Comparison"
  ) => {
    const doc = new jsPDF();
    let yPos = 20;
    const margin = 20;
    const lineHeight = 7;

    doc.setFontSize(20);
    doc.text(title, margin, yPos);
    yPos += 10;
    doc.setFontSize(12);
    doc.text(
      `Comparing ${comparisonData.year1} vs ${comparisonData.year2}`,
      margin,
      yPos
    );
    yPos += 10;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;

    // Statistics
    doc.setFontSize(16);
    doc.text("Comparison Statistics", margin, yPos);
    yPos += 10;
    doc.setFontSize(11);
    const stats = [
      `${comparisonData.year1} Total: ${comparisonData.stats.year1Total} items`,
      `${comparisonData.year2} Total: ${comparisonData.stats.year2Total} items`,
      `Added: ${comparisonData.stats.addedCount} items`,
      `Removed: ${comparisonData.stats.removedCount} items`,
      `Modified: ${comparisonData.stats.modifiedCount} items`,
      `Unchanged: ${comparisonData.stats.unchangedCount} items`,
    ];
    stats.forEach((stat) => {
      doc.text(stat, margin + 5, yPos);
      yPos += lineHeight;
    });
    yPos += 10;

    // Added items
    if (comparisonData.added.length > 0) {
      doc.setFontSize(14);
      doc.text(`Added Items (${comparisonData.added.length})`, margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      comparisonData.added.slice(0, 20).forEach((item: CurriculumItem) => {
        doc.text(
          `• ${item.title} (Grade ${item.grade}, Week ${item.week})`,
          margin + 5,
          yPos
        );
        yPos += lineHeight;
      });
      yPos += 5;
    }

    // Removed items
    if (comparisonData.removed.length > 0) {
      doc.setFontSize(14);
      doc.text(`Removed Items (${comparisonData.removed.length})`, margin, yPos);
      yPos += 8;
      doc.setFontSize(10);
      comparisonData.removed.slice(0, 20).forEach((item: CurriculumItem) => {
        doc.text(
          `• ${item.title} (Grade ${item.grade}, Week ${item.week})`,
          margin + 5,
          yPos
        );
        yPos += lineHeight;
      });
    }

    doc.save(
      `curriculum-comparison-${comparisonData.year1}-vs-${comparisonData.year2}-${Date.now()}.pdf`
    );
  },

  exportMonthViewToPDF: (
    items: CurriculumItem[],
    year: number,
    selectedGrade: GradeLevel | "all",
    title: string = "Curriculum Month View"
  ) => {
    const doc = new jsPDF("landscape"); // Use landscape for better month view layout
    let yPos = 20;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const lineHeight = 6;
    const cellPadding = 3;

    const months = getSchoolYearMonths(year);
    const grades: GradeLevel[] = [1, 2, 3, 4, 5, 6];
    const displayGrades = selectedGrade === "all" ? grades : [selectedGrade];

    // Group items by grade and month
    const itemsByGradeAndMonth: Record<number, Record<number, CurriculumItem[]>> = {};
    displayGrades.forEach((grade) => {
      itemsByGradeAndMonth[grade] = {};
      months.forEach((month) => {
        itemsByGradeAndMonth[grade][month.monthIndex] = [];
      });
    });

    items.forEach((item) => {
      const monthIndex = getMonthFromWeek(item.week, year);
      if (itemsByGradeAndMonth[item.grade] && itemsByGradeAndMonth[item.grade][monthIndex]) {
        itemsByGradeAndMonth[item.grade][monthIndex].push(item);
      }
    });

    // Title
    doc.setFontSize(18);
    doc.text(title, margin, yPos);
    yPos += 8;
    doc.setFontSize(12);
    doc.text(`Academic Year: ${year}`, margin, yPos);
    yPos += 10;

    // Calculate column widths
    const gradeColWidth = 25;
    const monthColWidth = (pageWidth - margin * 2 - gradeColWidth) / months.length;
    const startX = margin;

    // Header row
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.rect(startX, yPos, gradeColWidth, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("Grade", startX + gradeColWidth / 2, yPos + 5, { align: "center" });
    doc.setTextColor(0, 0, 0);

    months.forEach((month, idx) => {
      const x = startX + gradeColWidth + idx * monthColWidth;
      doc.rect(x, yPos, monthColWidth, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(month.abbr, x + monthColWidth / 2, yPos + 5, { align: "center" });
      doc.setTextColor(0, 0, 0);
    });

    yPos += 8;

    // Grade rows
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    let currentY = yPos;

    displayGrades.forEach((grade) => {
      // Check if we need a new page
      if (currentY + 30 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
        // Redraw header
        doc.setFont(undefined, "bold");
        doc.rect(startX, currentY, gradeColWidth, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.text("Grade", startX + gradeColWidth / 2, currentY + 5, { align: "center" });
        doc.setTextColor(0, 0, 0);
        months.forEach((month, idx) => {
          const x = startX + gradeColWidth + idx * monthColWidth;
          doc.rect(x, currentY, monthColWidth, 8, "F");
          doc.setTextColor(255, 255, 255);
          doc.text(month.abbr, x + monthColWidth / 2, currentY + 5, { align: "center" });
          doc.setTextColor(0, 0, 0);
        });
        currentY += 8;
        doc.setFont(undefined, "normal");
      }

      const rowHeight = 25; // Fixed row height for grade
      const gradeY = currentY;

      // Grade label
      doc.rect(startX, gradeY, gradeColWidth, rowHeight, "S");
      doc.text(`G${grade}`, startX + gradeColWidth / 2, gradeY + rowHeight / 2, { align: "center" });

      // Month cells
      months.forEach((month, idx) => {
        const x = startX + gradeColWidth + idx * monthColWidth;
        const monthItems = itemsByGradeAndMonth[grade]?.[month.monthIndex] || [];
        
        doc.rect(x, gradeY, monthColWidth, rowHeight, "S");
        
        if (monthItems.length > 0) {
          let itemY = gradeY + cellPadding;
          monthItems.slice(0, 3).forEach((item) => {
            if (itemY + lineHeight <= gradeY + rowHeight - cellPadding) {
              doc.setFontSize(7);
              const title = doc.splitTextToSize(item.title, monthColWidth - cellPadding * 2);
              doc.text(title[0], x + cellPadding, itemY);
              itemY += lineHeight;
            }
          });
          if (monthItems.length > 3) {
            doc.setFontSize(6);
            doc.text(`+${monthItems.length - 3} more`, x + cellPadding, itemY);
          }
        } else {
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text("-", x + monthColWidth / 2, gradeY + rowHeight / 2, { align: "center" });
          doc.setTextColor(0, 0, 0);
        }
      });

      currentY += rowHeight;
    });

    doc.save(`curriculum-month-view-${year}-${Date.now()}.pdf`);
  },

  exportMonthViewToExcel: (
    items: CurriculumItem[],
    year: number,
    selectedGrade: GradeLevel | "all",
    title: string = "Curriculum Month View"
  ) => {
    const workbook = XLSX.utils.book_new();
    const months = getSchoolYearMonths(year);
    const grades: GradeLevel[] = [1, 2, 3, 4, 5, 6];
    const displayGrades = selectedGrade === "all" ? grades : [selectedGrade];

    // Group items by grade and month
    const itemsByGradeAndMonth: Record<number, Record<number, CurriculumItem[]>> = {};
    displayGrades.forEach((grade) => {
      itemsByGradeAndMonth[grade] = {};
      months.forEach((month) => {
        itemsByGradeAndMonth[grade][month.monthIndex] = [];
      });
    });

    items.forEach((item) => {
      const monthIndex = getMonthFromWeek(item.week, year);
      if (itemsByGradeAndMonth[item.grade] && itemsByGradeAndMonth[item.grade][monthIndex]) {
        itemsByGradeAndMonth[item.grade][monthIndex].push(item);
      }
    });

    // Create month view sheet
    const monthViewData: any[][] = [];
    
    // Header row
    const headerRow = ["Grade", ...months.map((m) => m.name)];
    monthViewData.push(headerRow);

    // Grade rows
    displayGrades.forEach((grade) => {
      const row: any[] = [`Grade ${grade}`];
      months.forEach((month) => {
        const monthItems = itemsByGradeAndMonth[grade]?.[month.monthIndex] || [];
        if (monthItems.length > 0) {
          const itemsText = monthItems
            .map((item) => `${item.title} (Week ${item.week})`)
            .join("\n");
          row.push(itemsText);
        } else {
          row.push("-");
        }
      });
      monthViewData.push(row);
    });

    const monthViewSheet = XLSX.utils.aoa_to_sheet(monthViewData);
    
    // Set column widths
    const colWidths = [{ wch: 12 }, ...months.map(() => ({ wch: 30 }))];
    monthViewSheet["!cols"] = colWidths;
    
    // Set row heights for better readability
    monthViewSheet["!rows"] = monthViewData.map(() => ({ hpt: 60 }));
    
    XLSX.utils.book_append_sheet(workbook, monthViewSheet, "Month View");

    // Create detailed sheet by grade
    displayGrades.forEach((grade) => {
      const gradeItems = items.filter((item) => item.grade === grade);
      if (gradeItems.length > 0) {
        const gradeData = [
          [`Grade ${grade} - Detailed View`],
          ["Month", "Week", "Title", "Description", "Topics", "Resources"],
          ...gradeItems.map((item) => {
            const monthIndex = getMonthFromWeek(item.week, year);
            const month = months.find((m) => m.monthIndex === monthIndex);
            return [
              month?.name || "",
              item.week,
              item.title,
              item.description || "",
              item.topics.map((t) => t.name).join(", "),
              item.resources.map((r) => r.name).join(", "),
            ];
          }),
        ];
        const gradeSheet = XLSX.utils.aoa_to_sheet(gradeData);
        XLSX.utils.book_append_sheet(workbook, gradeSheet, `Grade ${grade}`);
      }
    });

    XLSX.writeFile(workbook, `curriculum-month-view-${year}-${Date.now()}.xlsx`);
  },
};
