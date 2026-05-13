import { describe, expect, it } from "vitest";

import { csvEscape, toCsv } from "./csv";

describe("csvEscape", () => {
    it("returns empty string for null and undefined", () => {
        expect(csvEscape(null)).toBe("");
        expect(csvEscape(undefined)).toBe("");
    });

    it("passes through plain strings unchanged", () => {
        expect(csvEscape("hello")).toBe("hello");
        expect(csvEscape("with spaces")).toBe("with spaces");
    });

    it("quotes strings containing commas", () => {
        expect(csvEscape("a, b")).toBe('"a, b"');
    });

    it("quotes and escapes inner double quotes", () => {
        expect(csvEscape('she said "hi"')).toBe('"she said ""hi"""');
    });

    it("quotes strings containing newlines", () => {
        expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
    });

    it("stringifies numbers without quoting", () => {
        expect(csvEscape(42)).toBe("42");
        expect(csvEscape(3.14)).toBe("3.14");
    });
});

describe("toCsv", () => {
    it("emits a trailing newline", () => {
        expect(toCsv([["a", "b"]])).toBe("a,b\n");
    });

    it("joins rows with newlines and cells with commas", () => {
        expect(
            toCsv([
                ["h1", "h2"],
                [1, 2],
                [3, 4],
            ]),
        ).toBe("h1,h2\n1,2\n3,4\n");
    });

    it("escapes per-cell as it goes", () => {
        expect(toCsv([["name", "note"], ["a", "x,y"]])).toBe(
            'name,note\na,"x,y"\n',
        );
    });
});
