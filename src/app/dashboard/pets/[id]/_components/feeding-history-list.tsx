"use client";

import { useMemo } from "react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { FeedingRowActions } from "~/app/dashboard/_components/feeding-row-actions";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/react";

type Feeding = RouterOutputs["feeding"]["getFeedingHistory"][number];

export function FeedingHistoryList({
    petId,
    canEdit,
}: {
    petId: number;
    canEdit: boolean;
}) {
    const { data, isLoading } = api.feeding.getFeedingHistory.useQuery({
        petId,
    });

    const grouped = useMemo(() => groupByDay(data ?? []), [data]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Feeding history</CardTitle>
                <CardDescription>
                    All recorded feedings, grouped by day.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : grouped.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No feedings recorded yet.
                    </p>
                ) : (
                    <div className="space-y-5">
                        {grouped.map(({ dayKey, dayLabel, items, totalKcal }) => (
                            <div key={dayKey} className="space-y-1">
                                <div className="flex items-baseline justify-between border-b pb-1">
                                    <div className="text-sm font-medium">
                                        {dayLabel}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {totalKcal.toFixed(0)} kcal · {items.length}{" "}
                                        {items.length === 1 ? "feeding" : "feedings"}
                                    </div>
                                </div>
                                <ul className="divide-y">
                                    {items.map((row) => {
                                        const kcal =
                                            row.quantityGrams * row.food.caloriesPerGram;
                                        return (
                                            <li
                                                key={row.id}
                                                className="flex items-center justify-between gap-2 py-2 text-sm"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate font-medium">
                                                        {row.food.brand
                                                            ? `${row.food.brand} — ${row.food.name}`
                                                            : row.food.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {row.fedAt.toLocaleTimeString([], {
                                                            hour: "numeric",
                                                            minute: "2-digit",
                                                        })}{" "}
                                                        · {row.quantityGrams} g
                                                    </div>
                                                </div>
                                                <div>{kcal.toFixed(0)} kcal</div>
                                                <FeedingRowActions
                                                    row={row}
                                                    petId={petId}
                                                    canEdit={canEdit}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function groupByDay(rows: Feeding[]) {
    const map = new Map<
        string,
        { dayKey: string; dayLabel: string; items: Feeding[]; totalKcal: number }
    >();
    for (const row of rows) {
        const d = row.fedAt;
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const dayLabel = d.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        let bucket = map.get(dayKey);
        if (!bucket) {
            bucket = { dayKey, dayLabel, items: [], totalKcal: 0 };
            map.set(dayKey, bucket);
        }
        bucket.items.push(row);
        bucket.totalKcal += row.quantityGrams * row.food.caloriesPerGram;
    }
    return [...map.values()];
}
