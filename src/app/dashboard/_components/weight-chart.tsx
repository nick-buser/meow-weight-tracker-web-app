"use client";

import { useMemo, useState } from "react";
import { Scale } from "lucide-react";
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
import { Skeleton } from "~/components/ui/skeleton";
import { EmptyState } from "~/components/ui/empty-state";
import { useWeightUnit } from "~/hooks/use-weight-unit";
import { formatWeight, fromKg } from "~/lib/units";
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
    const unit = useWeightUnit();
    const { data, isLoading } = api.weight.getWeightHistory.useQuery({ petId });
    const events = api.health.getHistory.useQuery({ petId });

    const cutoffMs = useMemo(() => {
        const days = RANGES.find((r) => r.value === range)?.days ?? null;
        return days === null ? 0 : Date.now() - days * 24 * 60 * 60 * 1000;
    }, [range]);

    const visible = useMemo(() => {
        if (!data) return [];
        if (cutoffMs === 0) return data;
        return data.filter((row) => row.weighedAt.getTime() >= cutoffMs);
    }, [data, cutoffMs]);

    const points = visible.map((row) => ({
        t: row.weighedAt.getTime(),
        weight: fromKg(row.weight, unit),
    }));

    const visibleEvents = useMemo(() => {
        if (!events.data) return [];
        return events.data.filter(
            (e) => cutoffMs === 0 || e.occurredAt.getTime() >= cutoffMs,
        );
    }, [events.data, cutoffMs]);

    const eventColor = (type: string): string => {
        switch (type) {
            case "Vet visit":
                return "hsl(220 80% 55%)";
            case "Medication":
                return "hsl(265 70% 60%)";
            case "Vaccination":
                return "hsl(160 65% 45%)";
            case "Symptom":
                return "hsl(0 70% 55%)";
            case "Surgery":
                return "hsl(15 80% 50%)";
            default:
                return "hsl(var(--muted-foreground))";
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle>{petName}&apos;s weight</CardTitle>
                    <CardDescription>
                        {data && data.length > 0
                            ? `Latest: ${formatWeight(
                                  data[data.length - 1]!.weight,
                                  unit,
                              )}`
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
                    <Skeleton className="h-64 w-full" />
                ) : points.length === 0 ? (
                    <EmptyState
                        icon={Scale}
                        title="No readings in this range"
                        description="Try a wider range, or log a weight to get started."
                        className="h-64"
                    />
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
                                        `${Number(value).toFixed(2)} ${unit}`,
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
                                        y={fromKg(goalWeight, unit)}
                                        stroke="hsl(var(--destructive))"
                                        strokeDasharray="4 4"
                                        label={{
                                            value: `Goal ${formatWeight(
                                                goalWeight,
                                                unit,
                                            )}`,
                                            position: "right",
                                            fontSize: 11,
                                            fill: "hsl(var(--destructive))",
                                        }}
                                    />
                                )}
                                {visibleEvents.map((e) => (
                                    <ReferenceLine
                                        key={e.id}
                                        x={e.occurredAt.getTime()}
                                        stroke={eventColor(e.eventType)}
                                        strokeDasharray="2 4"
                                        strokeOpacity={0.7}
                                        label={{
                                            value: e.eventType,
                                            position: "insideTopLeft",
                                            fontSize: 9,
                                            fill: eventColor(e.eventType),
                                        }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
