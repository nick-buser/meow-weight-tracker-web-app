export type FeedingForBreakdown = {
    fedAt: Date;
    quantityGrams: number;
    food: { id: number; name: string; brand: string | null; caloriesPerGram: number };
};

export type FoodSeries = {
    foodId: number;
    label: string;
};

export type BreakdownDay = {
    dayKey: string;
    dayLabel: string;
} & Record<string, number | string>;

/**
 * Returns one entry per day for the last `days` ending today (inclusive),
 * where each entry has the day label and one `food_<id>` key per food
 * appearing in the window. Also returns the foods that contributed, in
 * descending total order, so callers can render the bar series in the
 * right order.
 */
export function computeFoodBreakdown(
    feedings: ReadonlyArray<FeedingForBreakdown>,
    days: number,
    now: Date = new Date(),
): { series: FoodSeries[]; data: BreakdownDay[] } {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const buckets: BreakdownDay[] = [];
    const byKey = new Map<string, BreakdownDay>();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const dayLabel = d.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        });
        const bucket: BreakdownDay = { dayKey, dayLabel };
        buckets.push(bucket);
        byKey.set(dayKey, bucket);
    }

    const totals = new Map<number, { label: string; total: number }>();
    for (const row of feedings) {
        const d = row.fedAt;
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const bucket = byKey.get(dayKey);
        if (!bucket) continue;
        const kcal = row.quantityGrams * row.food.caloriesPerGram;
        const key = `food_${row.food.id}`;
        bucket[key] = ((bucket[key] as number | undefined) ?? 0) + kcal;
        const existing = totals.get(row.food.id);
        const label = row.food.brand
            ? `${row.food.brand} — ${row.food.name}`
            : row.food.name;
        if (existing) {
            existing.total += kcal;
        } else {
            totals.set(row.food.id, { label, total: kcal });
        }
    }

    const series = [...totals.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .map(([foodId, { label }]) => ({ foodId, label }));
    return { series, data: buckets };
}
