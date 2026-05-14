"use client";

import { useMemo } from "react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { computeFeedingHeatmap } from "~/lib/feeding-heatmap";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const LEVEL_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: "bg-muted",
    1: "bg-orange-200 dark:bg-orange-900/40",
    2: "bg-orange-300 dark:bg-orange-800/60",
    3: "bg-orange-400 dark:bg-orange-700/80",
    4: "bg-orange-500 dark:bg-orange-600",
};

export function FeedingHeatmapCard({ petId }: { petId: number }) {
    const { data, isLoading } = api.feeding.getFeedingHistory.useQuery({
        petId,
    });
    const { cells, total } = useMemo(
        () => computeFeedingHeatmap(data ?? [], 365),
        [data],
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Feeding heatmap</CardTitle>
                <CardDescription>
                    Last 12 months · {total}{" "}
                    {total === 1 ? "feeding" : "feedings"} logged
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-24 w-full" />
                ) : (
                    <div className="overflow-x-auto">
                        <div
                            className="flex gap-[2px]"
                            role="img"
                            aria-label={`Feeding activity heatmap for the last 12 months — ${total} ${
                                total === 1 ? "feeding" : "feedings"
                            } logged.`}
                        >
                            {cells.map((week, wi) => (
                                <div
                                    key={wi}
                                    className="flex flex-col gap-[2px]"
                                >
                                    {week.map((cell) => (
                                        <div
                                            key={cell.dayKey}
                                            title={`${cell.date.toLocaleDateString()}: ${cell.count} ${cell.count === 1 ? "feeding" : "feedings"}`}
                                            className={cn(
                                                "h-2.5 w-2.5 rounded-[2px]",
                                                LEVEL_CLASSES[cell.level],
                                            )}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Less</span>
                            {[0, 1, 2, 3, 4].map((l) => (
                                <span
                                    key={l}
                                    className={cn(
                                        "h-2.5 w-2.5 rounded-[2px]",
                                        LEVEL_CLASSES[l as 0 | 1 | 2 | 3 | 4],
                                    )}
                                />
                            ))}
                            <span>More</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
