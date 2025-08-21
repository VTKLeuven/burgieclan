/**
 * Central configuration for cookie and storage key names
 * All keys are prefixed with BUR (burgieclan) for project identification
 */

const isDev = process.env.NODE_ENV === 'development';

// Cookie names with environment-specific prefixes
export const COOKIE_NAMES = {
    JWT: isDev ? 'BUR_DEV_jwt' : 'BUR_jwt',
    REFRESH_TOKEN: isDev ? 'BUR_DEV_refresh_token' : 'BUR_refresh_token',
} as const;

// LocalStorage keys with environment-specific prefixes
export const STORAGE_KEYS = {
    COOKIE_CONSENT: isDev ? 'BUR_DEV_cookie_consent' : 'BUR_cookie_consent',
} as const;

// SessionStorage keys (if needed in the future)
export const SESSION_KEYS = {
    // Add session storage keys here if needed
} as const;

// Type exports for better type safety
export type CookieName = typeof COOKIE_NAMES[keyof typeof COOKIE_NAMES];
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
export type SessionKey = typeof SESSION_KEYS[keyof typeof SESSION_KEYS];
