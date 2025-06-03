import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Capitalize first letter of English words for frontend display
export function capitalizeEnglish(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Capitalize multiple words (for arrays)
export function capitalizeEnglishArray(items: string[]): string[] {
  return items.map(item => capitalizeEnglish(item));
}
