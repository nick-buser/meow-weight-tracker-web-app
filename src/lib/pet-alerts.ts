export type AlertSeverity = "info" | "warn" | "alert";
export type AlertKind = "hungry" | "weightUp" | "weightDown";

export type PetAlert = {
    severity: AlertSeverity;
    kind: AlertKind;
    text: string;
};

export type FeedingForAlerts = { fedAt: Date };
export type WeightForAlerts = {
    id: number;
    weight: number;
    weighedAt: Date;
};

export const HUNGRY_THRESHOLD_HOURS = 18;
export const HUNGRY_ALERT_HOURS = 24;
export const WEIGHT_WARN_PCT = 5;
export const WEIGHT_ALERT_PCT = 10;

/**
 * Pure compute used by PetAlerts. Feedings are expected in descending
 * fedAt order (latest first); weights may be in any order.
 */
export function computePetAlerts({
    feedings,
    weights,
    petName,
    now = Date.now(),
}: {
    feedings: ReadonlyArray<FeedingForAlerts>;
    weights: ReadonlyArray<WeightForAlerts>;
    petName: string;
    now?: number;
}): PetAlert[] {
    const out: PetAlert[] = [];

    const last = feedings[0];
    if (last) {
        const hours = (now - last.fedAt.getTime()) / 3_600_000;
        if (hours >= HUNGRY_THRESHOLD_HOURS) {
            out.push({
                severity: hours >= HUNGRY_ALERT_HOURS ? "alert" : "warn",
                kind: "hungry",
                text: `${petName} hasn't been fed in ${Math.floor(hours)}h.`,
            });
        }
    }

    if (weights.length >= 2) {
        const sorted = [...weights].sort(
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
                out.push({
                    severity: abs >= WEIGHT_ALERT_PCT ? "alert" : "warn",
                    kind: pct > 0 ? "weightUp" : "weightDown",
                    text: `${petName}'s weight is ${
                        pct > 0 ? "up" : "down"
                    } ${abs.toFixed(1)}% over the last week.`,
                });
            }
        }
    }

    return out;
}
