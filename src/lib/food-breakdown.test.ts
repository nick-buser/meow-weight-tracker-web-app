import { describe, expect, it } from "vitest";

import {
    computeFoodBreakdown,
    type FeedingForBreakdown,
} from "./food-breakdown";

const now = new Date("2026-05-14T15:00:00Z");
const FOOD_A: FeedingForBreakdown["food"] = {
    id: 1,
    name: "A",
    brand: null,
    caloriesPerGram: 4,
};
const FOOD_B: FeedingForBreakdown["food"] = {
    id: 2,
    name: "B",
    brand: "Acme",
    caloriesPerGram: 3,
};

function f(
    daysAgo: number,
    grams: number,
    food: FeedingForBreakdown["food"],
): FeedingForBreakdown {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(12, 0, 0, 0);
    return { fedAt: d, quantityGrams: grams, food };
}

describe("computeFoodBreakdown", () => {
    it("returns the requested number of buckets in chronological order", () => {
        const { data } = computeFoodBreakdown([], 7, now);
        expect(data).toHaveLength(7);
    });

    it("series is empty when there are no feedings", () => {
        const { series } = computeFoodBreakdown([], 7, now);
        expect(series).toEqual([]);
    });

    it("groups kcal by day and by food", () => {
        const { data, series } = computeFoodBreakdown(
            [
                f(0, 50, FOOD_A),
                f(0, 30, FOOD_B),
                f(1, 100, FOOD_A),
            ],
            5,
            now,
        );
        const today = data[data.length - 1]!;
        const yesterday = data[data.length - 2]!;
        expect(today.food_1).toBe(200);
        expect(today.food_2).toBe(90);
        expect(yesterday.food_1).toBe(400);
        // Series sorted by total descending: A (600) before B (90).
        expect(series.map((s) => s.foodId)).toEqual([1, 2]);
        expect(series[1]!.label).toBe("Acme — B");
    });

    it("ignores feedings outside the window", () => {
        const { data, series } = computeFoodBreakdown(
            [f(30, 100, FOOD_A)],
            7,
            now,
        );
        expect(series).toEqual([]);
        expect(data.every((d) => d.food_1 === undefined)).toBe(true);
    });
});
