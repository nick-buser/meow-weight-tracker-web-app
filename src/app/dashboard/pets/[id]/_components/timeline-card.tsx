"use client";

import {
    Activity,
    HeartPulse,
    History,
    Scale,
    StickyNote,
    UtensilsCrossed,
    type LucideIcon,
} from "lucide-react";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { useWeightUnit } from "~/hooks/use-weight-unit";
import { formatWeight } from "~/lib/units";
import { api, type RouterOutputs } from "~/trpc/react";

type TimelineItem = RouterOutputs["timeline"]["get"][number];
type WeightUnit = ReturnType<typeof useWeightUnit>;

function describe(
    item: TimelineItem,
    unit: WeightUnit,
): {
    icon: LucideIcon;
    label: string;
    primary: string;
    detail: string | null;
} {
    switch (item.kind) {
        case "weight":
            return {
                icon: Scale,
                label: "Weight",
                primary: `Weighed ${formatWeight(item.weightKg, unit)}`,
                detail: null,
            };
        case "feeding":
            return {
                icon: UtensilsCrossed,
                label: "Feeding",
                primary: `Fed ${item.quantityGrams} g of ${item.foodName}`,
                detail: null,
            };
        case "activity":
            return {
                icon: Activity,
                label: "Activity",
                primary: `${item.activityType} — ${item.durationMinutes} min`,
                detail: item.notes,
            };
        case "health":
            return {
                icon: HeartPulse,
                label: item.eventType,
                primary: item.title,
                detail: item.notes,
            };
        case "note":
            return {
                icon: StickyNote,
                label: "Note",
                primary: item.body,
                detail: null,
            };
    }
}

export function TimelineCard({ petId }: { petId: number }) {
    const { data, isLoading } = api.timeline.get.useQuery({ petId });
    const unit = useWeightUnit();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Timeline
                </CardTitle>
                <CardDescription>
                    Every logged event, newest first.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : !data || data.length === 0 ? (
                    <EmptyState
                        icon={History}
                        title="Nothing logged yet"
                        description="Weigh-ins, feedings, activity, health events, and notes all show up here."
                    />
                ) : (
                    <ul className="space-y-3">
                        {data.map((item) => {
                            const {
                                icon: Icon,
                                label,
                                primary,
                                detail,
                            } = describe(item, unit);
                            return (
                                <li
                                    key={`${item.kind}-${item.id}`}
                                    className="flex gap-3 text-sm"
                                >
                                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                                        <Icon className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-baseline gap-x-2">
                                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                                                {label}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {item.occurredAt.toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 break-words font-medium">
                                            {primary}
                                        </p>
                                        {detail && (
                                            <p className="mt-0.5 break-words text-xs text-muted-foreground">
                                                {detail}
                                            </p>
                                        )}
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
