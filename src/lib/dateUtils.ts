/**
 * Date utilities - Egypt timezone (Africa/Cairo) with 12-hour format
 */

const EGYPT_TIMEZONE = 'Africa/Cairo';

export function formatDateEgypt(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ar-EG', {
    timeZone: EGYPT_TIMEZONE,
    hour12: true,
    ...options,
  });
}

export function formatDateShort(date: string | Date): string {
  return formatDateEgypt(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(date: string | Date): string {
  return formatDateEgypt(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTime(date: string | Date): string {
  return formatDateEgypt(date, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
