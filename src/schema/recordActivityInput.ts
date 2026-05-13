import { z } from "zod";

export const recordActivityInput = z.object({
    petId: z.number().int().positive(),
    activityType: z.string().min(1).max(64),
    durationMinutes: z.number().int().positive(),
    performedAt: z.date().optional(),
    notes: z.string().max(1024).optional(),
});
