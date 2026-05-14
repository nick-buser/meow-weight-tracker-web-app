"use client";

import { useState } from "react";
import {
    Activity,
    HeartPulse,
    History,
    Scale,
    StickyNote,
    UtensilsCrossed,
    type LucideIcon,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useWeightUnit } from "~/hooks/use-weight-unit";
import { formatWeight } from "~/lib/units";
import { api, type RouterOutputs } from "~/trpc/react";

type TimelineItem = RouterOutputs["timeline"]["get"][number];
type TimelineKind = TimelineItem["kind"];
type WeightUnit = ReturnType<typeof useWeightUnit>;

const KINDS: { key: TimelineKind; label: string }[] = [
    { key: "weight", label: "Weight" },
    { key: "feeding", label: "Feeding" },
    { key: "activity", label: "Activity" },
    { key: "health", label: "Health" },
    { key: "note", label: "Note" },
];

const ALL_KINDS_ON: Record<TimelineKind, boolean> = {
    weight: true,
    feeding: true,
    activity: true,
    health: true,
    note: true,
};

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

    const [query, setQuery] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [kindFilters, setKindFilters] =
        useState<Record<TimelineKind, boolean>>(ALL_KINDS_ON);

    const anyFilterActive =
        query.trim() !== "" ||
        fromDate !== "" ||
        toDate !== "" ||
        KINDS.some((k) => !kindFilters[k.key]);

    function clearFilters() {
        setQuery("");
        setFromDate("");
        setToDate("");
        setKindFilters(ALL_KINDS_ON);
    }

    const q = query.trim().toLowerCase();
    const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTime = toDate
        ? new Date(`${toDate}T23:59:59.999`).getTime()
        : null;

    const described = (data ?? []).map((item) => ({
        item,
        ...describe(item, unit),
    }));
    const filtered = described.filter(({ item, label, primary, detail }) => {
        if (!kindFilters[item.kind]) return false;
        const t = item.occurredAt.getTime();
        if (fromTime !== null && t < fromTime) return false;
        if (toTime !== null && t > toTime) return false;
        if (q) {
            const haystack =
                `${label} ${primary} ${detail ?? ""}`.toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        return true;
    });

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
                    <>
                        <div className="mb-4 space-y-2">
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search timeline…"
                                aria-label="Search timeline"
                            />
                            <div className="flex flex-wrap gap-1.5">
                                {KINDS.map((k) => (
                                    <Button
                                        key={k.key}
                                        type="button"
                                        size="sm"
                                        variant={
                                            kindFilters[k.key]
                                                ? "secondary"
                                                : "outline"
                                        }
                                        aria-pressed={kindFilters[k.key]}
                                        onClick={() =>
                                            setKindFilters((prev) => ({
                                                ...prev,
                                                [k.key]: !prev[k.key],
                                            }))
                                        }
                                    >
                                        {k.label}
                                    </Button>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label
                                        htmlFor="tl-from"
                                        className="text-xs"
                                    >
                                        From
                                    </Label>
                                    <Input
                                        id="tl-from"
                                        type="date"
                                        value={fromDate}
                                        max={toDate || undefined}
                                        onChange={(e) =>
                                            setFromDate(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label
                                        htmlFor="tl-to"
                                        className="text-xs"
                                    >
                                        To
                                    </Label>
                                    <Input
                                        id="tl-to"
                                        type="date"
                                        value={toDate}
                                        min={fromDate || undefined}
                                        onChange={(e) =>
                                            setToDate(e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                            {anyFilterActive && (
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        Showing {filtered.length} of{" "}
                                        {data.length}
                                    </p>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={clearFilters}
                                    >
                                        Clear filters
                                    </Button>
                                </div>
                            )}
                        </div>
                        {filtered.length === 0 ? (
                            <EmptyState
                                icon={History}
                                title="No matching events"
                                description="Try a different search or widen the filters."
                            />
                        ) : (
                            <ul className="space-y-3">
                                {filtered.map(
                                    ({
                                        item,
                                        icon: Icon,
                                        label,
                                        primary,
                                        detail,
                                    }) => (
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
                                    ),
                                )}
                            </ul>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
