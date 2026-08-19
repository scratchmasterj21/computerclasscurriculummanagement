import { ref, set, get, remove, onValue, off, push, update } from "firebase/database";
import { database } from "@/config/firebase";
import { CurriculumItem, CurriculumItemInput } from "@/types/curriculum";
import { getApproxLessonDateFromWeek, getWeekFromLessonDate } from "@/utils/dateHelpers";

function normalizeCurriculumInput(year: string, item: CurriculumItemInput): CurriculumItemInput {
  const schoolYear = parseInt(year);
  const lessonDate = item.lessonDate || getApproxLessonDateFromWeek(item.week, schoolYear);

  return {
    ...item,
    lessonDate,
    week: getWeekFromLessonDate(lessonDate, schoolYear),
  };
}

function normalizePartialCurriculumInput(
  year: string,
  currentItem: CurriculumItem,
  updates: Partial<CurriculumItemInput>
): Partial<CurriculumItemInput> {
  const schoolYear = parseInt(year);
  const lessonDate =
    updates.lessonDate ??
    (updates.week !== undefined
      ? getApproxLessonDateFromWeek(updates.week, schoolYear)
      : currentItem.lessonDate ?? getApproxLessonDateFromWeek(currentItem.week, schoolYear));

  return {
    ...updates,
    lessonDate,
    week:
      updates.week && !updates.lessonDate
        ? updates.week
        : getWeekFromLessonDate(lessonDate, schoolYear),
  };
}

