import { CurriculumItem, GradeLevel, TopicType } from "@/types/curriculum";

export interface AnalyticsData {
  totalItems: number;
  itemsByGrade: Record<GradeLevel, number>;
  itemsByWeek: Record<number, number>;
  itemsByTopicType: Record<TopicType, number>;
  totalTopics: number;
  totalResources: number;
  weekCoverage: { week: number; hasItems: boolean; itemCount: number }[];
  gradeCoverage: { grade: GradeLevel; itemCount: number; weekCount: number }[];
  totalDuration: number; // in minutes
  averageItemsPerWeek: number;
  mostUsedResources: { name: string; url: string; count: number }[];
  gaps: { grade: GradeLevel; weeks: number[] }[];
}

export interface ComparisonData {
  year1: string;
  year2: string;
  added: CurriculumItem[];
  removed: CurriculumItem[];
  modified: Array<{
    item: CurriculumItem;
    changes: string[];
  }>;
  unchanged: CurriculumItem[];
  stats: {
    year1Total: number;
    year2Total: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
  };
}

export const analyticsService = {
  calculateAnalytics: (items: CurriculumItem[]): AnalyticsData => {
    const itemsByGrade: Record<GradeLevel, number> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
    };
    const itemsByWeek: Record<number, number> = {};
    const itemsByTopicType: Record<TopicType, number> = {
      lecture: 0,
      lab: 0,
      assignment: 0,
      project: 0,
      other: 0,
    };
    const resourceCounts: Record<string, { name: string; url: string; count: number }> = {};
    let totalDuration = 0;
    const weekSet = new Set<number>();
    const gradeWeekSet = new Map<GradeLevel, Set<number>>();

    items.forEach((item) => {
      // Count by grade
      itemsByGrade[item.grade] = (itemsByGrade[item.grade] || 0) + 1;

      // Count by week
      itemsByWeek[item.week] = (itemsByWeek[item.week] || 0) + 1;
      weekSet.add(item.week);

      // Track weeks per grade
      if (!gradeWeekSet.has(item.grade)) {
        gradeWeekSet.set(item.grade, new Set());
      }
      gradeWeekSet.get(item.grade)!.add(item.week);

      // Count by topic type
      item.topics.forEach((topic) => {
        itemsByTopicType[topic.type] = (itemsByTopicType[topic.type] || 0) + 1;
        if (topic.duration) {
          totalDuration += topic.duration;
        }
      });

      // Count resources
      item.resources.forEach((resource) => {
        const key = resource.url;
        if (!resourceCounts[key]) {
          resourceCounts[key] = {
            name: resource.name,
            url: resource.url,
            count: 0,
          };
        }
        resourceCounts[key].count += 1;
      });
    });

    // Calculate week coverage
    const weekCoverage = Array.from({ length: 52 }, (_, i) => {
      const week = i + 1;
      return {
        week,
        hasItems: weekSet.has(week),
        itemCount: itemsByWeek[week] || 0,
      };
    });

    // Calculate grade coverage
    const gradeCoverage: { grade: GradeLevel; itemCount: number; weekCount: number }[] = 
      [1, 2, 3, 4, 5, 6].map((grade) => ({
        grade: grade as GradeLevel,
        itemCount: itemsByGrade[grade as GradeLevel],
        weekCount: gradeWeekSet.get(grade as GradeLevel)?.size || 0,
      }));

    // Find gaps (weeks without items per grade)
    const gaps: { grade: GradeLevel; weeks: number[] }[] = [];
    [1, 2, 3, 4, 5, 6].forEach((grade) => {
      const weeksWithItems = gradeWeekSet.get(grade as GradeLevel) || new Set();
      const missingWeeks: number[] = [];
      for (let week = 1; week <= 52; week++) {
        if (!weeksWithItems.has(week)) {
          missingWeeks.push(week);
        }
      }
      if (missingWeeks.length > 0) {
        gaps.push({ grade: grade as GradeLevel, weeks: missingWeeks });
      }
    });

    // Most used resources
    const mostUsedResources = Object.values(resourceCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalTopics = items.reduce((sum, item) => sum + item.topics.length, 0);
    const totalResources = items.reduce((sum, item) => sum + item.resources.length, 0);
    const averageItemsPerWeek = items.length / 52;

    return {
      totalItems: items.length,
      itemsByGrade,
      itemsByWeek,
      itemsByTopicType,
      totalTopics,
      totalResources,
      weekCoverage,
      gradeCoverage,
      totalDuration,
      averageItemsPerWeek,
      mostUsedResources,
      gaps,
    };
  },

  compareYears: (
    year1Items: CurriculumItem[],
    year2Items: CurriculumItem[],
    year1: string,
    year2: string
  ): ComparisonData => {
    // Create maps for quick lookup
    const year1Map = new Map(year1Items.map((item) => [item.id, item]));
    const year2Map = new Map(year2Items.map((item) => [item.id, item]));

    // Find items by matching title, grade, and week (since IDs differ between years)
    const year1ByKey = new Map(
      year1Items.map((item) => [`${item.grade}-${item.week}-${item.title}`, item])
    );
    const year2ByKey = new Map(
      year2Items.map((item) => [`${item.grade}-${item.week}-${item.title}`, item])
    );

    const added: CurriculumItem[] = [];
    const removed: CurriculumItem[] = [];
    const modified: Array<{ item: CurriculumItem; changes: string[] }> = [];
    const unchanged: CurriculumItem[] = [];

    // Find added items (in year2 but not in year1)
    year2Items.forEach((item) => {
      const key = `${item.grade}-${item.week}-${item.title}`;
      if (!year1ByKey.has(key)) {
        added.push(item);
      }
    });

    // Find removed items (in year1 but not in year2)
    year1Items.forEach((item) => {
      const key = `${item.grade}-${item.week}-${item.title}`;
      if (!year2ByKey.has(key)) {
        removed.push(item);
      }
    });

    // Find modified and unchanged items
    year2Items.forEach((item) => {
      const key = `${item.grade}-${item.week}-${item.title}`;
      const year1Item = year1ByKey.get(key);
      
      if (year1Item) {
        const changes: string[] = [];
        
        if (year1Item.description !== item.description) {
          changes.push("Description changed");
        }
        if (year1Item.topics.length !== item.topics.length) {
          changes.push(`Topics count changed (${year1Item.topics.length} → ${item.topics.length})`);
        }
        if (year1Item.resources.length !== item.resources.length) {
          changes.push(`Resources count changed (${year1Item.resources.length} → ${item.resources.length})`);
        }
        
        // Check topic differences
        const year1TopicNames = new Set(year1Item.topics.map((t) => t.name));
        const year2TopicNames = new Set(item.topics.map((t) => t.name));
        if (JSON.stringify([...year1TopicNames].sort()) !== JSON.stringify([...year2TopicNames].sort())) {
          changes.push("Topics changed");
        }

        if (changes.length > 0) {
          modified.push({ item, changes });
        } else {
          unchanged.push(item);
        }
      }
    });

    return {
      year1,
      year2,
      added,
      removed,
      modified,
      unchanged,
      stats: {
        year1Total: year1Items.length,
        year2Total: year2Items.length,
        addedCount: added.length,
        removedCount: removed.length,
        modifiedCount: modified.length,
        unchangedCount: unchanged.length,
      },
    };
  },
};
