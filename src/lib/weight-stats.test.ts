import { describe, expect, it } from "vitest";

import { computeWeightStats, type WeightReading } from "./weight-stats";

const day = 86_400_000;
const now = new Date("2026-05-13T12:00:00Z").getTime();

function r(
    id: number,
    weight: number,
    daysAgo: number,
): WeightReading {
    return { id, weight, weighedAt: new Date(now - daysAgo * day) };
}

describe("computeWeightStats", () => {
    it("returns null when there are no readings", () => {
        expect(computeWeightStats([], null, now)).toBeNull();
    });

    it("returns latest only with nulls when there is one reading", () => {
        const out = computeWeightStats([r(1, 5, 0)], 4, now);
        expect(out).toEqual({
            latest: 5,
            delta7: null,
            delta30: null,
            daysToGoal: null,
            goalDate: null,
        });
    });

    it("computes deltas vs the closest reading before each cutoff", () => {
        const out = computeWeightStats(
            [r(1, 5.0, 60), r(2, 5.4, 30), r(3, 5.2, 10), r(4, 5.0, 0)],
            null,
            now,
        );
        expect(out).not.toBeNull();
        // 7d delta: now(5.0) - ref(<=7d ago closest is 10d 5.2) = -0.2
        expect(out!.delta7).toBeCloseTo(-0.2, 5);
        // 30d delta: now(5.0) - 30d-ago(5.4) = -0.4
        expect(out!.delta30).toBeCloseTo(-0.4, 5);
        expect(out!.latest).toBeCloseTo(5.0, 5);
        expect(out!.daysToGoal).toBeNull();
    });

    it("projects days to goal along the observed trend", () => {
        // 30 days of linear loss: 6.0 -> 5.4 over 30d, so slope -0.02/day.
        const rows = [r(1, 6.0, 30), r(2, 5.4, 0)];
        const out = computeWeightStats(rows, 5.0, now);
        expect(out).not.toBeNull();
        // remaining = -0.4, slope = -0.02 => 20 days.
        expect(out!.daysToGoal).toBe(20);
        expect(out!.goalDate).toBeInstanceOf(Date);
    });

    it("marks unreachable when trend moves away from the goal", () => {
        const rows = [r(1, 5.0, 30), r(2, 5.4, 0)]; // gaining
        const out = computeWeightStats(rows, 4.5, now); // want to lose
        expect(out!.daysToGoal).toBe(-1);
    });

    it("returns 0 days when already at goal", () => {
        const rows = [r(1, 5.0, 30), r(2, 5.0, 0)];
        const out = computeWeightStats(rows, 5.0, now);
        expect(out!.daysToGoal).toBe(0);
    });
});
