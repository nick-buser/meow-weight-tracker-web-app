export type FeedingForStreak = { fedAt: Date };

/**
 * Returns the count of consecutive days ending today (inclusive) with at
 * least one feeding. If today has no feeding yet, the streak instead
 * ends at yesterday (so the streak doesn't reset just because the cat
 * hasn't been fed yet this morning). Returns 0 if neither today nor
 * yesterday has a feeding.
 */
export function computeFeedingStreak(
    feedings: ReadonlyArray<FeedingForStreak>,
    now: Date = new Date(),
): number {
    if (feedings.length === 0) return 0;

    const fedDays = new Set<string>();
    for (const f of feedings) {
        const d = f.fedAt;
        fedDays.add(
            `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        );
    }

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

    let cursor: Date;
    if (fedDays.has(todayKey)) {
        cursor = today;
    } else if (fedDays.has(yesterdayKey)) {
        cursor = yesterday;
    } else {
        return 0;
    }

    let streak = 0;
    while (true) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
        if (!fedDays.has(key)) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}
