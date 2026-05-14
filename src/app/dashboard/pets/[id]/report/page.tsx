import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { TRPCError } from "@trpc/server";

import { Button } from "~/components/ui/button";
import { PetAvatar } from "~/components/ui/pet-avatar";
import { PrintButton } from "~/app/dashboard/pets/[id]/report/_components/print-button";
import { formatWeight } from "~/lib/units";
import { api } from "~/trpc/server";

const SECTION_TITLE =
    "mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground";
const TH =
    "border-b py-1.5 pr-4 text-left text-xs font-medium uppercase text-muted-foreground";
const TD = "border-b border-border/60 py-1.5 pr-4 align-top";
const EMPTY = "text-sm text-muted-foreground";

function ageLabel(birthDate: string | null): string | null {
    if (!birthDate) return null;
    const born = new Date(birthDate);
    const now = new Date();
    const months =
        (now.getFullYear() - born.getFullYear()) * 12 +
        (now.getMonth() - born.getMonth());
    if (months < 12) return `${months} mo old`;
    return `${Math.floor(months / 12)} yr old`;
}

function frequencyLabel(hours: number): string {
    if (hours % 24 === 0) {
        const days = hours / 24;
        return days === 1 ? "Daily" : `Every ${days} days`;
    }
    return `Every ${hours}h`;
}

export async function generateMetadata({
    params,
}: {
    params: { id: string };
}) {
    const petId = Number(params.id);
    if (!Number.isFinite(petId) || petId <= 0) {
        return { title: "Health report" };
    }
    try {
        const pet = await api.pet.getPet({ petId });
        return { title: `${pet.name} — Health report` };
    } catch {
        return { title: "Health report" };
    }
}

