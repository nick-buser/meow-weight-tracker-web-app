"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { useWeightUnit } from "~/hooks/use-weight-unit";
import { formatWeight, toKg } from "~/lib/units";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/react";

type Entry = RouterOutputs["weight"]["getWeightHistory"][number];

export function WeightHistoryList({
    petId,
    canEdit,
}: {
    petId: number;
    canEdit: boolean;
}) {
    const { data, isLoading } = api.weight.getWeightHistory.useQuery({ petId });
    const sorted = (data ?? []).slice().sort(
        (a, b) => b.weighedAt.getTime() - a.weighedAt.getTime(),
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Weight history</CardTitle>
                <CardDescription>All recorded readings.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : sorted.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No readings yet.
                    </p>
                ) : (
                    <ul className="divide-y">
                        {sorted.map((row) => (
                            <WeightRow
                                key={row.id}
                                row={row}
                                petId={petId}
                                canEdit={canEdit}
                            />
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

function WeightRow({
    row,
    petId,
    canEdit,
}: {
    row: Entry;
    petId: number;
    canEdit: boolean;
}) {
    const unit = useWeightUnit();
    const [editing, setEditing] = useState(false);
    const [weight, setWeight] = useState(
        formatWeight(row.weight, unit, { withUnit: false }),
    );
    const [weighedAt, setWeighedAt] = useState(toLocalInput(row.weighedAt));
    const utils = api.useUtils();

    const updateEntry = api.weight.updateEntry.useMutation({
        onSuccess: async () => {
            await utils.weight.getWeightHistory.invalidate({ petId });
            setEditing(false);
            toast.success("Weight updated");
        },
        onError: (err) => toast.error(err.message),
    });
    const deleteEntry = api.weight.deleteEntry.useMutation({
        onSuccess: async () => {
            await utils.weight.getWeightHistory.invalidate({ petId });
            toast.success("Weight deleted");
        },
        onError: (err) => toast.error(err.message),
    });

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const n = Number(weight);
        if (!Number.isFinite(n) || n <= 0) return;
        updateEntry.mutate({
            entryId: row.id,
            weight: toKg(n, unit),
            weighedAt: weighedAt ? new Date(weighedAt) : undefined,
        });
    }

    function startEditing() {
        // Seed the form fresh so the value always matches the current unit,
        // even if preferences loaded after this row first mounted.
        setWeight(formatWeight(row.weight, unit, { withUnit: false }));
        setWeighedAt(toLocalInput(row.weighedAt));
        setEditing(true);
    }

    if (editing) {
        return (
            <li className="py-2">
                <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                    <div className="flex items-center gap-1.5">
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            aria-label={`Weight in ${unit}`}
                        />
                        <span className="text-xs text-muted-foreground">
                            {unit}
                        </span>
                    </div>
                    <Input
                        type="datetime-local"
                        value={weighedAt}
                        onChange={(e) => setWeighedAt(e.target.value)}
                        max={new Date().toISOString().slice(0, 16)}
                    />
                    <Button
                        type="submit"
                        size="sm"
                        disabled={updateEntry.isPending}
                    >
                        {updateEntry.isPending ? "…" : "Save"}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(false)}
                        disabled={updateEntry.isPending}
                    >
                        Cancel
                    </Button>
                </form>
                {updateEntry.error && (
                    <p className="mt-1 text-xs text-destructive">
                        {updateEntry.error.message}
                    </p>
                )}
            </li>
        );
    }

    return (
        <li className="flex items-center justify-between py-2 text-sm">
            <div>
                <div className="font-medium">
                    {formatWeight(row.weight, unit)}
                </div>
                <div className="text-xs text-muted-foreground">
                    {row.weighedAt.toLocaleString()}
                </div>
            </div>
            {canEdit && (
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={startEditing}
                        aria-label="Edit reading"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={deleteEntry.isPending}
                        onClick={() => {
                            if (!confirm("Delete this weight reading?")) return;
                            deleteEntry.mutate({ entryId: row.id });
                        }}
                        aria-label="Delete reading"
                        className="text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}
        </li>
    );
}

function toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
