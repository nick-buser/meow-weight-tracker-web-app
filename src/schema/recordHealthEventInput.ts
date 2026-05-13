import { z } from "zod";

export const recordHealthEventInput = z.object({
    petId: z.number().int().positive(),
    eventType: z.string().min(1).max(64),
    title: z.string().min(1).max(256),
    occurredAt: z.date().optional(),
    notes: z.string().max(2048).optional(),
});
