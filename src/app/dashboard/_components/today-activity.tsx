"use client";

import { useMemo } from "react";
import { Activity, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { api } from "~/trpc/react";

export function TodayActivity({
    petId,
    petName,
    canEdit = true,
}: {
    petId: number;
    petName: string;
    canEdit?: boolean;
}) {
    const { data, isLoading } = api.activity.getHistory.useQuery({ petId });
    const utils = api.useUtils();
    const deleteEntry = api.activity.deleteEntry.useMutation({
        onSuccess: async () => {
            await utils.activity.getHistory.invalidate({ petId });
            toast.success("Activity deleted");
        },
        onError: (err) => toast.error(err.message),
    });

    const today = useMemo(() => {
        if (!data) return [];
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return data.filter((row) => {
            const t = row.performedAt.getTime();
            return t >= start.getTime() && t < end.getTime();
        });
    }, [data]);

    const totalMinutes = today.reduce((sum, r) => sum + r.durationMinutes, 0);

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle>Today&apos;s activity</CardTitle>
                    <CardDescription>
                        {petName} · {today.length}{" "}
                        {today.length === 1 ? "session" : "sessions"}
                    </CardDescription>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-semibold">{totalMinutes}</div>
                    <div className="text-xs text-muted-foreground">min today</div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : today.length === 0 ? (
                    <EmptyState
                        icon={Activity}
                        title="Nothing logged today"
                        description="Record a walk or play session to track it here."
                    />
                ) : (
                    <ul className="space-y-2">
                        {today.map((row) => (
                            <li
                                key={row.id}
                                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium">
                                        {row.activityType}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {row.performedAt.toLocaleTimeString([], {
                                            hour: "numeric",
                                            minute: "2-digit",
                                        })}
                                        {row.notes ? ` · ${row.notes}` : ""}
                                    </div>
                                </div>
                                <div className="text-sm font-medium">
                                    {row.durationMinutes} min
                                </div>
                                {canEdit && (
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        disabled={deleteEntry.isPending}
                                        onClick={() => {
                                            if (!confirm("Delete this activity?")) return;
                                            deleteEntry.mutate({ entryId: row.id });
                                        }}
                                        aria-label="Delete activity"
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
