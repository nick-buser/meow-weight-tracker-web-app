"use client";

import { useMemo } from "react";
import { Utensils, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "~/lib/utils";
import {
    computePetAlerts,
    type AlertKind,
    type PetAlert,
} from "~/lib/pet-alerts";
import { api } from "~/trpc/react";

const ICONS: Record<AlertKind, typeof Utensils> = {
    hungry: Utensils,
    weightUp: TrendingUp,
    weightDown: TrendingDown,
};

export function PetAlerts({
    petId,
    petName,
}: {
    petId: number;
    petName: string;
}) {
    const feedings = api.feeding.getFeedingHistory.useQuery({ petId });
    const weights = api.weight.getWeightHistory.useQuery({ petId });

    const alerts = useMemo(
        () =>
            computePetAlerts({
                feedings: feedings.data ?? [],
                weights: weights.data ?? [],
                petName,
            }),
        [feedings.data, weights.data, petName],
    );

    if (alerts.length === 0) return null;
    return (
        <div className="space-y-2">
            {alerts.map((a, i) => (
                <AlertItem key={i} alert={a} />
            ))}
        </div>
    );
}

function AlertItem({ alert }: { alert: PetAlert }) {
    const Icon = ICONS[alert.kind];
    return (
        <div
            className={cn(
                "flex items-center gap-3 rounded-md border-l-4 bg-muted px-3 py-2 text-sm",
                alert.severity === "alert" &&
                    "border-l-destructive bg-destructive/5",
                alert.severity === "warn" &&
                    "border-l-orange-500 bg-orange-500/5",
                alert.severity === "info" && "border-l-primary bg-primary/5",
            )}
        >
            <Icon
                className={cn(
                    "h-4 w-4 shrink-0",
                    alert.severity === "alert" && "text-destructive",
                    alert.severity === "warn" && "text-orange-600",
                )}
            />
            <span>{alert.text}</span>
        </div>
    );
}
