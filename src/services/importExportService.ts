import Papa from "papaparse";
import { CurriculumItem, CurriculumItemInput, Topic, Resource } from "@/types/curriculum";

export const importExportService = {
  // Parse CSV file
  parseCSV: async (file: File): Promise<CurriculumItemInput[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const items = results.data.map((row: any) => {
              const item: CurriculumItemInput = {
                title: row.title || "",
                description: row.description || "",
                week: parseInt(row.week) || 1,
                grade: parseInt(row.grade) || 1,
                topics: [],
                resources: [],
              };

              // Parse topics (can be comma-separated or JSON)
              if (row.topics) {
                try {
                  item.topics = JSON.parse(row.topics);
                } catch {
                  // If not JSON, try to parse as simple format
                  const topicNames = row.topics.split(",").map((t: string) => t.trim());
                  item.topics = topicNames.map((name: string) => ({
                    name,
                    type: (row.topic_type as any) || "lecture",
                  }));
                }
              }

              // Parse resources (can be comma-separated or JSON)
              if (row.resources) {
                try {
                  item.resources = JSON.parse(row.resources);
                } catch {
                  // If not JSON, create simple resource
                  if (row.resource_url) {
                    item.resources = [
                      {
                        name: row.resource_name || "Resource",
                        url: row.resource_url,
                        type: (row.resource_type as any) || "link",
                      },
                    ];
                  }
                }
              }

              return item;
            });

            resolve(items);
          } catch (error) {
            reject(new Error("Failed to parse CSV: " + (error as Error).message));
          }
        },
        error: (error) => {
          reject(new Error("CSV parsing error: " + error.message));
        },
      });
    });
  },

  // Parse JSON file
  parseJSON: async (file: File): Promise<CurriculumItemInput[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const data = JSON.parse(text);
          const items = Array.isArray(data) ? data : [data];
          
          // Validate and transform items
          const validatedItems: CurriculumItemInput[] = items.map((item: any) => ({
            title: item.title || "",
            description: item.description || "",
            week: parseInt(item.week) || 1,
            grade: parseInt(item.grade) || 1,
            topics: item.topics || [],
            resources: item.resources || [],
          }));

          resolve(validatedItems);
        } catch (error) {
          reject(new Error("Failed to parse JSON: " + (error as Error).message));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  },

  // Validate imported data
  validateImportData: (items: CurriculumItemInput[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    items.forEach((item, index) => {
      if (!item.title || item.title.trim() === "") {
        errors.push(`Item ${index + 1}: Title is required`);
      }
      if (!item.week || item.week < 1 || item.week > 52) {
        errors.push(`Item ${index + 1}: Week must be between 1 and 52`);
      }
      if (!item.grade || item.grade < 1 || item.grade > 6) {
        errors.push(`Item ${index + 1}: Grade must be between 1 and 6`);
      }
      if (!item.topics || item.topics.length === 0) {
        errors.push(`Item ${index + 1}: At least one topic is required`);
      }
      item.topics?.forEach((topic, topicIndex) => {
        if (!topic.name || topic.name.trim() === "") {
          errors.push(`Item ${index + 1}, Topic ${topicIndex + 1}: Name is required`);
        }
      });
      item.resources?.forEach((resource, resourceIndex) => {
        if (!resource.name || resource.name.trim() === "") {
          errors.push(`Item ${index + 1}, Resource ${resourceIndex + 1}: Name is required`);
        }
        if (!resource.url || !isValidUrl(resource.url)) {
          errors.push(`Item ${index + 1}, Resource ${resourceIndex + 1}: Valid URL is required`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  // Export to CSV
  exportToCSV: (items: CurriculumItem[]): string => {
    const csvData = items.map((item) => ({
      grade: item.grade,
      week: item.week,
      title: item.title,
      description: item.description,
      topics: JSON.stringify(item.topics),
      resources: JSON.stringify(item.resources),
    }));

    return Papa.unparse(csvData);
  },

  // Export to JSON
  exportToJSON: (items: CurriculumItem[]): string => {
    return JSON.stringify(items, null, 2);
  },

  // Download file
  downloadFile: (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

