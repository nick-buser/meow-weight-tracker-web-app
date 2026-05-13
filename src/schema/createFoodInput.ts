import { z } from "zod";

export const createFoodInput = z.object({
    name: z.string().min(1).max(256),
    brand: z.string().max(256).optional(),
    caloriesPerGram: z.number().positive(),
    proteinPercent: z.number().min(0).max(100).optional(),
    fatPercent: z.number().min(0).max(100).optional(),
    carbsPercent: z.number().min(0).max(100).optional(),
    notes: z.string().max(1024).optional(),
});

export type CreateFoodInput = z.infer<typeof createFoodInput>;
