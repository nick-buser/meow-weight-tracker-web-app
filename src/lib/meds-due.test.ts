import { describe, expect, it } from "vitest";

import { isMedDue, nextDueAt, type MedForDue } from "./meds-due";

const now = new Date("2026-05-14T15:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
const hoursFromNow = (h: number) => new Date(now.getTime() + h * 3_600_000);

describe("isMedDue", () => {
    it("is not due before its start", () => {
        const med: MedForDue = {
            startsAt: hoursFromNow(2),
            endsAt: null,
            lastGivenAt: null,
            frequencyHours: 12,
        };
        expect(isMedDue(med, now)).toBe(false);
    });

    it("is not due after its end", () => {
        const med: MedForDue = {
            startsAt: hoursAgo(72),
            endsAt: hoursAgo(1),
            lastGivenAt: hoursAgo(50),
            frequencyHours: 12,
        };
        expect(isMedDue(med, now)).toBe(false);
    });

    it("is due when never given and started", () => {
        const med: MedForDue = {
            startsAt: hoursAgo(1),
            endsAt: null,
            lastGivenAt: null,
            frequencyHours: 12,
        };
        expect(isMedDue(med, now)).toBe(true);
    });

    it("is due when last dose was longer than frequencyHours ago", () => {
        const med: MedForDue = {
            startsAt: hoursAgo(100),
            endsAt: null,
            lastGivenAt: hoursAgo(13),
            frequencyHours: 12,
        };
        expect(isMedDue(med, now)).toBe(true);
    });

    it("is not due if the last dose was recent", () => {
        const med: MedForDue = {
            startsAt: hoursAgo(100),
            endsAt: null,
            lastGivenAt: hoursAgo(3),
            frequencyHours: 12,
        };
        expect(isMedDue(med, now)).toBe(false);
    });
});

describe("nextDueAt", () => {
    it("returns null when ended", () => {
        const med: MedForDue = {
            startsAt: hoursAgo(72),
            endsAt: hoursAgo(1),
            lastGivenAt: hoursAgo(2),
            frequencyHours: 12,
        };
        expect(nextDueAt(med, now)).toBeNull();
    });

    it("returns startsAt + interval when never given", () => {
        const med: MedForDue = {
            startsAt: hoursAgo(1),
            endsAt: null,
            lastGivenAt: null,
            frequencyHours: 12,
        };
        const expected = new Date(
            hoursAgo(1).getTime() + 12 * 3_600_000,
        );
        expect(nextDueAt(med, now)!.getTime()).toBe(expected.getTime());
    });

    it("returns lastGivenAt + interval when given before", () => {
        const med: MedForDue = {
            startsAt: hoursAgo(100),
            endsAt: null,
            lastGivenAt: hoursAgo(3),
            frequencyHours: 12,
        };
        const expected = new Date(
            hoursAgo(3).getTime() + 12 * 3_600_000,
        );
        expect(nextDueAt(med, now)!.getTime()).toBe(expected.getTime());
    });
});
