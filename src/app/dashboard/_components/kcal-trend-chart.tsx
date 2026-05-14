"use client";

import { useMemo } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ReferenceLine,
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
import { computeDailyKcal } from "~/lib/kcal-trend";
import { api } from "~/trpc/react";

export function KcalTrendChart({
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
    const days = useMemo(() => computeDailyKcal(data ?? [], 14), [data]);
    const maxKcal = Math.max(
        dailyKcalTarget ?? 0,
        ...days.map((d) => d.kcal),
        100,
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Last 14 days</CardTitle>
                <CardDescription>
                    {petName}&apos;s daily kcal
                    {dailyKcalTarget ? ` vs target ${dailyKcalTarget}` : ""}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-48 w-full" />
                ) : (
                    <div
                        className="h-48 w-full"
                        role="img"
                        aria-label={`Daily calorie intake for ${petName} over the last ${days.length} days${
                            dailyKcalTarget
                                ? `, against a target of ${dailyKcalTarget} kcal`
                                : ""
                        }.`}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                accessibilityLayer
                                data={days}
                                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="hsl(var(--border))"
                                />
                                <XAxis
                                    dataKey="dayLabel"
                                    tick={{ fontSize: 10 }}
                                    interval={1}
                                />
                                <YAxis
                                    domain={[0, Math.ceil(maxKcal * 1.1)]}
                                    tick={{ fontSize: 10 }}
                                    width={32}
                                />
                                <Tooltip
                                    formatter={(value) => [
                                        `${Number(value).toFixed(0)} kcal`,
                                        "kcal",
                                    ]}
                                />
                                <Bar dataKey="kcal" radius={[3, 3, 0, 0]}>
                                    {days.map((d) => (
                                        <Cell
                                            key={d.dayKey}
                                            fill={
                                                dailyKcalTarget &&
                                                d.kcal > dailyKcalTarget
                                                    ? "hsl(var(--destructive))"
                                                    : "hsl(var(--primary))"
                                            }
                                        />
                                    ))}
                                </Bar>
                                {dailyKcalTarget !== null && (
                                    <ReferenceLine
                                        y={dailyKcalTarget}
                                        stroke="hsl(var(--muted-foreground))"
                                        strokeDasharray="4 4"
                                    />
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
