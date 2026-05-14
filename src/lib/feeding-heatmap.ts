export type FeedingForHeatmap = { fedAt: Date };

export type HeatmapCell = {
    date: Date;
    dayKey: string;
    count: number;
    /** 0-4 intensity bucket; 0 = no feedings */
    level: 0 | 1 | 2 | 3 | 4;
};

/**
 * Build a fixed-size heatmap grid for the last `days` days, ending today.
 * Output is one column per ISO week (Mon..Sun rows), oldest column first.
 * `level` buckets the count into 5 intensities (0..4) so the UI can pick a
 * fixed palette.
 */
export function computeFeedingHeatmap(
    feedings: ReadonlyArray<FeedingForHeatmap>,
    days = 365,
    now: Date = new Date(),
): { cells: HeatmapCell[][]; total: number; busiest: number } {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    // Walk back to the Monday on or before `start` so columns are full weeks.
    const startDay = (start.getDay() + 6) % 7; // 0 = Mon ... 6 = Sun
    start.setDate(start.getDate() - startDay);

    const cutoffStart = start.getTime();
    const cutoffEnd = today.getTime() + 24 * 60 * 60 * 1000;

    const counts = new Map<string, number>();
    let total = 0;
    for (const row of feedings) {
        const t = row.fedAt.getTime();
        if (t < cutoffStart || t >= cutoffEnd) continue;
        const d = row.fedAt;
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        total += 1;
    }
    const busiest = counts.size === 0 ? 0 : Math.max(...counts.values());

    const cells: HeatmapCell[][] = [];
    const cursor = new Date(start);
    while (cursor.getTime() <= today.getTime()) {
        const week: HeatmapCell[] = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(cursor);
            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            const count = counts.get(key) ?? 0;
            week.push({
                date,
                dayKey: key,
                count,
                level: bucket(count, busiest),
            });
            cursor.setDate(cursor.getDate() + 1);
        }
        cells.push(week);
    }
    return { cells, total, busiest };
}

function bucket(count: number, busiest: number): 0 | 1 | 2 | 3 | 4 {
    if (count === 0) return 0;
    if (busiest <= 1) return 1;
    const ratio = count / busiest;
    if (ratio >= 0.75) return 4;
    if (ratio >= 0.5) return 3;
    if (ratio >= 0.25) return 2;
    return 1;
}
