import { format, startOfYear, addWeeks, getMonth, getYear, addDays, getDay } from "date-fns";

/**
 * Get the first Monday of April (school year start)
 * @param year Year (e.g., 2025)
 * @returns Date object for the first Monday of April
 */
function getFirstMondayOfApril(year: number): Date {
  const aprilStart = new Date(year, 3, 1); // April 1st
  const dayOfWeek = aprilStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days to add to get to Monday
  // If Sunday (0), add 1 day; if Monday (1), add 0; if Tuesday (2), add 6, etc.
  const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
  
  return addDays(aprilStart, daysToAdd);
}

/**
 * Get the month (0-11, where 0 = January) for a given week number in a school year
 * School year runs from April (month 3) to March (month 2 of next year)
 * Week 1 = April, Week 52 = March of next year
 * Only counts weekdays (Monday-Friday), excluding weekends
 * @param weekNumber Week number (1-52)
 * @param year Year (e.g., 2025) - represents the starting year of the school year (April)
 * @returns Month number (0-11)
 */
export function getMonthFromWeek(weekNumber: number, year: number): number {
  // School year starts on the first Monday of April
  const firstMonday = getFirstMondayOfApril(year);
  
  // Each school week is 5 weekdays (Monday-Friday)
  // Calculate the date for the middle of the week (Wednesday, day 3 of the week)
  const weekdaysIntoYear = (weekNumber - 1) * 5; // Total weekdays up to start of this week
  const middleOfWeek = weekdaysIntoYear + 3; // Wednesday (day 3 of the 5-day week)
  
  // Calculate the target date by adding weekdays only
  let currentDate = new Date(firstMonday);
  let weekdaysAdded = 0;
  
  while (weekdaysAdded < middleOfWeek) {
    currentDate = addDays(currentDate, 1);
    const dayOfWeek = getDay(currentDate);
    // Only count weekdays (Monday=1 to Friday=5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weekdaysAdded++;
    }
  }
  
  let monthIndex = getMonth(currentDate);
  let monthYear = getYear(currentDate);
  
  // If we're in the next calendar year but before April, it's part of the school year
  // Map January (0), February (1), March (2) to the school year months
  if (monthYear > year && monthIndex < 3) {
    // These are months 10, 11, 12 of the school year (Jan, Feb, Mar of next year)
    return monthIndex; // 0, 1, or 2
  }
  
  // For April (3) through December (11) of the starting year
  return monthIndex;
}

/**
 * Get the month name for a given week number in a year
 * @param weekNumber Week number (1-52)
 * @param year Year (e.g., 2025)
 * @returns Month name (e.g., "January", "February")
 */
export function getMonthNameFromWeek(weekNumber: number, year: number): string {
  const month = getMonthFromWeek(weekNumber, year);
  return format(new Date(year, month, 1), "MMMM");
}

/**
 * Get the month abbreviation for a given week number in a year
 * @param weekNumber Week number (1-52)
 * @param year Year (e.g., 2025)
 * @returns Month abbreviation (e.g., "Jan", "Feb")
 */
export function getMonthAbbrFromWeek(weekNumber: number, year: number): string {
  const month = getMonthFromWeek(weekNumber, year);
  return format(new Date(year, month, 1), "MMM");
}

/**
 * Get all months in order for a school year (April to March)
 * @param year The year (will use April of this year to March of next year)
 * @returns Array of month objects with name, abbreviation, and index
 */
export function getSchoolYearMonths(year: number): Array<{
  name: string;
  abbr: string;
  monthIndex: number;
  year: number;
}> {
  const months = [];
  // School year runs from April (month 3) to March (month 2 of next year)
  for (let i = 0; i < 12; i++) {
    const monthIndex = (3 + i) % 12; // Start from April (3)
    const monthYear = monthIndex < 3 ? year + 1 : year; // January-March are next year
    months.push({
      name: format(new Date(monthYear, monthIndex, 1), "MMMM"),
      abbr: format(new Date(monthYear, monthIndex, 1), "MMM"),
      monthIndex,
      year: monthYear,
    });
  }
  return months;
}

/**
 * Get the week range for a given month in a year
 * @param monthIndex Month index (0-11)
 * @param year Year
 * @returns Array of week numbers that fall in this month
 */
export function getWeeksForMonth(monthIndex: number, year: number): number[] {
  const weeks: number[] = [];
  const yearStart = startOfYear(new Date(year, 0, 1));
  
  // Check all 52 weeks
  for (let week = 1; week <= 52; week++) {
    const weekDate = addWeeks(yearStart, week - 1);
    if (getMonth(weekDate) === monthIndex && getYear(weekDate) === year) {
      weeks.push(week);
    }
  }
  
  // Also check weeks that might fall in this month but are in the next year
  // (for months like January-March in a school year context)
  if (monthIndex < 3) {
    const nextYearStart = startOfYear(new Date(year + 1, 0, 1));
    for (let week = 1; week <= 52; week++) {
      const weekDate = addWeeks(nextYearStart, week - 1);
      if (getMonth(weekDate) === monthIndex && getYear(weekDate) === year + 1) {
        // This week belongs to the next calendar year but same school year
        // We'll map it to week 52 + offset for display purposes
        weeks.push(week);
      }
    }
  }
  
  return weeks.sort((a, b) => a - b);
}

