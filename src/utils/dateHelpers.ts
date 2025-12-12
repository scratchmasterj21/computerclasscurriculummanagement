import { format, startOfYear, addWeeks, getMonth, getYear, addDays, getDay } from "date-fns";

/**
 * Get the first Monday of April (school year start)
 * @param year Year (e.g., 2025)
 * @returns Date object for the first Monday of April
 */
export function getFirstMondayOfApril(year: number): Date {
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
 * Uses standard calendar weeks (7 days including weekends)
 * @param weekNumber Week number (1-52)
 * @param year Year (e.g., 2025) - represents the starting year of the school year (April)
 * @returns Month number (0-11)
 */
export function getMonthFromWeek(weekNumber: number, year: number): number {
  // School year starts on the first Monday of April
  const firstMonday = getFirstMondayOfApril(year);
  
  // Each week is 7 days (standard calendar week)
  // Calculate the date for the middle of the week (day 4 = Thursday)
  const daysIntoYear = (weekNumber - 1) * 7; // Total days up to start of this week
  const middleOfWeek = daysIntoYear + 4; // Thursday (day 4 of the 7-day week)
  
  // Calculate the target date
  const targetDate = addDays(firstMonday, middleOfWeek);
  
  let monthIndex = getMonth(targetDate);
  let monthYear = getYear(targetDate);
  
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

/**
 * Get a week number for the middle of a given month
 * @param monthIndex Month index (0-11)
 * @param year Year (school year start)
 * @returns Week number (1-52)
 */
export function getWeekForMonth(monthIndex: number, year: number): number {
  // Use the middle of the month to determine the week
  const monthDate = new Date(year, monthIndex, 15); // 15th of the month
  const firstMonday = getFirstMondayOfApril(year);
  
  // Calculate days difference
  const daysDiff = Math.floor((monthDate.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24));
  
  // Convert to week number (7 days per week)
  const weekNumber = Math.floor(daysDiff / 7) + 1;
  
  return Math.max(1, Math.min(52, weekNumber));
}

/**
 * Get the first week number that falls in a given month
 * @param monthIndex Month index (0-11)
 * @param year Year (school year start)
 * @returns Week number (1-52)
 */
export function getFirstWeekForMonth(monthIndex: number, year: number): number {
  // Check all weeks to find the first one in this month
  for (let week = 1; week <= 52; week++) {
    if (getMonthFromWeek(week, year) === monthIndex) {
      return week;
    }
  }
  // Fallback to middle of month
  return getWeekForMonth(monthIndex, year);
}

/**
 * Get the last week number that falls in a given month
 * @param monthIndex Month index (0-11)
 * @param year Year (school year start)
 * @returns Week number (1-52)
 */
export function getLastWeekForMonth(monthIndex: number, year: number): number {
  // Check all weeks to find the last one in this month
  for (let week = 52; week >= 1; week--) {
    if (getMonthFromWeek(week, year) === monthIndex) {
      return week;
    }
  }
  // Fallback to middle of month
  return getWeekForMonth(monthIndex, year);
}

