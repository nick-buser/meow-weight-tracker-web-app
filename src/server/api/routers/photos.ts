import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { del } from "@vercel/blob";
import { z } from "zod";

import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { petPhotos, pets } from "~/server/db/schema";
import { addPetPhotoInput } from "~/schema/addPetPhotoInput";
import { assertPetAccess } from "~/server/api/petAccess";
import { enforceRateLimit } from "~/server/api/ratelimit";

async function loadPhoto(database: typeof db, photoId: number) {
    const [row] = await database
        .select()
        .from(petPhotos)
        .where(eq(petPhotos.id, photoId))
        .limit(1);
    if (!row) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Photo not found.",
        });
    }
    return row;
}

export const photosRouter = createTRPCRouter({
    list: protectedProcedure
        .input(z.object({ petId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
            await assertPetAccess(ctx.db, ctx.userId, input.petId);
            return ctx.db
                .select()
                .from(petPhotos)
                .where(eq(petPhotos.petId, input.petId))
                .orderBy(desc(petPhotos.takenAt));
        }),

    add: protectedProcedure
        .input(addPetPhotoInput)
        .mutation(async ({ ctx, input }) => {
            await enforceRateLimit("addPhoto", ctx.userId, 60, "1 h");
            const role = await assertPetAccess(ctx.db, ctx.userId, input.petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot add photos.",
                });
            }
            const [row] = await ctx.db
                .insert(petPhotos)
                .values({
                    petId: input.petId,
                    url: input.url,
                    caption: input.caption ?? null,
                    takenAt: input.takenAt ?? new Date(),
                    uploadedBy: ctx.userId,
                })
                .returning();
            if (!row) throw new Error("Failed to add photo.");
            return row;
        }),

    remove: protectedProcedure
        .input(z.object({ photoId: z.number().int().positive() }))
        .mutation(async ({ ctx, input }) => {
            const photo = await loadPhoto(ctx.db, input.photoId);
            const role = await assertPetAccess(ctx.db, ctx.userId, photo.petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot delete photos.",
                });
            }
            await ctx.db
                .delete(petPhotos)
                .where(eq(petPhotos.id, input.photoId));
            // If this photo was also the pet's avatar, clear it so the UI
            // doesn't keep pointing at a now-deleted gallery entry.
            await ctx.db
                .update(pets)
                .set({ photoUrl: null, updatedAt: new Date() })
                .where(
                    and(
                        eq(pets.id, photo.petId),
                        eq(pets.photoUrl, photo.url),
                    ),
                );
            // Best-effort: drop the underlying Blob object so removed
            // photos don't linger in storage. A failure here (missing
            // token, an already-gone object, a non-Blob url) must not
            // fail the mutation — the DB row is already deleted.
            if (env.BLOB_READ_WRITE_TOKEN) {
                try {
                    await del(photo.url, {
                        token: env.BLOB_READ_WRITE_TOKEN,
                    });
                } catch (err) {
                    console.error(
                        `Failed to delete blob for photo ${photo.id}`,
                        err,
                    );
                }
            }
            return { ok: true as const };
        }),

    setPrimary: protectedProcedure
        .input(z.object({ photoId: z.number().int().positive() }))
        .mutation(async ({ ctx, input }) => {
            const photo = await loadPhoto(ctx.db, input.photoId);
            const role = await assertPetAccess(ctx.db, ctx.userId, photo.petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot change the primary photo.",
                });
            }
            await ctx.db
                .update(pets)
                .set({ photoUrl: photo.url, updatedAt: new Date() })
                .where(eq(pets.id, photo.petId));
            return { ok: true as const };
        }),
});