export const curriculumService = {
  exportBackup: async () => {
    const snapshot = await get(ref(database, "curriculum"));
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      curriculum: snapshot.val() || {},
    };
  },

  restoreBackupMerge: async (
    backup: { version: number; curriculum: Record<string, unknown> },
    userId: string
  ): Promise<number> => {
    if (backup?.version !== 1 || !backup.curriculum || typeof backup.curriculum !== "object") {
      throw new Error("This is not a supported curriculum backup file.");
    }

    const existingSnapshot = await get(ref(database, "curriculum"));
    const existingData = existingSnapshot.val() || {};
    const existingKeys = new Set<string>();
    Object.entries(existingData).forEach(([year, rawGrades]) => {
      Object.entries((rawGrades || {}) as Record<string, unknown>).forEach(([grade, rawItems]) => {
        Object.values((rawItems || {}) as Record<string, Partial<CurriculumItem>>).forEach((item) => {
          existingKeys.add(`${year}|${grade}|${item.lessonDate || item.week}|${item.title}|${item.unit || ""}`);
        });
      });
    });

    let restoredCount = 0;
    for (const [year, rawGrades] of Object.entries(backup.curriculum)) {
      if (!/^\d{4}$/.test(year) || !rawGrades || typeof rawGrades !== "object") continue;
      for (const [gradeKey, rawItems] of Object.entries(rawGrades as Record<string, unknown>)) {
        const grade = Number(gradeKey);
        if (grade < 1 || grade > 6 || !rawItems || typeof rawItems !== "object") continue;
        for (const rawItem of Object.values(rawItems as Record<string, unknown>)) {
          if (!rawItem || typeof rawItem !== "object") continue;
          const item = rawItem as Partial<CurriculumItem>;
          if (!item.title || !item.week) continue;
          const duplicateKey = `${year}|${grade}|${item.lessonDate || item.week}|${item.title}|${item.unit || ""}`;
          if (existingKeys.has(duplicateKey)) continue;
          const input: CurriculumItemInput = {
            title: item.title,
            description: item.description || "",
            unit: item.unit || "",
            objectives: item.objectives || [],
            lessonDate: item.lessonDate || getApproxLessonDateFromWeek(item.week, Number(year)),
            week: item.week,
            grade: grade as CurriculumItem["grade"],
            topics: item.topics || [],
            resources: item.resources || [],
          };
          await curriculumService.addCurriculumItem(year, input, userId);
          existingKeys.add(duplicateKey);
          restoredCount += 1;
        }
      }
    }
    return restoredCount;
  },

  // Get curriculum for a year (and optionally a grade) with real-time listener
  getCurriculum: (
    year: string,
    callback: (items: CurriculumItem[]) => void,
    grade?: number
  ): (() => void) => {
    const path = grade 
      ? `curriculum/${year}/${grade}`
      : `curriculum/${year}`;
    const curriculumRef = ref(database, path);
    
    onValue(curriculumRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let items: CurriculumItem[] = [];
        
        if (grade) {
          // Single grade - data is directly items
          items = Object.keys(data).map((key) => {
            const item = data[key];
            return {
              id: key,
              grade: grade,
              topics: item?.topics || [],
              resources: item?.resources || [],
              ...item,
            };
          });
        } else {
          // All grades - data is organized by grade
          Object.keys(data).forEach((gradeKey) => {
            const gradeItems = data[gradeKey];
            if (gradeItems) {
              // Check if this is a grade number (1-6) or an old format item
              const gradeNum = parseInt(gradeKey);
              if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 6) {
                // New format: organized by grade
                Object.keys(gradeItems).forEach((itemKey) => {
                  const item = gradeItems[itemKey];
                  items.push({
                    id: itemKey,
                    grade: gradeNum as any,
                    topics: item?.topics || [],
                    resources: item?.resources || [],
                    lessonDate: item?.lessonDate,
                    ...item,
                  });
                });
              } else {
                // Old format: items directly under year (backward compatibility)
                const item = gradeItems;
                items.push({
                  id: gradeKey,
                  grade: (item?.grade || 1) as any,
                  topics: item?.topics || [],
                  resources: item?.resources || [],
                  lessonDate: item?.lessonDate,
                  ...item,
                });
              }
            }
          });
        }
        
        // Sort by grade, then week
        items.sort((a, b) => {
          if (a.grade !== b.grade) return a.grade - b.grade;
          if (a.lessonDate && b.lessonDate) {
            return a.lessonDate.localeCompare(b.lessonDate);
          }
          return a.week - b.week;
        });
        callback(items);
      } else {
        callback([]);
      }
    });

    // Return unsubscribe function
    return () => off(curriculumRef);
  },

  // Add a new curriculum item
  addCurriculumItem: async (
    year: string,
    item: CurriculumItemInput,
    userId: string
  ): Promise<string> => {
    const curriculumRef = ref(database, `curriculum/${year}/${item.grade}`);
    const newItemRef = push(curriculumRef);
    const normalizedItem = normalizeCurriculumInput(year, item);
    
    const newItem: CurriculumItem = {
      id: newItemRef.key!,
      ...normalizedItem,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userId,
    };

    await set(newItemRef, newItem);
    return newItemRef.key!;
  },

  // Update a curriculum item
  updateCurriculumItem: async (
    year: string,
    itemId: string,
    currentGrade: number,
    updates: Partial<CurriculumItemInput>
  ): Promise<void> => {
    // If grade is being changed, we need to move the item
    if (updates.grade && updates.grade !== currentGrade) {
      // Get the current item
      const currentRef = ref(database, `curriculum/${year}/${currentGrade}/${itemId}`);
      const snapshot = await get(currentRef);
      const currentData = snapshot.val();
      
      if (currentData) {
        const normalizedUpdates = normalizePartialCurriculumInput(year, { id: itemId, ...currentData }, updates);
        // Add to new grade location
        const newRef = ref(database, `curriculum/${year}/${updates.grade}/${itemId}`);
        await set(newRef, {
          ...currentData,
          ...normalizedUpdates,
          updatedAt: Date.now(),
        });
        
        // Remove from old location
        await remove(currentRef);
        return;
      }
    }
    
    // Regular update
    const itemRef = ref(database, `curriculum/${year}/${currentGrade}/${itemId}`);
    const currentSnapshot = await get(itemRef);
    const currentData = currentSnapshot.val();
    const normalizedUpdates = currentData
      ? normalizePartialCurriculumInput(year, { id: itemId, ...currentData }, updates)
      : updates;
    const updateData = {
      ...normalizedUpdates,
      updatedAt: Date.now(),
    };
    await update(itemRef, updateData);
  },

  // Delete a curriculum item
  deleteCurriculumItem: async (
    year: string,
    itemId: string,
    grade: number
  ): Promise<void> => {
    const itemRef = ref(database, `curriculum/${year}/${grade}/${itemId}`);
    await remove(itemRef);
  },

  // Bulk delete items (items must include grade info)
  bulkDelete: async (
    year: string,
    items: Array<{ id: string; grade: number }>
  ): Promise<void> => {
    const updates: Record<string, null> = {};
    items.forEach((item) => {
      updates[`curriculum/${year}/${item.grade}/${item.id}`] = null;
    });
    const rootRef = ref(database);
    await update(rootRef, updates);
  },

  // Bulk update items (items must include grade info)
  bulkUpdate: async (
    year: string,
    updates: Record<string, { grade: number; data: Partial<CurriculumItemInput> }>
  ): Promise<void> => {
    const dbUpdates: Record<string, any> = {};
    const timestamp = Date.now();
    
    Object.keys(updates).forEach((itemId) => {
      const { grade, data } = updates[itemId];
      const normalizedData = {
        ...data,
        ...(data.lessonDate
          ? { week: getWeekFromLessonDate(data.lessonDate, parseInt(year)) }
          : {}),
      };
      dbUpdates[`curriculum/${year}/${grade}/${itemId}`] = {
        ...normalizedData,
        updatedAt: timestamp,
      };
    });
    
    const rootRef = ref(database);
    await update(rootRef, dbUpdates);
  },

  // Bulk add items
  bulkAdd: async (
    year: string,
    items: CurriculumItemInput[],
    userId: string
  ): Promise<string[]> => {
    const timestamp = Date.now();
    const newIds: string[] = [];

    for (const item of items) {
      const curriculumRef = ref(database, `curriculum/${year}/${item.grade}`);
      const newItemRef = push(curriculumRef);
      const normalizedItem = normalizeCurriculumInput(year, item);
      const newItem: CurriculumItem = {
        id: newItemRef.key!,
        ...normalizedItem,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: userId,
      };
      await set(newItemRef, newItem);
      newIds.push(newItemRef.key!);
    }

    return newIds;
  },

  // Copy all curriculum items from one year to another
  copyYearToYear: async (
    sourceYear: string,
    targetYear: string,
    userId: string
  ): Promise<number> => {
    // Get all items from source year
    const sourceRef = ref(database, `curriculum/${sourceYear}`);
    const snapshot = await get(sourceRef);
    const sourceData = snapshot.val();

    if (!sourceData) {
      return 0;
    }

    let copiedCount = 0;
    const timestamp = Date.now();

    // Iterate through all grades
    for (const gradeKey of Object.keys(sourceData)) {
      const gradeNum = parseInt(gradeKey);
      if (!isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 6) {
        const gradeItems = sourceData[gradeKey];
        if (gradeItems) {
          // Copy each item in this grade
          for (const itemKey of Object.keys(gradeItems)) {
            const item = gradeItems[itemKey];
            const targetRef = ref(database, `curriculum/${targetYear}/${gradeNum}`);
            const newItemRef = push(targetRef);
            
            // Create new item with updated timestamps and new ID
            const newItem: CurriculumItem = {
              id: newItemRef.key!,
              title: item.title,
              description: item.description || "",
              unit: item.unit || "",
              objectives: item.objectives || [],
              lessonDate:
                item.lessonDate || getApproxLessonDateFromWeek(item.week, parseInt(targetYear)),
              week: getWeekFromLessonDate(
                item.lessonDate || getApproxLessonDateFromWeek(item.week, parseInt(targetYear)),
                parseInt(targetYear)
              ),
              grade: item.grade,
              topics: item.topics || [],
              resources: item.resources || [],
              createdAt: timestamp,
              updatedAt: timestamp,
              createdBy: userId,
            };

            await set(newItemRef, newItem);
            copiedCount++;
          }
        }
      }
    }

    return copiedCount;
  },

  backfillLessonDates: async (year: string): Promise<number> => {
    const yearRef = ref(database, `curriculum/${year}`);
    const snapshot = await get(yearRef);
    const data = snapshot.val();

    if (!data) {
      return 0;
    }

    const updates: Record<string, string> = {};
    let updatedCount = 0;

    Object.keys(data).forEach((gradeKey) => {
      const gradeItems = data[gradeKey];
      if (!gradeItems) return;

      Object.keys(gradeItems).forEach((itemId) => {
        const item = gradeItems[itemId];
        if (!item?.lessonDate && item?.week) {
          updates[`curriculum/${year}/${gradeKey}/${itemId}/lessonDate`] = getApproxLessonDateFromWeek(
            item.week,
            parseInt(year)
          );
          updatedCount += 1;
        }
      });
    });

    if (updatedCount > 0) {
      const rootRef = ref(database);
      await update(rootRef, updates);
    }

    return updatedCount;
  },
};
