"use client";

import { useState } from "react";
import { LineChart as LineChartIcon } from "lucide-react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Skeleton } from "~/components/ui/skeleton";
import { useWeightUnit } from "~/hooks/use-weight-unit";
import { fromKg } from "~/lib/units";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

type Range = "30d" | "90d" | "all";
const RANGES: { value: Range; label: string; days: number | null }[] = [
    { value: "30d", label: "30d", days: 30 },
    { value: "90d", label: "90d", days: 90 },
    { value: "all", label: "All", days: null },
];

const SERIES_COLORS = [
    "hsl(220 80% 55%)",
    "hsl(160 65% 45%)",
    "hsl(15 80% 50%)",
    "hsl(265 70% 60%)",
    "hsl(45 90% 50%)",
    "hsl(330 70% 55%)",
];

export function WeightComparison() {
    const [range, setRange] = useState<Range>("90d");
    const [hidden, setHidden] = useState<Set<number>>(new Set());
    const unit = useWeightUnit();
    const { data, isLoading } = api.weight.getComparison.useQuery();

    function toggle(petId: number) {
        setHidden((prev) => {
            const next = new Set(prev);
            if (next.has(petId)) next.delete(petId);
            else next.add(petId);
            return next;
        });
    }

    const rangeDays = RANGES.find((r) => r.value === range)?.days ?? null;
    const cutoffMs =
        rangeDays === null ? 0 : Date.now() - rangeDays * 86_400_000;

    const series = (data ?? []).map((s, i) => ({
        ...s,
        color: SERIES_COLORS[i % SERIES_COLORS.length]!,
    }));
    const shownSeries = series.filter((s) => !hidden.has(s.petId));

    const rowMap = new Map<number, Record<string, number>>();
    for (const s of shownSeries) {
        for (const pt of s.points) {
            const t = pt.weighedAt.getTime();
            if (cutoffMs !== 0 && t < cutoffMs) continue;
            const row = rowMap.get(t) ?? {};
            row[`p${s.petId}`] = fromKg(pt.weight, unit);
            rowMap.set(t, row);
        }
    }
    const chartData = [...rowMap.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([t, values]) => ({ t, ...values }));

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <LineChartIcon className="h-4 w-4" />
                        Weight comparison
                    </CardTitle>
                    <CardDescription>
                        Every pet&apos;s weight history, overlaid.
                    </CardDescription>
                </div>
                <div className="flex gap-1">
                    {RANGES.map((r) => (
                        <Button
                            key={r.value}
                            type="button"
                            size="sm"
                            variant={r.value === range ? "default" : "outline"}
                            onClick={() => setRange(r.value)}
                            className={cn("h-8 px-3 text-xs")}
                        >
                            {r.label}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-72 w-full" />
                ) : !data || data.length < 2 ? (
                    <EmptyState
                        icon={LineChartIcon}
                        title="Add a second pet to compare"
                        description="Once you track two or more pets, their weight trends line up here."
                        className="h-72"
                    />
                ) : (
                    <>
                        <div className="mb-4 flex flex-wrap gap-1.5">
                            {series.map((s) => {
                                const shown = !hidden.has(s.petId);
                                return (
                                    <button
                                        key={s.petId}
                                        type="button"
                                        onClick={() => toggle(s.petId)}
                                        aria-pressed={shown}
                                        className={cn(
                                            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-opacity",
                                            shown
                                                ? "border-transparent bg-muted"
                                                : "border-input opacity-50",
                                        )}
                                    >
                                        <span
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: s.color }}
                                        />
                                        {s.petName}
                                    </button>
                                );
                            })}
                        </div>
                        {chartData.length === 0 ? (
                            <EmptyState
                                icon={LineChartIcon}
                                title="No readings in this range"
                                description="Try a wider range, or pick at least one pet above."
                                className="h-64"
                            />
                        ) : (
                            <div
                                className="h-72 w-full"
                                role="img"
                                aria-label={`Weight comparison chart for ${
                                    shownSeries.length
                                } ${
                                    shownSeries.length === 1 ? "pet" : "pets"
                                }, measured in ${unit}.`}
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        accessibilityLayer
                                        data={chartData}
                                        margin={{
                                            top: 8,
                                            right: 8,
                                            left: 0,
                                            bottom: 0,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="hsl(var(--border))"
                                        />
                                        <XAxis
                                            dataKey="t"
                                            type="number"
                                            scale="time"
                                            domain={["dataMin", "dataMax"]}
                                            tickFormatter={(t: number) =>
                                                new Date(
                                                    t,
                                                ).toLocaleDateString(
                                                    undefined,
                                                    {
                                                        month: "short",
                                                        day: "numeric",
                                                    },
                                                )
                                            }
                                            tick={{ fontSize: 11 }}
                                        />
                                        <YAxis
                                            domain={["auto", "auto"]}
                                            tick={{ fontSize: 11 }}
                                            width={36}
                                        />
                                        <Tooltip
                                            labelFormatter={(t) =>
                                                new Date(
                                                    Number(t),
                                                ).toLocaleString()
                                            }
                                            formatter={(value, name) => [
                                                `${Number(value).toFixed(
                                                    2,
                                                )} ${unit}`,
                                                String(name),
                                            ]}
                                        />
                                        {shownSeries.map((s) => (
                                            <Line
                                                key={s.petId}
                                                type="monotone"
                                                dataKey={`p${s.petId}`}
                                                name={s.petName}
                                                stroke={s.color}
                                                strokeWidth={2}
                                                dot={{ r: 2 }}
                                                activeDot={{ r: 4 }}
                                                connectNulls
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
