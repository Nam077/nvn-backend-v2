/**
 * UUID Utilities
 */

import crypto from 'crypto';
import { replace, toLower } from 'lodash';
/**
 * Convert UUID string without dashes back to standard UUID v4 format
 * @param uuidString - UUID string without dashes (32 hex characters)
 * @returns Standard UUID v4 format with dashes
 *
 * @example
 * parseUuidFromString('63f6c57ce394450d9d03e76c9fca5e30')
 * // Returns: '63f6c57c-e394-450d-9d03-e76c9fca5e30'
 */
export const parseUuidFromString = (uuidString: string): string | null => {
    // Remove any existing dashes and whitespace
    const cleanString = toLower(replace(uuidString, /[-\s]/g, ''));

    // Validate: must be exactly 32 hex characters
    if (!/^[0-9a-f]{32}$/.test(cleanString)) {
        return null;
    }

    // Insert dashes at proper positions: 8-4-4-4-12
    return [
        cleanString.slice(0, 8),
        cleanString.slice(8, 12),
        cleanString.slice(12, 16),
        cleanString.slice(16, 20),
        cleanString.slice(20, 32),
    ].join('-');
};

/**
 * Validate if a string is a valid UUID v4 format
 * @param uuid - UUID string to validate
 * @returns True if valid UUID v4 format
 */
export const isValidUuid = (uuid: string): boolean => {
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(uuid);
};

/**
 * Remove dashes from UUID to get compact format
 * @param uuid - Standard UUID with dashes
 * @returns UUID without dashes
 *
 * @example
 * compactUuid('63f6c57c-e394-450d-9d03-e76c9fca5e30')
 * // Returns: '63f6c57ce394450d9d03e76c9fca5e30'
 */
export const compactUuid = (uuid: string): string | null => {
    if (!isValidUuid(uuid)) {
        return null;
    }

    return replace(uuid, /-/g, '');
};

/**
 * Auto-detect and normalize UUID format
 * @param input - UUID in any format (with or without dashes)
 * @returns Standard UUID v4 format with dashes
 */
export const normalizeUuid = (input: string): string | null => {
    // Try to parse as compact UUID first
    if (input.length === 32 && !/[-]/.test(input)) {
        return parseUuidFromString(input);
    }

    // Check if already valid UUID
    if (isValidUuid(input)) {
        return toLower(input);
    }

    return null;
};

/**
 * Generate a new UUID v4 without dashes
 * @returns Compact UUID string (32 hex characters)
 *
 * @example
 * generateCompactUuid()
 * // Returns: '63f6c57ce394450d9d03e76c9fca5e30'
 */
export const generateCompactUuid = (): string => replace(crypto.randomUUID(), /-/g, '');

/**
 * Generate a new UUID v4 with standard format
 * @returns Standard UUID string with dashes
 *
 * @example
 * generateUuid()
 * // Returns: '63f6c57c-e394-450d-9d03-e76c9fca5e30'
 */
export const generateUuid = (): string => crypto.randomUUID();
