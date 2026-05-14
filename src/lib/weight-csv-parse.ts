export type ParsedWeightRow = {
    line: number;
    weighedAt: Date;
    weight: number;
};

export type ParseError = {
    line: number;
    message: string;
};

export type ParseResult = {
    rows: ParsedWeightRow[];
    errors: ParseError[];
};

function splitCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i]!;
        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') {
                    cur += '"';
                    i += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                cur += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ",") {
            out.push(cur);
            cur = "";
        } else {
            cur += ch;
        }
    }
    out.push(cur);
    return out.map((c) => c.trim());
}

/**
 * Parse a CSV of weight readings. Required columns: weight, and one of
 * `weighed_at_iso` or `weighed_at` (parsed via Date()). Extra columns are
 * ignored. Header order is detected from the first row.
 */
export function parseWeightCsv(text: string): ParseResult {
    const lines = text
        .split(/\r?\n/)
        .map((l, i) => ({ line: i + 1, text: l }))
        .filter((l) => l.text.trim().length > 0);

    if (lines.length === 0) {
        return { rows: [], errors: [{ line: 0, message: "Empty file" }] };
    }

    const header = splitCsvLine(lines[0]!.text).map((h) => h.toLowerCase());
    const weightIdx = header.findIndex((h) => h === "weight");
    const dateIdx = header.findIndex(
        (h) =>
            h === "weighed_at_iso" ||
            h === "weighed_at" ||
            h === "date" ||
            h === "datetime",
    );

    if (weightIdx < 0 || dateIdx < 0) {
        return {
            rows: [],
            errors: [
                {
                    line: 1,
                    message:
                        "Header must include 'weight' and 'weighed_at_iso' (or 'weighed_at', 'date', 'datetime').",
                },
            ],
        };
    }

    const rows: ParsedWeightRow[] = [];
    const errors: ParseError[] = [];
    for (const { line, text: raw } of lines.slice(1)) {
        const cells = splitCsvLine(raw);
        const w = Number(cells[weightIdx]);
        const dStr = cells[dateIdx];
        if (!dStr) {
            errors.push({ line, message: "Missing date." });
            continue;
        }
        const d = new Date(dStr);
        if (Number.isNaN(d.getTime())) {
            errors.push({ line, message: `Invalid date: ${dStr}` });
            continue;
        }
        if (!Number.isFinite(w) || w <= 0) {
            errors.push({
                line,
                message: `Invalid weight: ${cells[weightIdx] ?? ""}`,
            });
            continue;
        }
        rows.push({ line, weighedAt: d, weight: w });
    }

    return { rows, errors };
}
