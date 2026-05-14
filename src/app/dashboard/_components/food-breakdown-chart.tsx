"use client";

import { useMemo } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { computeFoodBreakdown } from "~/lib/food-breakdown";
import { api } from "~/trpc/react";

const COLORS = [
    "hsl(220 90% 56%)",
    "hsl(160 70% 45%)",
    "hsl(35 90% 55%)",
    "hsl(330 75% 60%)",
    "hsl(265 80% 65%)",
    "hsl(190 75% 45%)",
];

export function FoodBreakdownChart({
    petId,
    petName,
}: {
    petId: number;
    petName: string;
}) {
    const { data, isLoading } = api.feeding.getFeedingHistory.useQuery({
        petId,
    });

    const { series, data: chartData } = useMemo(
        () => computeFoodBreakdown(data ?? [], 30),
        [data],
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>30-day food breakdown</CardTitle>
                <CardDescription>
                    {petName}&apos;s kcal sources, stacked by day.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-56 w-full" />
                ) : series.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No feedings in the last 30 days.
                    </p>
                ) : (
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="hsl(var(--border))"
                                />
                                <XAxis
                                    dataKey="dayLabel"
                                    tick={{ fontSize: 10 }}
                                    interval={3}
                                />
                                <YAxis tick={{ fontSize: 10 }} width={32} />
                                <Tooltip
                                    formatter={(value, name) => [
                                        `${Number(value).toFixed(0)} kcal`,
                                        String(name),
                                    ]}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: 11 }}
                                    iconType="square"
                                />
                                {series.map((s, i) => (
                                    <Bar
                                        key={s.foodId}
                                        dataKey={`food_${s.foodId}`}
                                        stackId="kcal"
                                        name={s.label}
                                        fill={COLORS[i % COLORS.length]}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
