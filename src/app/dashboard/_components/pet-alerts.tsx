"use client";

import { useMemo } from "react";
import {
    type AlertTriangle,
    Utensils,
    TrendingDown,
    TrendingUp,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

type Severity = "info" | "warn" | "alert";

type Alert = {
    severity: Severity;
    icon: typeof AlertTriangle;
    text: string;
};

const HUNGRY_THRESHOLD_HOURS = 18;
const WEIGHT_WARN_PCT = 5;
const WEIGHT_ALERT_PCT = 10;

export function PetAlerts({
    petId,
    petName,
}: {
    petId: number;
    petName: string;
}) {
    const feedings = api.feeding.getFeedingHistory.useQuery({ petId });
    const weights = api.weight.getWeightHistory.useQuery({ petId });

    const alerts = useMemo<Alert[]>(() => {
        const out: Alert[] = [];
        const now = Date.now();

        if (feedings.data && feedings.data.length > 0) {
            const last = feedings.data[0]!; // desc-ordered
            const hours = (now - last.fedAt.getTime()) / 3_600_000;
            if (hours >= HUNGRY_THRESHOLD_HOURS) {
                out.push({
                    severity: hours >= 24 ? "alert" : "warn",
                    icon: Utensils,
                    text: `${petName} hasn't been fed in ${Math.floor(hours)}h.`,
                });
            }
        }

        if (weights.data && weights.data.length >= 2) {
            const sorted = [...weights.data].sort(
                (a, b) => a.weighedAt.getTime() - b.weighedAt.getTime(),
            );
            const latest = sorted[sorted.length - 1]!;
            const cutoff = now - 7 * 86_400_000;
            const ref =
                [...sorted]
                    .reverse()
                    .find((r) => r.weighedAt.getTime() <= cutoff) ?? sorted[0]!;
            if (ref.id !== latest.id && ref.weight > 0) {
                const pct = ((latest.weight - ref.weight) / ref.weight) * 100;
                const abs = Math.abs(pct);
                if (abs >= WEIGHT_WARN_PCT) {
                    const Icon = pct > 0 ? TrendingUp : TrendingDown;
                    out.push({
                        severity: abs >= WEIGHT_ALERT_PCT ? "alert" : "warn",
                        icon: Icon,
                        text: `${petName}'s weight is ${pct > 0 ? "up" : "down"} ${abs.toFixed(1)}% over the last week.`,
                    });
                }
            }
        }

        return out;
    }, [feedings.data, weights.data, petName]);

    if (alerts.length === 0) return null;

    return (
        <div className="space-y-2">
            {alerts.map((a, i) => (
                <AlertItem key={i} alert={a} />
            ))}
        </div>
    );
}

function AlertItem({ alert }: { alert: Alert }) {
    const Icon = alert.icon;
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
