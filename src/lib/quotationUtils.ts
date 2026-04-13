/**
 * Utility to parse container quantities and format unit strings.
 * e.g., "3*40HC" -> 3, "1x20ft" -> 1, "40HC" -> 1
 */
export function parseUnitQuantity(unitStr: string): number {
  if (!unitStr) return 1;
  
  // Look for patterns like [Number]* or [Number]x at the start
  const match = unitStr.match(/^(\d+)(?:\s*[x*])/i);
  if (match && match[1]) {
    return parseInt(match[1], 10) || 1;
  }
  
  return 1;
}

/**
 * Calculates the multiplier ratio between two unit strings.
 * e.g., base="1*40", target="6*40" -> 6
 */
export function calculateMultiplier(baseUnit: string, targetUnit: string): number {
  const baseQty = parseUnitQuantity(baseUnit);
  const targetQty = parseUnitQuantity(targetUnit);
  
  if (baseQty === 0) return 0;
  return targetQty / baseQty;
}

/**
 * Helper to clean currency strings or numbers for calculation
 */
export function cleanAmount(val: any): number {
  if (val === undefined || val === null || val === "" || val === "-" || val === "—") return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}
