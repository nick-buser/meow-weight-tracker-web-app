"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { computeWeightStats } from "~/lib/weight-stats";
import { api } from "~/trpc/react";

export function WeightStatsCard({
    petId,
    petName,
    goalWeight,
}: {
    petId: number;
    petName: string;
    goalWeight: number | null;
}) {
    const { data, isLoading } = api.weight.getWeightHistory.useQuery({ petId });

    const stats = useMemo(
        () => computeWeightStats(data ?? [], goalWeight),
        [data, goalWeight],
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Trend</CardTitle>
                <CardDescription>{petName}&apos;s weight trajectory</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                    </div>
                ) : !stats ? (
                    <p className="text-sm text-muted-foreground">
                        Log at least two weights to see a trend.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <Stat label="Latest" value={stats.latest.toFixed(2)} />
                        <DeltaStat label="7d change" delta={stats.delta7} />
                        <DeltaStat label="30d change" delta={stats.delta30} />
                        <Stat
                            label="To goal"
                            value={
                                stats.daysToGoal === null
                                    ? "—"
                                    : stats.daysToGoal < 0
                                      ? "unreachable"
                                      : `${stats.daysToGoal}d`
                            }
                            hint={
                                stats.daysToGoal !== null && stats.daysToGoal > 0
                                    ? stats.goalDate?.toLocaleDateString(undefined, {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                      })
                                    : undefined
                            }
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function Stat({
    label,
    value,
    hint,
}: {
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-xl font-semibold">{value}</div>
            {hint && (
                <div className="text-[10px] text-muted-foreground">{hint}</div>
            )}
        </div>
    );
}

function DeltaStat({ label, delta }: { label: string; delta: number | null }) {
    if (delta === null) {
        return <Stat label={label} value="—" />;
    }
    const Icon =
        delta > 0.005 ? ArrowUp : delta < -0.005 ? ArrowDown : ArrowRight;
    const color =
        delta > 0.005
            ? "text-destructive"
            : delta < -0.005
              ? "text-emerald-600"
              : "text-muted-foreground";
    return (
        <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className={cn("flex items-center text-xl font-semibold", color)}>
                <Icon className="mr-1 h-4 w-4" />
                {delta > 0 ? "+" : ""}
                {delta.toFixed(2)}
            </div>
        </div>
    );
}

