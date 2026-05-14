"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Utensils } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/react";

type Pet = RouterOutputs["pet"]["getPets"][number];

const LAST_FOOD_KEY = (petId: number) => `meow:lastFoodId:${petId}`;

export function RecordFeedingDialog({ pet }: { pet: Pet }) {
    const [open, setOpen] = useState(false);
    const [foodId, setFoodId] = useState<string>("");
    const [grams, setGrams] = useState("");
    const [fedAt, setFedAt] = useState("");

    const foods = api.food.list.useQuery();
    const utils = api.useUtils();
    const recordFeeding = api.feeding.recordFeeding.useMutation({
        onMutate: async (vars) => {
            await utils.feeding.getFeedingHistory.cancel({ petId: pet.id });
            const previous = utils.feeding.getFeedingHistory.getData({
                petId: pet.id,
            });
            const food = foods.data?.find((f) => f.id === vars.foodId);
            if (!food) return { previous };
            const at = vars.fedAt ?? new Date();
            const tempId = -Date.now();
            utils.feeding.getFeedingHistory.setData(
                { petId: pet.id },
                (rows) =>
                    [
                        {
                            id: tempId,
                            petId: pet.id,
                            fedAt: at,
                            quantityGrams: vars.quantityGrams,
                            food,
                        },
                        ...(rows ?? []),
                    ].sort((a, b) => b.fedAt.getTime() - a.fedAt.getTime()),
            );
            return { previous };
        },
        onError: (err, _vars, ctx) => {
            if (ctx?.previous) {
                utils.feeding.getFeedingHistory.setData(
                    { petId: pet.id },
                    ctx.previous,
                );
            }
            toast.error(err.message);
        },
        onSuccess: (_data, vars) => {
            if (typeof window !== "undefined") {
                window.localStorage.setItem(
                    LAST_FOOD_KEY(pet.id),
                    String(vars.foodId),
                );
            }
            setOpen(false);
            setGrams("");
            setFedAt("");
            toast.success(`Feeding logged for ${pet.name}`);
        },
        onSettled: () => {
            void utils.feeding.getFeedingHistory.invalidate({ petId: pet.id });
        },
    });

    useEffect(() => {
        if (!open) return;
        if (foodId) return;
        if (!foods.data || foods.data.length === 0) return;
        const remembered =
            typeof window !== "undefined"
                ? window.localStorage.getItem(LAST_FOOD_KEY(pet.id))
                : null;
        const fallback = String(foods.data[0]!.id);
        const valid =
            remembered && foods.data.some((f) => String(f.id) === remembered)
                ? remembered
                : fallback;
        setFoodId(valid);
    }, [open, foodId, foods.data, pet.id]);

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const qty = Number(grams);
        if (!Number.isFinite(qty) || qty <= 0) return;
        const food = Number(foodId);
        if (!Number.isFinite(food) || food <= 0) return;
        recordFeeding.mutate({
            petId: pet.id,
            foodId: food,
            quantityGrams: Math.round(qty),
            ...(fedAt ? { fedAt: new Date(fedAt) } : {}),
        });
    }

    const noFoods = foods.data && foods.data.length === 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Card className="cursor-pointer transition-colors hover:bg-accent">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Utensils className="h-4 w-4" />
                            Log feeding
                        </CardTitle>
                        <CardDescription>
                            Record what {pet.name} ate.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log feeding for {pet.name}</DialogTitle>
                    <DialogDescription>
                        Pick a food, enter grams, save.
                    </DialogDescription>
                </DialogHeader>

                {noFoods ? (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            You haven&apos;t added any foods yet.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/foods">Add your first food</Link>
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="feeding-food">Food</Label>
                            <select
                                id="feeding-food"
                                required
                                value={foodId}
                                onChange={(e) => setFoodId(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                {foods.data?.map((food) => (
                                    <option key={food.id} value={food.id}>
                                        {food.brand
                                            ? `${food.brand} — ${food.name}`
                                            : food.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="feeding-grams">Grams</Label>
                            <Input
                                id="feeding-grams"
                                type="number"
                                inputMode="numeric"
                                step="1"
                                min="1"
                                required
                                autoFocus
                                value={grams}
                                onChange={(e) => setGrams(e.target.value)}
                                placeholder="40"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="feeding-when">When (optional)</Label>
                            <Input
                                id="feeding-when"
                                type="datetime-local"
                                value={fedAt}
                                onChange={(e) => setFedAt(e.target.value)}
                                max={new Date().toISOString().slice(0, 16)}
                            />
                        </div>

                        {recordFeeding.error && (
                            <p className="text-sm text-destructive">
                                {recordFeeding.error.message}
                            </p>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={recordFeeding.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={recordFeeding.isPending || !foodId}
                            >
                                {recordFeeding.isPending ? "Saving…" : "Save feeding"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
