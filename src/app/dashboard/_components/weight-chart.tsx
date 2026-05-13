"use client";

import { useMemo, useState } from "react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
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
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

type Range = "30d" | "90d" | "all";
const RANGES: { value: Range; label: string; days: number | null }[] = [
    { value: "30d", label: "30d", days: 30 },
    { value: "90d", label: "90d", days: 90 },
    { value: "all", label: "All", days: null },
];

export function WeightChart({
    petId,
    petName,
    goalWeight = null,
}: {
    petId: number;
    petName: string;
    goalWeight?: number | null;
}) {
    const [range, setRange] = useState<Range>("90d");
    const { data, isLoading } = api.weight.getWeightHistory.useQuery({ petId });

    const visible = useMemo(() => {
        if (!data) return [];
        const days = RANGES.find((r) => r.value === range)?.days ?? null;
        if (days === null) return data;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return data.filter((row) => row.weighedAt.getTime() >= cutoff);
    }, [data, range]);

    const points = visible.map((row) => ({
        t: row.weighedAt.getTime(),
        weight: row.weight,
    }));

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle>{petName}&apos;s weight</CardTitle>
                    <CardDescription>
                        {data && data.length > 0
                            ? `Latest: ${data[data.length - 1]!.weight.toFixed(2)}`
                            : "No readings yet"}
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
                    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                        Loading…
                    </div>
                ) : points.length === 0 ? (
                    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                        No weight readings in this range yet.
                    </div>
                ) : (
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={points}
                                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
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
                                        new Date(t).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                        })
                                    }
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis
                                    dataKey="weight"
                                    domain={["auto", "auto"]}
                                    tick={{ fontSize: 11 }}
                                    width={36}
                                />
                                <Tooltip
                                    labelFormatter={(t) =>
                                        new Date(Number(t)).toLocaleString()
                                    }
                                    formatter={(value) => [
                                        Number(value).toFixed(2),
                                        "Weight",
                                    ]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="weight"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                                {goalWeight !== null && (
                                    <ReferenceLine
                                        y={goalWeight}
                                        stroke="hsl(var(--destructive))"
                                        strokeDasharray="4 4"
                                        label={{
                                            value: `Goal ${goalWeight.toFixed(2)}`,
                                            position: "right",
                                            fontSize: 11,
                                            fill: "hsl(var(--destructive))",
                                        }}
                                    />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
