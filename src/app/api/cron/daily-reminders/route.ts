import { clerkClient } from "@clerk/nextjs/server";
import { and, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { Resend } from "resend";

import { env } from "~/env";
import { db } from "~/server/db";
import {
    eatingHistory,
    petAppointments,
    petPeople,
    pets,
    userPreferences,
} from "~/server/db/schema";

export const dynamic = "force-dynamic";

const HUNGRY_HOURS = 18;
const APPOINTMENT_LOOKAHEAD_HOURS = 24;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatInTimeZone(date: Date, timeZone: string): string {
    try {
        return new Intl.DateTimeFormat("en-US", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone,
        }).format(date);
    } catch {
        return date.toUTCString();
    }
}

type Recipient = { email: string; userId: string };

async function recipientsForPet(petId: number): Promise<Recipient[]> {
    const rows = await db
        .select({ userId: petPeople.userId, role: petPeople.role })
        .from(petPeople)
        .where(eq(petPeople.petId, petId));
    const wanted = rows
        .filter((r) => r.role !== "Viewer")
        .map((r) => r.userId);
    if (wanted.length === 0) return [];
    try {
        const result = await clerkClient.users.getUserList({
            userId: wanted,
            limit: wanted.length,
        });
        const users = Array.isArray(result)
            ? result
            : ((result as { data?: unknown }).data ?? []);
        const out: Recipient[] = [];
        for (const u of users as Array<{
            id: string;
            emailAddresses: Array<{
                emailAddress: string;
                id?: string;
            }>;
            primaryEmailAddressId: string | null;
        }>) {
            const primary =
                u.emailAddresses.find(
                    (e) => e.id === u.primaryEmailAddressId,
                ) ?? u.emailAddresses[0];
            if (primary?.emailAddress) {
                out.push({ email: primary.emailAddress, userId: u.id });
            }
        }
        return out;
    } catch (err) {
        console.error("Clerk getUserList failed in cron", err);
        return [];
    }
}

