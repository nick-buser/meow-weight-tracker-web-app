import { describe, expect, it } from "vitest";

import { parseWeightCsv } from "./weight-csv-parse";

describe("parseWeightCsv", () => {
    it("rejects an empty file", () => {
        const res = parseWeightCsv("");
        expect(res.rows).toHaveLength(0);
        expect(res.errors).toHaveLength(1);
        expect(res.errors[0]!.message).toMatch(/empty/i);
    });

    it("rejects a missing header", () => {
        const res = parseWeightCsv("foo,bar\n1,2\n");
        expect(res.errors).toHaveLength(1);
        expect(res.errors[0]!.message).toMatch(/header/i);
    });

    it("parses the export format", () => {
        const csv = [
            "entry_id,weighed_at_iso,weight,created_at_iso",
            "1,2026-05-01T10:00:00Z,5.4,2026-05-01T10:00:01Z",
            "2,2026-05-08T10:00:00Z,5.2,2026-05-08T10:00:01Z",
        ].join("\n");
        const res = parseWeightCsv(csv);
        expect(res.errors).toHaveLength(0);
        expect(res.rows).toHaveLength(2);
        expect(res.rows[0]!.weight).toBeCloseTo(5.4);
    });

    it("reports invalid rows but keeps good ones", () => {
        const csv = [
            "weighed_at,weight",
            "2026-05-01,5.0",
            "not-a-date,4.9",
            "2026-05-03,-1",
            "2026-05-04,5.2",
        ].join("\n");
        const res = parseWeightCsv(csv);
        expect(res.rows).toHaveLength(2);
        expect(res.errors).toHaveLength(2);
        expect(res.errors.map((e) => e.line).sort()).toEqual([3, 4]);
    });

    it("handles quoted cells with commas inside", () => {
        const csv = [
            'weighed_at,weight,note',
            '2026-05-01,5.0,"hello, world"',
        ].join("\n");
        const res = parseWeightCsv(csv);
        expect(res.errors).toHaveLength(0);
        expect(res.rows).toHaveLength(1);
    });
});
