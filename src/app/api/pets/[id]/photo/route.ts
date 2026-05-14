import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";

import { db } from "~/server/db";
import { env } from "~/env";
import { assertPetAccess } from "~/server/api/petAccess";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

export async function POST(req: Request) {
    const { userId } = auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    if (!env.BLOB_READ_WRITE_TOKEN) {
        return new Response(
            "BLOB_READ_WRITE_TOKEN not configured. Upload disabled.",
            { status: 500 },
        );
    }

    const form = await req.formData();
    const file = form.get("file");
    const petIdRaw = form.get("petId");
    if (!(file instanceof File) || typeof petIdRaw !== "string") {
        return new Response("Bad request", { status: 400 });
    }
    const petId = Number(petIdRaw);
    if (!Number.isFinite(petId) || petId <= 0) {
        return new Response("Bad petId", { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
        return new Response(
            `Image must be 1 byte to ${MAX_BYTES / (1024 * 1024)} MB`,
            { status: 413 },
        );
    }
    if (!ALLOWED.has(file.type)) {
        return new Response(
            "Unsupported file type. Use JPEG, PNG, WebP, or GIF.",
            { status: 415 },
        );
    }

    const role = await assertPetAccess(db, userId, petId).catch(() => null);
    if (role === null || role === "Viewer") {
        return new Response("Forbidden", { status: 403 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const key = `pet-photos/${petId}/${Date.now()}.${ext}`;
    const blob = await put(key, file, {
        access: "public",
        contentType: file.type,
        token: env.BLOB_READ_WRITE_TOKEN,
    });

    return Response.json({ url: blob.url });
}