export async function GET(req: Request) {
    // Vercel cron passes Authorization: Bearer <CRON_SECRET>.
    if (env.CRON_SECRET) {
        const auth = req.headers.get("authorization");
        if (auth !== `Bearer ${env.CRON_SECRET}`) {
            return new Response("Unauthorized", { status: 401 });
        }
    }
    if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
        return new Response(
            "RESEND_API_KEY / RESEND_FROM not configured; cron is a no-op.",
            { status: 200 },
        );
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const now = Date.now();
    const cutoff = new Date(now - HUNGRY_HOURS * 3_600_000);

    // One pass over preferences: the opt-out set for gating reminders, and
    // a timezone lookup so appointment times render in each user's zone. A
    // missing preferences row means the defaults (enabled, UTC).
    const prefRows = await db
        .select({
            userId: userPreferences.userId,
            dailyRemindersEnabled: userPreferences.dailyRemindersEnabled,
            timezone: userPreferences.timezone,
        })
        .from(userPreferences);
    const optedOut = new Set(
        prefRows.filter((r) => !r.dailyRemindersEnabled).map((r) => r.userId),
    );
    const timezoneByUser = new Map(
        prefRows.map((r) => [r.userId, r.timezone]),
    );

    const allPets = await db
        .select({ id: pets.id, name: pets.name })
        .from(pets)
        .where(isNull(pets.deletedAt));

    const summary: { petId: number; sent: number; reason: string }[] = [];
    for (const pet of allPets) {
        const [lastFeeding] = await db
            .select({ fedAt: eatingHistory.fedAt })
            .from(eatingHistory)
            .where(eq(eatingHistory.petId, pet.id))
            .orderBy(desc(eatingHistory.fedAt))
            .limit(1);
        if (!lastFeeding || lastFeeding.fedAt > cutoff) {
            summary.push({
                petId: pet.id,
                sent: 0,
                reason: lastFeeding ? "recent" : "no-feedings",
            });
            continue;
        }
        const hours = Math.floor(
            (now - lastFeeding.fedAt.getTime()) / 3_600_000,
        );
        const allRecipients = await recipientsForPet(pet.id);
        const recipients = allRecipients.filter(
            (r) => !optedOut.has(r.userId),
        );
        if (recipients.length === 0) {
            summary.push({
                petId: pet.id,
                sent: 0,
                reason:
                    allRecipients.length > 0
                        ? "all-opted-out"
                        : "no-recipients",
            });
            continue;
        }
        const subject = `${pet.name} hasn't been fed in ${hours}h`;
        const html = `<p>Heads up: <strong>${escapeHtml(
            pet.name,
        )}</strong> hasn't been fed in ${hours} hours.</p><p>Log a feeding from the Meow Weight Tracker dashboard.</p>`;
        let sent = 0;
        for (const r of recipients) {
            try {
                await resend.emails.send({
                    from: env.RESEND_FROM,
                    to: r.email,
                    subject,
                    html,
                });
                sent += 1;
            } catch (err) {
                console.error(`Resend send failed for ${r.email}`, err);
            }
        }
        summary.push({ petId: pet.id, sent, reason: "hungry" });
    }

    // --- Upcoming appointment reminders ---------------------------------
    // Scheduled appointments landing within the next lookahead window. The
    // daily cadence plus a 24h window means each appointment is reminded
    // about roughly once, the day before it happens.
    const lookaheadEnd = new Date(
        now + APPOINTMENT_LOOKAHEAD_HOURS * 3_600_000,
    );
    const upcomingAppointments = await db
        .select({
            id: petAppointments.id,
            petId: petAppointments.petId,
            petName: pets.name,
            title: petAppointments.title,
            appointmentType: petAppointments.appointmentType,
            scheduledFor: petAppointments.scheduledFor,
            location: petAppointments.location,
        })
        .from(petAppointments)
        .innerJoin(pets, eq(pets.id, petAppointments.petId))
        .where(
            and(
                eq(petAppointments.status, "Scheduled"),
                isNull(pets.deletedAt),
                gte(petAppointments.scheduledFor, new Date(now)),
                lt(petAppointments.scheduledFor, lookaheadEnd),
            ),
        );

    const appointmentsByPet = new Map<
        number,
        typeof upcomingAppointments
    >();
    for (const appt of upcomingAppointments) {
        const list = appointmentsByPet.get(appt.petId) ?? [];
        list.push(appt);
        appointmentsByPet.set(appt.petId, list);
    }

    const appointmentSummary: {
        appointmentId: number;
        petId: number;
        sent: number;
    }[] = [];
    for (const [petId, appts] of appointmentsByPet) {
        const recipients = (await recipientsForPet(petId)).filter(
            (r) => !optedOut.has(r.userId),
        );
        for (const appt of appts) {
            let sent = 0;
            for (const r of recipients) {
                const when = formatInTimeZone(
                    appt.scheduledFor,
                    timezoneByUser.get(r.userId) ?? "UTC",
                );
                const locationLine = appt.location
                    ? `<p>Location: ${escapeHtml(appt.location)}</p>`
                    : "";
                try {
                    await resend.emails.send({
                        from: env.RESEND_FROM,
                        to: r.email,
                        subject: `Upcoming appointment for ${appt.petName}: ${appt.title}`,
                        html: `<p><strong>${escapeHtml(
                            appt.petName,
                        )}</strong> has an upcoming appointment:</p><p><strong>${escapeHtml(
                            appt.title,
                        )}</strong> (${escapeHtml(
                            appt.appointmentType,
                        )})<br/>${when}</p>${locationLine}<p>View it on the Meow Weight Tracker dashboard.</p>`,
                    });
                    sent += 1;
                } catch (err) {
                    console.error(
                        `Resend appointment send failed for ${r.email}`,
                        err,
                    );
                }
            }
            appointmentSummary.push({
                appointmentId: appt.id,
                petId,
                sent,
            });
        }
    }

    return Response.json({
        ranAt: new Date(now).toISOString(),
        summary,
        appointmentSummary,
    });
}
