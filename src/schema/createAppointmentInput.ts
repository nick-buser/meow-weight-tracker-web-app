import { z } from "zod";

export const createAppointmentInput = z.object({
    petId: z.number().int().positive(),
    title: z.string().min(1).max(256),
    appointmentType: z.string().min(1).max(64),
    scheduledFor: z.date(),
    location: z.string().max(256).optional(),
    notes: z.string().max(2048).optional(),
});
