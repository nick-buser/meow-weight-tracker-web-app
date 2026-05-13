"use client";

import { useMemo } from "react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export function TodayFeedings({
    petId,
    petName,
    dailyKcalTarget,
}: {
    petId: number;
    petName: string;
    dailyKcalTarget: number | null;
}) {
    const { data, isLoading } = api.feeding.getFeedingHistory.useQuery({
        petId,
    });

    const today = useMemo(() => {
        if (!data) return [];
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return data.filter((row) => {
            const t = row.fedAt.getTime();
            return t >= start.getTime() && t < end.getTime();
        });
    }, [data]);

    const totalKcal = today.reduce(
        (sum, row) => sum + row.quantityGrams * row.food.caloriesPerGram,
        0,
    );
    const pct =
        dailyKcalTarget && dailyKcalTarget > 0
            ? Math.min(100, (totalKcal / dailyKcalTarget) * 100)
            : null;
    const over = dailyKcalTarget !== null && totalKcal > dailyKcalTarget;

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle>Today&apos;s feedings</CardTitle>
                    <CardDescription>
                        {petName} · {today.length}{" "}
                        {today.length === 1 ? "feeding" : "feedings"}
                    </CardDescription>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-semibold">
                        {totalKcal.toFixed(0)}
                        {dailyKcalTarget && (
                            <span className="text-sm text-muted-foreground">
                                {" "}
                                / {dailyKcalTarget}
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground">kcal today</div>
                </div>
            </CardHeader>
            {pct !== null && (
                <div className="-mt-3 mb-3 px-6">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className={cn(
                                "h-full rounded-full bg-primary transition-all",
                                over && "bg-destructive",
                            )}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>
            )}
            <CardContent>
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : today.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No feedings logged today yet.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {today.map((row) => {
                            const kcal = row.quantityGrams * row.food.caloriesPerGram;
                            return (
                                <li
                                    key={row.id}
                                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                                >
                                    <div>
                                        <div className="font-medium">
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
                                    <div className="text-sm font-medium">
                                        {kcal.toFixed(0)} kcal
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
