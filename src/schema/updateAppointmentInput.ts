import { z } from "zod";

export const appointmentStatusSchema = z.enum([
    "Scheduled",
    "Completed",
    "Cancelled",
]);

export const updateAppointmentInput = z.object({
    appointmentId: z.number().int().positive(),
    title: z.string().min(1).max(256).optional(),
    appointmentType: z.string().min(1).max(64).optional(),
    scheduledFor: z.date().optional(),
    location: z.string().max(256).nullable().optional(),
    notes: z.string().max(2048).nullable().optional(),
});
