import { describe, expect, it } from "vitest";

import { formatWeight, fromKg, kgToLb, lbToKg, toKg } from "./units";

describe("unit conversion", () => {
    it("kgToLb / lbToKg round-trip", () => {
        expect(kgToLb(1)).toBeCloseTo(2.2046, 3);
        expect(lbToKg(2.2046226218)).toBeCloseTo(1, 6);
        expect(lbToKg(kgToLb(4.32))).toBeCloseTo(4.32, 6);
    });

    it("fromKg passes kg through, converts lb", () => {
        expect(fromKg(5, "kg")).toBe(5);
        expect(fromKg(5, "lb")).toBeCloseTo(11.023, 2);
    });

    it("toKg is the inverse of fromKg", () => {
        expect(toKg(11.023113109, "lb")).toBeCloseTo(5, 6);
        expect(toKg(5, "kg")).toBe(5);
    });

    it("fromKg works for deltas (multiplicative, no offset)", () => {
        // a -0.5 kg change is a -1.10 lb change
        expect(fromKg(-0.5, "lb")).toBeCloseTo(-1.1023, 3);
    });
});

describe("formatWeight", () => {
    it("appends the unit by default", () => {
        expect(formatWeight(4.5, "kg")).toBe("4.50 kg");
        expect(formatWeight(4.5, "lb")).toBe("9.92 lb");
    });

    it("omits the unit when asked", () => {
        expect(formatWeight(4.5, "kg", { withUnit: false })).toBe("4.50");
    });

    it("respects the digits option", () => {
        expect(formatWeight(4.5, "kg", { digits: 1 })).toBe("4.5 kg");
        expect(formatWeight(4.567, "kg", { digits: 0 })).toBe("5 kg");
    });
});
