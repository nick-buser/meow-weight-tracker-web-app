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
import { parseWeightCsv, type ParseResult } from "~/lib/weight-csv-parse";
import { api } from "~/trpc/react";

export function ImportWeightCard({
    petId,
    canEdit,
}: {
    petId: number;
    canEdit: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [parsed, setParsed] = useState<ParseResult | null>(null);
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
                weight: r.weight,
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
