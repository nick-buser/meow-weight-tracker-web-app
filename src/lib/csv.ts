export function csvEscape(value: unknown): string {
    if (value === null || value === undefined) return "";
    const s = String(value);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
    return rows.map((r) => r.map(csvEscape).join(",")).join("\n") + "\n";
}
