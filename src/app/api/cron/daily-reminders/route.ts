import { clerkClient } from "@clerk/nextjs/server";
import { desc, eq, isNull } from "drizzle-orm";
import { Resend } from "resend";

import { env } from "~/env";
import { db } from "~/server/db";
import {
    eatingHistory,
    petPeople,
    pets,
} from "~/server/db/schema";

export const dynamic = "force-dynamic";

const HUNGRY_HOURS = 18;

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
        const recipients = await recipientsForPet(pet.id);
        if (recipients.length === 0) {
            summary.push({ petId: pet.id, sent: 0, reason: "no-recipients" });
            continue;
        }
        const subject = `${pet.name} hasn't been fed in ${hours}h`;
        const html = `<p>Heads up: <strong>${pet.name}</strong> hasn't been fed in ${hours} hours.</p><p>Log a feeding from the Meow Weight Tracker dashboard.</p>`;
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

    return Response.json({ ranAt: new Date(now).toISOString(), summary });
}
