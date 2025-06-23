import { addSeconds, addDays, parseISO, isAfter, isBefore, differenceInSeconds, differenceInDays } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const UTC_TIMEZONE = 'UTC';

/**
 * Date utilities with UTC timezone support
 */
export const DateUtils = {
    /**
     * Get current UTC date
     * @returns Current date in UTC
     */
    nowUtc(): Date {
        return new Date(); // new Date() already returns UTC timestamp
    },

    /**
     * Get current UTC timestamp in milliseconds
     * @returns UTC timestamp
     */
    timestampUtc(): number {
        return Date.now();
    },

    /**
     * Add seconds to a date in UTC
     * @param date - Base date
     * @param seconds - Seconds to add
     * @returns New date with added seconds
     */
    addSecondsUtc(date: Date, seconds: number): Date {
        return addSeconds(date, seconds);
    },

    /**
     * Add days to a date in UTC
     * @param date - Base date
     * @param days - Days to add
     * @returns New date with added days
     */
    addDaysUtc(date: Date, days: number): Date {
        return addDays(date, days);
    },

    /**
     * Subtract days from a date in UTC
     * @param date - Base date
     * @param days - Days to subtract
     * @returns New date with subtracted days
     */
    subtractDaysUtc(date: Date, days: number): Date {
        return addDays(date, -days);
    },

    /**
     * Get difference in days between two dates
     * @param laterDate - Later date
     * @param earlierDate - Earlier date
     * @returns Difference in days
     */
    daysDiffUtc(laterDate: Date, earlierDate: Date): number {
        return differenceInDays(laterDate, earlierDate);
    },

    /**
     * Format date as ISO string in UTC
     * @param date - Date to format
     * @returns ISO string in UTC
     */
    formatUtcIso(date: Date): string {
        return formatInTimeZone(date, UTC_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    },

    /**
     * Parse ISO string to UTC date
     * @param isoString - ISO string to parse
     * @returns Parsed date in UTC
     */
    parseUtcIso(isoString: string): Date {
        return parseISO(isoString);
    },

    /**
     * Check if date is after another date (UTC comparison)
     * @param date - Date to check
     * @param dateToCompare - Date to compare against
     * @returns True if date is after dateToCompare
     */
    isAfterUtc(date: Date, dateToCompare: Date): boolean {
        return isAfter(date, dateToCompare);
    },

    /**
     * Check if date is before another date (UTC comparison)
     * @param date - Date to check
     * @param dateToCompare - Date to compare against
     * @returns True if date is before dateToCompare
     */
    isBeforeUtc(date: Date, dateToCompare: Date): boolean {
        return isBefore(date, dateToCompare);
    },

    /**
     * Check if current UTC time is after given date
     * @param date - Date to check against
     * @returns True if current time is after the given date
     */
    isExpiredUtc(date: Date): boolean {
        return isAfter(this.nowUtc(), date);
    },

    /**
     * Get difference in seconds between two dates
     * @param laterDate - Later date
     * @param earlierDate - Earlier date
     * @returns Difference in seconds
     */
    diffInSecondsUtc(laterDate: Date, earlierDate: Date): number {
        return differenceInSeconds(laterDate, earlierDate);
    },

    /**
     * Create expiry date from current time + seconds
     * @param seconds - Seconds to add to current time
     * @returns Expiry date in UTC
     */
    createExpiryUtc(seconds: number): Date {
        return this.addSecondsUtc(this.nowUtc(), seconds);
    },

    /**
     * Convert UTC date to specific timezone
     * @param utcDate - UTC date
     * @param toTimezone - Target timezone
     * @returns Date in target timezone
     */
    fromUtc(utcDate: Date, toTimezone: string): Date {
        return toZonedTime(utcDate, toTimezone);
    },

    /**
     * Format date for logging/debugging
     * @param date - Date to format
     * @returns Formatted string for logging
     */
    formatForLog(date: Date): string {
        return formatInTimeZone(date, UTC_TIMEZONE, 'yyyy-MM-dd HH:mm:ss.SSS UTC');
    },
} as const;
