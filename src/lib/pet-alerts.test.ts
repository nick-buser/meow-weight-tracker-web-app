import { describe, expect, it } from "vitest";

import { computePetAlerts } from "./pet-alerts";

const now = new Date("2026-05-13T15:00:00Z").getTime();
const hoursAgo = (n: number) => new Date(now - n * 3_600_000);
const daysAgo = (n: number) => new Date(now - n * 86_400_000);

describe("computePetAlerts", () => {
    it("returns nothing when there are no feedings or weights", () => {
        expect(
            computePetAlerts({
                feedings: [],
                weights: [],
                petName: "Whiskers",
                now,
            }),
        ).toEqual([]);
    });

    it("does not surface hungry when last feeding is within 18h", () => {
        const out = computePetAlerts({
            feedings: [{ fedAt: hoursAgo(12) }],
            weights: [],
            petName: "W",
            now,
        });
        expect(out).toHaveLength(0);
    });

    it("surfaces a warn at 18h+ since last feeding", () => {
        const out = computePetAlerts({
            feedings: [{ fedAt: hoursAgo(19) }],
            weights: [],
            petName: "W",
            now,
        });
        expect(out).toHaveLength(1);
        expect(out[0]!.severity).toBe("warn");
        expect(out[0]!.kind).toBe("hungry");
    });

    it("escalates to alert at 24h+", () => {
        const out = computePetAlerts({
            feedings: [{ fedAt: hoursAgo(26) }],
            weights: [],
            petName: "W",
            now,
        });
        expect(out[0]!.severity).toBe("alert");
    });

    it("ignores week-over-week change below 5%", () => {
        const out = computePetAlerts({
            feedings: [],
            weights: [
                { id: 1, weight: 5.0, weighedAt: daysAgo(8) },
                { id: 2, weight: 5.1, weighedAt: daysAgo(0) },
            ],
            petName: "W",
            now,
        });
        expect(out).toHaveLength(0);
    });

    it("warns on 5%-10% week-over-week change", () => {
        const out = computePetAlerts({
            feedings: [],
            weights: [
                { id: 1, weight: 5.0, weighedAt: daysAgo(8) },
                { id: 2, weight: 5.4, weighedAt: daysAgo(0) },
            ],
            petName: "W",
            now,
        });
        expect(out).toHaveLength(1);
        expect(out[0]!.severity).toBe("warn");
        expect(out[0]!.kind).toBe("weightUp");
    });

    it("alerts at 10%+ week-over-week and marks direction", () => {
        const out = computePetAlerts({
            feedings: [],
            weights: [
                { id: 1, weight: 5.0, weighedAt: daysAgo(8) },
                { id: 2, weight: 4.4, weighedAt: daysAgo(0) },
            ],
            petName: "W",
            now,
        });
        expect(out).toHaveLength(1);
        expect(out[0]!.severity).toBe("alert");
        expect(out[0]!.kind).toBe("weightDown");
    });

    it("can surface both alerts simultaneously", () => {
        const out = computePetAlerts({
            feedings: [{ fedAt: hoursAgo(30) }],
            weights: [
                { id: 1, weight: 5.0, weighedAt: daysAgo(8) },
                { id: 2, weight: 5.6, weighedAt: daysAgo(0) },
            ],
            petName: "W",
            now,
        });
        expect(out).toHaveLength(2);
        expect(out.map((a) => a.kind).sort()).toEqual(["hungry", "weightUp"]);
    });
});
