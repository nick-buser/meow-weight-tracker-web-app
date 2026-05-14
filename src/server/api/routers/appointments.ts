import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import { petAppointments } from "~/server/db/schema";
import { createAppointmentInput } from "~/schema/createAppointmentInput";
import {
    appointmentStatusSchema,
    updateAppointmentInput,
} from "~/schema/updateAppointmentInput";
import { assertPetAccess } from "~/server/api/petAccess";
import { enforceRateLimit } from "~/server/api/ratelimit";

async function loadAppointmentPetId(
    database: typeof db,
    appointmentId: number,
): Promise<number> {
    const [row] = await database
        .select({ petId: petAppointments.petId })
        .from(petAppointments)
        .where(eq(petAppointments.id, appointmentId))
        .limit(1);
    if (!row) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Appointment not found.",
        });
    }
    return row.petId;
}

export const appointmentsRouter = createTRPCRouter({
    list: protectedProcedure
        .input(z.object({ petId: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
            await assertPetAccess(ctx.db, ctx.userId, input.petId);
            return ctx.db
                .select()
                .from(petAppointments)
                .where(eq(petAppointments.petId, input.petId))
                .orderBy(desc(petAppointments.scheduledFor));
        }),

    create: protectedProcedure
        .input(createAppointmentInput)
        .mutation(async ({ ctx, input }) => {
            await enforceRateLimit(
                "createAppointment",
                ctx.userId,
                20,
                "1 h",
            );
            const role = await assertPetAccess(
                ctx.db,
                ctx.userId,
                input.petId,
            );
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot add appointments.",
                });
            }
            const [row] = await ctx.db
                .insert(petAppointments)
                .values({
                    petId: input.petId,
                    title: input.title,
                    appointmentType: input.appointmentType,
                    scheduledFor: input.scheduledFor,
                    location: input.location ?? null,
                    notes: input.notes ?? null,
                    createdBy: ctx.userId,
                })
                .returning();
            if (!row) throw new Error("Failed to create appointment.");
            return row;
        }),

    updateEntry: protectedProcedure
        .input(updateAppointmentInput)
        .mutation(async ({ ctx, input }) => {
            const petId = await loadAppointmentPetId(
                ctx.db,
                input.appointmentId,
            );
            const role = await assertPetAccess(ctx.db, ctx.userId, petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot edit appointments.",
                });
            }
            const patch: Record<string, unknown> = { updatedAt: new Date() };
            if (input.title !== undefined) patch.title = input.title;
            if (input.appointmentType !== undefined)
                patch.appointmentType = input.appointmentType;
            if (input.scheduledFor !== undefined)
                patch.scheduledFor = input.scheduledFor;
            if (input.location !== undefined) patch.location = input.location;
            if (input.notes !== undefined) patch.notes = input.notes;

            const [row] = await ctx.db
                .update(petAppointments)
                .set(patch)
                .where(eq(petAppointments.id, input.appointmentId))
                .returning();
            if (!row) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to update appointment.",
                });
            }
            return row;
        }),

    setStatus: protectedProcedure
        .input(
            z.object({
                appointmentId: z.number().int().positive(),
                status: appointmentStatusSchema,
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const petId = await loadAppointmentPetId(
                ctx.db,
                input.appointmentId,
            );
            const role = await assertPetAccess(ctx.db, ctx.userId, petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot change appointments.",
                });
            }
            await ctx.db
                .update(petAppointments)
                .set({ status: input.status, updatedAt: new Date() })
                .where(eq(petAppointments.id, input.appointmentId));
            return { ok: true as const };
        }),

    deleteEntry: protectedProcedure
        .input(z.object({ appointmentId: z.number().int().positive() }))
        .mutation(async ({ ctx, input }) => {
            const petId = await loadAppointmentPetId(
                ctx.db,
                input.appointmentId,
            );
            const role = await assertPetAccess(ctx.db, ctx.userId, petId);
            if (role === "Viewer") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Viewer role cannot delete appointments.",
                });
            }
            await ctx.db
                .delete(petAppointments)
                .where(eq(petAppointments.id, input.appointmentId));
            return { ok: true as const };
        }),
});
