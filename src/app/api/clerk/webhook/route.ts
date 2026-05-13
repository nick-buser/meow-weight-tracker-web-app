import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { Webhook } from "svix";

import { env } from "~/env";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";

type ClerkEvent = {
    type: string;
    data: { id: string };
};

export async function POST(req: Request) {
    if (!env.CLERK_WEBHOOK_SECRET) {
        return new Response("CLERK_WEBHOOK_SECRET not configured", {
            status: 500,
        });
    }

    const h = headers();
    const svixId = h.get("svix-id");
    const svixTimestamp = h.get("svix-timestamp");
    const svixSignature = h.get("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) {
        return new Response("Missing svix headers", { status: 400 });
    }

    const body = await req.text();
    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
    let event: ClerkEvent;
    try {
        event = wh.verify(body, {
            "svix-id": svixId,
            "svix-timestamp": svixTimestamp,
            "svix-signature": svixSignature,
        }) as ClerkEvent;
    } catch {
        return new Response("Signature verification failed", { status: 400 });
    }

    switch (event.type) {
        case "user.created":
            await db
                .insert(users)
                .values({ id: event.data.id })
                .onConflictDoNothing();
            break;
        case "user.updated":
            await db
                .update(users)
                .set({ updatedAt: new Date() })
                .where(eq(users.id, event.data.id));
            break;
        // user.deleted: leave the row to preserve petPeople FK integrity.
        default:
            break;
    }

    return new Response("OK", { status: 200 });
}
