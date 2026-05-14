"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { useWeightUnit } from "~/hooks/use-weight-unit";
import { toKg, type WeightUnit } from "~/lib/units";
import { parseWeightCsv, type ParseResult } from "~/lib/weight-csv-parse";
import { api } from "~/trpc/react";

export function ImportWeightCard({
    petId,
    canEdit,
}: {
    petId: number;
    canEdit: boolean;
}) {
    const preferredUnit = useWeightUnit();
    const inputRef = useRef<HTMLInputElement>(null);
    const [parsed, setParsed] = useState<ParseResult | null>(null);
    // null = follow the user's preferred unit; set once they pick explicitly.
    const [csvUnitOverride, setCsvUnitOverride] = useState<WeightUnit | null>(
        null,
    );
    const csvUnit = csvUnitOverride ?? preferredUnit;
    const utils = api.useUtils();
    const bulkImport = api.weight.bulkImport.useMutation({
        onSuccess: async ({ inserted }) => {
            await utils.weight.getWeightHistory.invalidate({ petId });
            setParsed(null);
            if (inputRef.current) inputRef.current.value = "";
            toast.success(`Imported ${inserted} weight readings`);
        },
        onError: (err) => toast.error(err.message),
    });

    if (!canEdit) return null;

    async function onFile(file: File) {
        const text = await file.text();
        setParsed(parseWeightCsv(text));
    }

    function onImport() {
        if (!parsed || parsed.rows.length === 0) return;
        bulkImport.mutate({
            petId,
            entries: parsed.rows.map((r) => ({
                weighedAt: r.weighedAt,
                // CSV values are interpreted in the selected unit and
                // stored canonically as kg.
                weight: toKg(r.weight, csvUnit),
            })),
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Import weights</CardTitle>
                <CardDescription>
                    Upload a CSV. Requires columns <code>weight</code> and{" "}
                    <code>weighed_at_iso</code> (or <code>weighed_at</code>).
                    Matches the export format.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onFile(f);
                        else setParsed(null);
                    }}
                    className="text-sm"
                />
                <div className="flex items-center gap-2 text-sm">
                    <label htmlFor="csv-unit" className="text-muted-foreground">
                        CSV weights are in
                    </label>
                    <select
                        id="csv-unit"
                        value={csvUnit}
                        onChange={(e) =>
                            setCsvUnitOverride(e.target.value as WeightUnit)
                        }
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                        <option value="kg">kilograms (kg)</option>
                        <option value="lb">pounds (lb)</option>
                    </select>
                </div>
                {parsed && (
                    <div className="space-y-2 text-sm">
                        <p>
                            Parsed {parsed.rows.length} valid{" "}
                            {parsed.rows.length === 1 ? "row" : "rows"}
                            {parsed.errors.length > 0 &&
                                `; ${parsed.errors.length} skipped`}
                            .
                        </p>
                        {parsed.errors.length > 0 && (
                            <ul className="max-h-32 list-disc overflow-auto pl-5 text-xs text-destructive">
                                {parsed.errors.slice(0, 25).map((e, i) => (
                                    <li key={i}>
                                        Line {e.line}: {e.message}
                                    </li>
                                ))}
                                {parsed.errors.length > 25 && (
                                    <li>
                                        …and {parsed.errors.length - 25} more
                                    </li>
                                )}
                            </ul>
                        )}
                        <Button
                            type="button"
                            disabled={
                                parsed.rows.length === 0 || bulkImport.isPending
                            }
                            onClick={onImport}
                        >
                            <Upload className="mr-2 h-3.5 w-3.5" />
                            {bulkImport.isPending
                                ? "Importing…"
                                : `Import ${parsed.rows.length}`}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
