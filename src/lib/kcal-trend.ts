export type FeedingForTrend = {
    fedAt: Date;
    quantityGrams: number;
    food: { caloriesPerGram: number };
};

export type DailyKcal = {
    dayKey: string;
    dayLabel: string;
    kcal: number;
};

/**
 * Returns one entry per day for the last `days` days ending today
 * (inclusive), in chronological order. Days with no feedings get kcal=0.
 */
export function computeDailyKcal(
    feedings: ReadonlyArray<FeedingForTrend>,
    days: number,
    now: Date = new Date(),
): DailyKcal[] {
    const buckets: DailyKcal[] = [];
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const bucketByKey = new Map<string, DailyKcal>();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const dayLabel = d.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        });
        const bucket: DailyKcal = { dayKey, dayLabel, kcal: 0 };
        buckets.push(bucket);
        bucketByKey.set(dayKey, bucket);
    }

    for (const row of feedings) {
        const d = row.fedAt;
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const bucket = bucketByKey.get(dayKey);
        if (!bucket) continue;
        bucket.kcal += row.quantityGrams * row.food.caloriesPerGram;
    }
    return buckets;
}
