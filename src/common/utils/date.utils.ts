import { addSeconds, addDays, parseISO, isAfter, isBefore, differenceInSeconds, differenceInDays } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

const UTC_TIMEZONE = 'UTC';

/**
 * Date utilities with UTC timezone support
 */
export const DateUtils = {
    /**
     * Get current UTC date
     * @returns Current date normalized to UTC
     */
    nowUtc(): Date {
        // Get current local time and convert it to UTC explicitly
        const now = new Date();
        return fromZonedTime(now, Intl.DateTimeFormat().resolvedOptions().timeZone);
    },

    /**
     * Get current UTC timestamp in milliseconds
     * @returns UTC timestamp
     */
    timestampUtc(): number {
        return Date.now();
    },

    /**
     * Parse various date inputs to UTC Date
     * @param dateInput - Date input (string, Date, or number)
     * @returns Parsed date in UTC
     */
    parseToUtc(dateInput: string | Date | number): Date {
        if (dateInput instanceof Date) {
            return dateInput;
        }
        if (typeof dateInput === 'number') {
            return new Date(dateInput);
        }
        if (typeof dateInput === 'string') {
            return parseISO(dateInput);
        }
        throw new Error('Invalid date input type');
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
     * Check if a key needs rotation based on creation date and rotation threshold
     * @param createdAt - Key creation date
     * @param rotationDays - Days after which rotation is needed
     * @returns True if key needs rotation
     */
    needsRotation(createdAt: Date, rotationDays: number): boolean {
        const rotationThreshold = this.subtractDaysUtc(this.nowUtc(), rotationDays);
        return this.isBeforeUtc(createdAt, rotationThreshold);
    },

    /**
     * Check if a key is expired based on creation date and expiration period
     * @param createdAt - Key creation date
     * @param expirationDays - Days after which key expires
     * @returns True if key is expired
     */
    isExpired(createdAt: Date, expirationDays: number): boolean {
        const expirationDate = this.addDaysUtc(createdAt, expirationDays);
        return this.isAfterUtc(this.nowUtc(), expirationDate);
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
