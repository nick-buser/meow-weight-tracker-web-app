export type WeightUnit = "kg" | "lb";

const LB_PER_KG = 2.2046226218;

export function kgToLb(kg: number): number {
    return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
    return lb / LB_PER_KG;
}

/**
 * Convert a canonical kg value into the chosen display unit. Conversion is
 * purely multiplicative, so this is also correct for deltas (e.g. a +0.5kg
 * change becomes a +1.1lb change).
 */
export function fromKg(kg: number, unit: WeightUnit): number {
    return unit === "lb" ? kgToLb(kg) : kg;
}

/** Convert a value entered in the chosen unit back to canonical kg. */
export function toKg(value: number, unit: WeightUnit): number {
    return unit === "lb" ? lbToKg(value) : value;
}

/**
 * Format a canonical kg value for display, e.g. "4.50 kg" / "9.92 lb".
 * Pass withUnit: false for just the number.
 */
export function formatWeight(
    kg: number,
    unit: WeightUnit,
    opts: { digits?: number; withUnit?: boolean } = {},
): string {
    const { digits = 2, withUnit = true } = opts;
    const value = fromKg(kg, unit).toFixed(digits);
    return withUnit ? `${value} ${unit}` : value;
}
