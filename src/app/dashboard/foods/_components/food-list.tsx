"use client";

import { Card, CardContent } from "~/components/ui/card";
import { api } from "~/trpc/react";

export function FoodList() {
    const { data, isLoading } = api.food.list.useQuery();

    if (isLoading) {
        return <p className="text-sm text-muted-foreground">Loading…</p>;
    }
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                    No foods yet. Add the first one on the right.
                </CardContent>
            </Card>
        );
    }
    return (
        <div className="space-y-2">
            {data.map((food) => (
                <Card key={food.id}>
                    <CardContent className="flex items-start justify-between gap-4 p-4">
                        <div>
                            <div className="font-medium">{food.name}</div>
                            <div className="text-xs text-muted-foreground">
                                {[
                                    food.brand,
                                    `${food.caloriesPerGram.toFixed(2)} kcal/g`,
                                ]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </div>
                            {food.notes && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {food.notes}
                                </p>
                            )}
                        </div>
                        <Macros food={food} />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function Macros({
    food,
}: {
    food: {
        proteinPercent: number | null;
        fatPercent: number | null;
        carbsPercent: number | null;
    };
}) {
    const parts: string[] = [];
    if (food.proteinPercent !== null) parts.push(`P ${food.proteinPercent}%`);
    if (food.fatPercent !== null) parts.push(`F ${food.fatPercent}%`);
    if (food.carbsPercent !== null) parts.push(`C ${food.carbsPercent}%`);
    if (parts.length === 0) return null;
    return (
        <div className="text-right text-xs text-muted-foreground">
            {parts.join(" / ")}
        </div>
    );
}
