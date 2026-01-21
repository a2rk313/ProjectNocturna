import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert Bortle class to human-readable description
export function bortleClassDescription(bortle: number): string {
  const descriptions: Record<number, string> = {
    1: 'Excellent dark sky site',
    2: 'Typical truly dark site',
    3: 'Rural sky',
    4: 'Rural/suburban transition',
    5: 'Suburban sky',
    6: 'Bright suburban sky',
    7: 'Suburban/urban transition',
    8: 'City sky',
    9: 'Inner-city sky',
  };
  return descriptions[bortle] || 'Unknown';
}

// Format radiance value for display
export function formatRadiance(nw: number): string {
  if (nw < 1) return `${nw.toFixed(3)} nW/cm²/sr`;
  if (nw < 1000) return `${nw.toFixed(1)} nW/cm²/sr`;
  return `${(nw / 1000).toFixed(2)} µW/cm²/sr`;
}
