import { auth } from "@clerk/nextjs/server";
import { asc, eq } from "drizzle-orm";

import { toCsv } from "~/lib/csv";
import { db } from "~/server/db";
import { eatingHistory, petFood, weightHistory } from "~/server/db/schema";
import { assertPetAccess } from "~/server/api/petAccess";

export async function GET(
    req: Request,
    { params }: { params: { id: string } },
) {
    const { userId } = auth();
    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }
    const petId = Number(params.id);
    if (!Number.isFinite(petId) || petId <= 0) {
        return new Response("Bad petId", { status: 400 });
    }
    try {
        await assertPetAccess(db, userId, petId);
    } catch {
        return new Response("Forbidden", { status: 403 });
    }

    const url = new URL(req.url);
    const kind = url.searchParams.get("kind") ?? "weight";

    if (kind === "weight") {
        const rows = await db
            .select()
            .from(weightHistory)
            .where(eq(weightHistory.petId, petId))
            .orderBy(asc(weightHistory.weighedAt));
        const csv = toCsv([
            ["entry_id", "weighed_at_iso", "weight", "created_at_iso"],
            ...rows.map((r) => [
                r.id,
                r.weighedAt.toISOString(),
                r.weight,
                r.createdAt.toISOString(),
            ]),
        ]);
        return new Response(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="pet-${petId}-weight.csv"`,
            },
        });
    }

    if (kind === "feeding") {
        const rows = await db
            .select({
                id: eatingHistory.id,
                fedAt: eatingHistory.fedAt,
                quantityGrams: eatingHistory.quantityGrams,
                createdAt: eatingHistory.createdAt,
                foodName: petFood.name,
                foodBrand: petFood.brand,
                caloriesPerGram: petFood.caloriesPerGram,
            })
            .from(eatingHistory)
            .innerJoin(petFood, eq(eatingHistory.foodId, petFood.id))
            .where(eq(eatingHistory.petId, petId))
            .orderBy(asc(eatingHistory.fedAt));
        const csv = toCsv([
            [
                "entry_id",
                "fed_at_iso",
                "food_name",
                "food_brand",
                "quantity_grams",
                "calories_per_gram",
                "computed_kcal",
                "created_at_iso",
            ],
            ...rows.map((r) => [
                r.id,
                r.fedAt.toISOString(),
                r.foodName,
                r.foodBrand ?? "",
                r.quantityGrams,
                r.caloriesPerGram,
                (r.quantityGrams * r.caloriesPerGram).toFixed(2),
                r.createdAt.toISOString(),
            ]),
        ]);
        return new Response(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="pet-${petId}-feeding.csv"`,
            },
        });
    }

    return new Response("Unknown kind. Use ?kind=weight or ?kind=feeding", {
        status: 400,
    });
}
