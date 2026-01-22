import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const INVARIANT_UNITS = new Set(['kg', 'lt', 'g', 'ml', 'l'])

/**
 * Returns the unit in plural form when cantidad > 1.
 * Invariant units (kg, lt, g, ml, l) are never pluralized.
 * Spanish rules: vowel → +s, z → -z+ces, other consonant → +es.
 */
export function pluralizeUnit(unidad: string, cantidad: number): string {
  if (cantidad <= 1) return unidad
  const normalized = unidad.trim().toLowerCase()
  if (INVARIANT_UNITS.has(normalized)) return unidad
  const last = unidad.slice(-1).toLowerCase()
  if (/[aeiouáéíóúüy]/.test(last)) return unidad + 's'
  if (last === 'z') return unidad.slice(0, -1) + 'ces'
  return unidad + 'es'
}

/**
 * Normalizes a string by removing accents/tildes for case-insensitive, accent-insensitive search.
 * Example: "café" -> "cafe", "José" -> "jose"
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
