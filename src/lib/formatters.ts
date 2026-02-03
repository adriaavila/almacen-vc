/**
 * Cached formatters for better performance.
 * Using Intl.DateTimeFormat instances avoids object creation on every render.
 */

// Cached date formatter for Spanish locale
const dateFormatter = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const numberFormatter = new Intl.NumberFormat('es-ES');

const currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
});

/**
 * Format a timestamp to a date string (DD/MM/YYYY)
 */
export const formatDate = (timestamp: number): string => {
    return dateFormatter.format(new Date(timestamp));
};

/**
 * Format a timestamp to a date-time string (DD/MM/YYYY HH:mm)
 */
export const formatDateTime = (timestamp: number): string => {
    return dateTimeFormatter.format(new Date(timestamp));
};

/**
 * Format a number with thousand separators
 */
export const formatNumber = (value: number): string => {
    return numberFormatter.format(value);
};

/**
 * Format a number as currency
 */
export const formatCurrency = (value: number): string => {
    return currencyFormatter.format(value);
};
