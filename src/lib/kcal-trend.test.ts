import { describe, expect, it } from "vitest";

import { computeDailyKcal, type FeedingForTrend } from "./kcal-trend";

const now = new Date("2026-05-13T15:00:00");

function f(daysAgo: number, grams: number, cpg: number): FeedingForTrend {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(12, 0, 0, 0);
    return { fedAt: d, quantityGrams: grams, food: { caloriesPerGram: cpg } };
}

describe("computeDailyKcal", () => {
    it("returns a bucket per day in chronological order", () => {
        const out = computeDailyKcal([], 14, now);
        expect(out).toHaveLength(14);
        for (let i = 1; i < out.length; i++) {
            // Each dayLabel is later than the previous (labels are 'Apr 30', 'May 1', ...);
            // we just sanity check the keys differ.
            expect(out[i]!.dayKey).not.toBe(out[i - 1]!.dayKey);
        }
    });

    it("sums kcal into the right day", () => {
        const out = computeDailyKcal(
            [f(0, 50, 4), f(0, 25, 4), f(1, 100, 3)],
            14,
            now,
        );
        const today = out[out.length - 1]!;
        const yesterday = out[out.length - 2]!;
        expect(today.kcal).toBe(300); // 50*4 + 25*4
        expect(yesterday.kcal).toBe(300); // 100*3
    });

    it("ignores feedings outside the window", () => {
        const out = computeDailyKcal([f(30, 100, 5)], 14, now);
        const total = out.reduce((s, b) => s + b.kcal, 0);
        expect(total).toBe(0);
    });

    it("returns 0 for days with no feedings", () => {
        const out = computeDailyKcal([f(2, 50, 4)], 5, now);
        expect(out).toHaveLength(5);
        expect(out.filter((b) => b.kcal > 0)).toHaveLength(1);
    });
});
