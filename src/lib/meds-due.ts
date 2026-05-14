export type MedForDue = {
    startsAt: Date;
    endsAt: Date | null;
    lastGivenAt: Date | null;
    frequencyHours: number;
};

/**
 * Returns true if the med is currently due: it has started, hasn't ended,
 * and either has never been given or enough time has passed since the
 * last dose.
 */
export function isMedDue(med: MedForDue, now: Date = new Date()): boolean {
    const t = now.getTime();
    if (med.startsAt.getTime() > t) return false;
    if (med.endsAt !== null && med.endsAt.getTime() < t) return false;
    if (med.lastGivenAt === null) return true;
    const gapHours = (t - med.lastGivenAt.getTime()) / 3_600_000;
    return gapHours >= med.frequencyHours;
}

/**
 * Returns the next due timestamp for the med, or null if it's ended.
 */
export function nextDueAt(
    med: MedForDue,
    now: Date = new Date(),
): Date | null {
    if (med.endsAt !== null && med.endsAt.getTime() < now.getTime()) {
        return null;
    }
    const base = med.lastGivenAt ?? med.startsAt;
    return new Date(base.getTime() + med.frequencyHours * 3_600_000);
}
