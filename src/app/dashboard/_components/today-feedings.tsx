"use client";

import { useMemo } from "react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/react";

export function TodayFeedings({
    petId,
    petName,
}: {
    petId: number;
    petName: string;
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
                    </div>
                    <div className="text-xs text-muted-foreground">kcal today</div>
                </div>
            </CardHeader>
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
