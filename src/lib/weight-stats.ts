export type WeightReading = {
    id: number;
    weight: number;
    weighedAt: Date;
};

export type WeightStats = {
    latest: number;
    delta7: number | null;
    delta30: number | null;
    daysToGoal: number | null;
    goalDate: Date | null;
};

/**
 * Pure stats calculation from a list of weight readings.
 * Returns null when there are zero readings. `now` is injectable for tests.
 */
export function computeWeightStats(
    rows: ReadonlyArray<WeightReading>,
    goalWeight: number | null,
    now: number = Date.now(),
): WeightStats | null {
    if (rows.length === 0) return null;

    const sorted = [...rows].sort(
        (a, b) => a.weighedAt.getTime() - b.weighedAt.getTime(),
    );
    const latest = sorted[sorted.length - 1]!;

    if (sorted.length === 1) {
        return {
            latest: latest.weight,
            delta7: null,
            delta30: null,
            daysToGoal: null,
            goalDate: null,
        };
    }

    const findClosestBefore = (cutoffMs: number): WeightReading =>
        [...sorted]
            .reverse()
            .find((r) => r.weighedAt.getTime() <= cutoffMs) ?? sorted[0]!;

    const ref7 = findClosestBefore(now - 7 * 86_400_000);
    const ref30 = findClosestBefore(now - 30 * 86_400_000);
    const delta7 = ref7.id === latest.id ? null : latest.weight - ref7.weight;
    const delta30 =
        ref30.id === latest.id ? null : latest.weight - ref30.weight;

    let daysToGoal: number | null = null;
    let goalDate: Date | null = null;
    if (goalWeight !== null) {
        const cutoff = now - 30 * 86_400_000;
        const recent = sorted.filter((r) => r.weighedAt.getTime() >= cutoff);
        const span = recent.length >= 2 ? recent : sorted;
        if (span.length >= 2) {
            const first = span[0]!;
            const last = span[span.length - 1]!;
            const dwDays =
                (last.weighedAt.getTime() - first.weighedAt.getTime()) /
                86_400_000;
            if (dwDays > 0) {
                const slope = (last.weight - first.weight) / dwDays;
                const remaining = goalWeight - latest.weight;
                if (Math.sign(remaining) === Math.sign(slope) && slope !== 0) {
                    const days = remaining / slope;
                    daysToGoal = Math.round(days);
                    goalDate = new Date(now + days * 86_400_000);
                } else if (Math.abs(remaining) < 0.01) {
                    daysToGoal = 0;
                    goalDate = new Date(now);
                } else {
                    daysToGoal = -1;
                }
            }
        }
    }

    return { latest: latest.weight, delta7, delta30, daysToGoal, goalDate };
}
