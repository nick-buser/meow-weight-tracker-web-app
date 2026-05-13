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
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/react";

type Reading = RouterOutputs["weight"]["getWeightHistory"][number];

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

    const stats = useMemo(() => computeStats(data ?? [], goalWeight), [
        data,
        goalWeight,
    ]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Trend</CardTitle>
                <CardDescription>{petName}&apos;s weight trajectory</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
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

function computeStats(rows: Reading[], goalWeight: number | null) {
    if (rows.length === 0) return null;
    const sorted = [...rows].sort(
        (a, b) => a.weighedAt.getTime() - b.weighedAt.getTime(),
    );
    const latest = sorted[sorted.length - 1]!;
    if (sorted.length === 1) {
        return {
            latest: latest.weight,
            delta7: null as number | null,
            delta30: null as number | null,
            daysToGoal: null as number | null,
            goalDate: null as Date | null,
        };
    }

    const now = Date.now();
    const findClosestBefore = (cutoffMs: number) => {
        const candidate = [...sorted]
            .reverse()
            .find((r) => r.weighedAt.getTime() <= cutoffMs);
        return candidate ?? sorted[0]!;
    };
    const ref7 = findClosestBefore(now - 7 * 86400000);
    const ref30 = findClosestBefore(now - 30 * 86400000);
    const delta7 =
        ref7.id === latest.id ? null : latest.weight - ref7.weight;
    const delta30 =
        ref30.id === latest.id ? null : latest.weight - ref30.weight;

    let daysToGoal: number | null = null;
    let goalDate: Date | null = null;
    if (goalWeight !== null) {
        // Slope (weight per day) from the last 30 days of readings.
        const cutoff = now - 30 * 86400000;
        const recent = sorted.filter((r) => r.weighedAt.getTime() >= cutoff);
        const span = recent.length >= 2 ? recent : sorted;
        if (span.length >= 2) {
            const first = span[0]!;
            const last = span[span.length - 1]!;
            const dwDays =
                (last.weighedAt.getTime() - first.weighedAt.getTime()) /
                86400000;
            if (dwDays > 0) {
                const slope = (last.weight - first.weight) / dwDays;
                const remaining = goalWeight - latest.weight;
                if (Math.sign(remaining) === Math.sign(slope) && slope !== 0) {
                    const days = remaining / slope;
                    daysToGoal = Math.round(days);
                    goalDate = new Date(now + days * 86400000);
                } else if (Math.abs(remaining) < 0.01) {
                    daysToGoal = 0;
                    goalDate = new Date();
                } else {
                    daysToGoal = -1;
                }
            }
        }
    }

    return {
        latest: latest.weight,
        delta7,
        delta30,
        daysToGoal,
        goalDate,
    };
}