export default async function PetReportPage({
    params,
}: {
    params: { id: string };
}) {
    const petId = Number(params.id);
    if (!Number.isFinite(petId) || petId <= 0) notFound();

    let pet;
    try {
        pet = await api.pet.getPet({ petId });
    } catch (err) {
        if (
            err instanceof TRPCError &&
            (err.code === "FORBIDDEN" || err.code === "NOT_FOUND")
        ) {
            notFound();
        }
        throw err;
    }

    const [weights, healthEvents, appointments, meds, notes, prefs] =
        await Promise.all([
            api.weight.getWeightHistory({ petId }),
            api.health.getHistory({ petId }),
            api.appointments.list({ petId }),
            api.meds.list({ petId }),
            api.notes.getNotes({ petId }),
            api.preferences.get(),
        ]);

    const unit = prefs.weightUnit;
    const latest = weights[weights.length - 1] ?? null;
    const recentWeights = [...weights].reverse();
    const WEIGHT_ROW_CAP = 30;
    const shownWeights = recentWeights.slice(0, WEIGHT_ROW_CAP);
    const now = Date.now();
    const activeMeds = meds.filter(
        (m) => m.endsAt === null || m.endsAt.getTime() > now,
    ).length;

    return (
        <div className="mx-auto max-w-3xl space-y-8">
            <div className="flex items-center justify-between print:hidden">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link href={`/dashboard/pets/${pet.id}`}>
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Back to {pet.name}
                    </Link>
                </Button>
                <PrintButton />
            </div>

            <header className="flex items-start gap-4 border-b pb-6">
                <PetAvatar
                    name={pet.name}
                    photoUrl={pet.photoUrl}
                    size="lg"
                />
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">
                        {pet.name} — Health report
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {[pet.species, pet.gender, ageLabel(pet.birthDate)]
                            .filter(Boolean)
                            .join(" · ")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Generated {new Date().toLocaleString()}
                    </p>
                </div>
            </header>

            <section>
                <h2 className={SECTION_TITLE}>Summary</h2>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                    {[
                        {
                            label: "Current weight",
                            value: latest
                                ? formatWeight(latest.weight, unit)
                                : "—",
                        },
                        {
                            label: "Goal weight",
                            value:
                                pet.goalWeight !== null
                                    ? formatWeight(pet.goalWeight, unit)
                                    : "—",
                        },
                        {
                            label: "Daily kcal target",
                            value:
                                pet.dailyKcalTarget !== null
                                    ? `${pet.dailyKcalTarget} kcal`
                                    : "—",
                        },
                        {
                            label: "Weigh-ins",
                            value: String(weights.length),
                        },
                        {
                            label: "Health events",
                            value: String(healthEvents.length),
                        },
                        {
                            label: "Active medications",
                            value: String(activeMeds),
                        },
                    ].map((stat) => (
                        <div key={stat.label}>
                            <dt className="text-xs text-muted-foreground">
                                {stat.label}
                            </dt>
                            <dd className="font-medium">{stat.value}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section>
                <h2 className={SECTION_TITLE}>
                    Weight history
                    {weights.length > WEIGHT_ROW_CAP &&
                        ` — most recent ${WEIGHT_ROW_CAP} of ${weights.length}`}
                </h2>
                {shownWeights.length === 0 ? (
                    <p className={EMPTY}>No weigh-ins recorded.</p>
                ) : (
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className={TH}>Date</th>
                                <th className={TH}>Weight</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shownWeights.map((w) => (
                                <tr key={w.id}>
                                    <td className={TD}>
                                        {w.weighedAt.toLocaleDateString()}
                                    </td>
                                    <td className={TD}>
                                        {formatWeight(w.weight, unit)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            <section>
                <h2 className={SECTION_TITLE}>Health events</h2>
                {healthEvents.length === 0 ? (
                    <p className={EMPTY}>No health events recorded.</p>
                ) : (
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className={TH}>Date</th>
                                <th className={TH}>Type</th>
                                <th className={TH}>Event</th>
                            </tr>
                        </thead>
                        <tbody>
                            {healthEvents.map((e) => (
                                <tr key={e.id}>
                                    <td className={TD}>
                                        {e.occurredAt.toLocaleDateString()}
                                    </td>
                                    <td className={TD}>{e.eventType}</td>
                                    <td className={TD}>
                                        <span className="font-medium">
                                            {e.title}
                                        </span>
                                        {e.notes && (
                                            <span className="block text-xs text-muted-foreground">
                                                {e.notes}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            <section>
                <h2 className={SECTION_TITLE}>Appointments</h2>
                {appointments.length === 0 ? (
                    <p className={EMPTY}>No appointments recorded.</p>
                ) : (
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className={TH}>Date</th>
                                <th className={TH}>Type</th>
                                <th className={TH}>Appointment</th>
                                <th className={TH}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.map((a) => (
                                <tr key={a.id}>
                                    <td className={TD}>
                                        {a.scheduledFor.toLocaleString()}
                                    </td>
                                    <td className={TD}>
                                        {a.appointmentType}
                                    </td>
                                    <td className={TD}>
                                        <span className="font-medium">
                                            {a.title}
                                        </span>
                                        {a.location && (
                                            <span className="block text-xs text-muted-foreground">
                                                {a.location}
                                            </span>
                                        )}
                                        {a.notes && (
                                            <span className="block text-xs text-muted-foreground">
                                                {a.notes}
                                            </span>
                                        )}
                                    </td>
                                    <td className={TD}>{a.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            <section>
                <h2 className={SECTION_TITLE}>Medications</h2>
                {meds.length === 0 ? (
                    <p className={EMPTY}>No medications recorded.</p>
                ) : (
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className={TH}>Medication</th>
                                <th className={TH}>Dosage</th>
                                <th className={TH}>Frequency</th>
                                <th className={TH}>Started</th>
                                <th className={TH}>Ends</th>
                            </tr>
                        </thead>
                        <tbody>
                            {meds.map((m) => (
                                <tr key={m.id}>
                                    <td className={TD}>
                                        <span className="font-medium">
                                            {m.name}
                                        </span>
                                        {m.notes && (
                                            <span className="block text-xs text-muted-foreground">
                                                {m.notes}
                                            </span>
                                        )}
                                    </td>
                                    <td className={TD}>{m.dosage ?? "—"}</td>
                                    <td className={TD}>
                                        {frequencyLabel(m.frequencyHours)}
                                    </td>
                                    <td className={TD}>
                                        {m.startsAt.toLocaleDateString()}
                                    </td>
                                    <td className={TD}>
                                        {m.endsAt
                                            ? m.endsAt.toLocaleDateString()
                                            : "Ongoing"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            <section>
                <h2 className={SECTION_TITLE}>Notes</h2>
                {notes.length === 0 ? (
                    <p className={EMPTY}>No notes recorded.</p>
                ) : (
                    <ul className="space-y-2 text-sm">
                        {notes.map((n) => (
                            <li
                                key={n.id}
                                className="border-b border-border/60 pb-2 last:border-0"
                            >
                                <div className="text-xs text-muted-foreground">
                                    {n.writtenAt.toLocaleString()}
                                </div>
                                <p className="whitespace-pre-wrap break-words">
                                    {n.body}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
