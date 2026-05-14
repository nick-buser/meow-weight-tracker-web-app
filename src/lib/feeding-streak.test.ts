import { describe, expect, it } from "vitest";

import { computeFeedingStreak } from "./feeding-streak";

const now = new Date("2026-05-14T15:00:00Z");
const dayAt = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(12, 0, 0, 0);
    return d;
};

describe("computeFeedingStreak", () => {
    it("returns 0 with no feedings", () => {
        expect(computeFeedingStreak([], now)).toBe(0);
    });

    it("returns 0 when nothing fed today or yesterday", () => {
        expect(
            computeFeedingStreak([{ fedAt: dayAt(3) }], now),
        ).toBe(0);
    });

    it("counts a 1-day streak when fed only today", () => {
        expect(
            computeFeedingStreak([{ fedAt: dayAt(0) }], now),
        ).toBe(1);
    });

    it("counts back from yesterday when today has no feedings", () => {
        expect(
            computeFeedingStreak(
                [{ fedAt: dayAt(1) }, { fedAt: dayAt(2) }, { fedAt: dayAt(3) }],
                now,
            ),
        ).toBe(3);
    });

    it("breaks on a gap", () => {
        // fed today, yesterday, then skip the day before, then 3 days ago.
        expect(
            computeFeedingStreak(
                [
                    { fedAt: dayAt(0) },
                    { fedAt: dayAt(1) },
                    { fedAt: dayAt(3) },
                ],
                now,
            ),
        ).toBe(2);
    });

    it("dedupes multiple feedings on the same day", () => {
        expect(
            computeFeedingStreak(
                [
                    { fedAt: dayAt(0) },
                    { fedAt: dayAt(0) },
                    { fedAt: dayAt(1) },
                ],
                now,
            ),
        ).toBe(2);
    });
});
