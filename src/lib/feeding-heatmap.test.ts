import { describe, expect, it } from "vitest";

import { computeFeedingHeatmap } from "./feeding-heatmap";

const now = new Date("2026-05-14T15:00:00Z");
const at = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(12, 0, 0, 0);
    return { fedAt: d };
};

describe("computeFeedingHeatmap", () => {
    it("returns full weeks of 7 cells", () => {
        const { cells } = computeFeedingHeatmap([], 30, now);
        for (const week of cells) {
            expect(week).toHaveLength(7);
        }
    });

    it("totals match input within the window", () => {
        const { total } = computeFeedingHeatmap(
            [at(0), at(0), at(2), at(500)],
            30,
            now,
        );
        expect(total).toBe(3); // 500d ago is outside the 30d window
    });

    it("level 0 for zero days, >0 for active days", () => {
        const { cells } = computeFeedingHeatmap([at(0)], 7, now);
        const flat = cells.flat();
        expect(flat.filter((c) => c.count > 0)).toHaveLength(1);
        expect(flat.filter((c) => c.level === 0).length).toBeGreaterThan(0);
        expect(flat.find((c) => c.count > 0)!.level).toBeGreaterThan(0);
    });

    it("scales levels relative to busiest day", () => {
        const feedings = [
            at(0),
            at(0),
            at(0),
            at(0), // busiest = 4
            at(1), // 25% -> 1
            at(2),
            at(2), // 50% -> 3
        ];
        const { cells, busiest } = computeFeedingHeatmap(feedings, 7, now);
        expect(busiest).toBe(4);
        const flat = cells.flat();
        const today = flat.find((c) => c.count === 4)!;
        const yest = flat.find((c) => c.count === 1)!;
        const twoAgo = flat.find((c) => c.count === 2)!;
        expect(today.level).toBe(4);
        // 1/4 = 0.25 → at the 25% boundary, bucket 2.
        expect(yest.level).toBe(2);
        // 2/4 = 0.5 → at the 50% boundary, bucket 3.
        expect(twoAgo.level).toBe(3);
    });
});
