"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/react";

type Feeding = RouterOutputs["feeding"]["getFeedingHistory"][number];

export function FeedingRowActions({
    row,
    petId,
    canEdit,
}: {
    row: Feeding;
    petId: number;
    canEdit: boolean;
}) {
    const utils = api.useUtils();
    const [editing, setEditing] = useState(false);
    const [foodId, setFoodId] = useState(String(row.food.id));
    const [grams, setGrams] = useState(String(row.quantityGrams));
    const [fedAt, setFedAt] = useState(toLocalInput(row.fedAt));

    const foods = api.food.list.useQuery(undefined, { enabled: editing });
    const updateEntry = api.feeding.updateEntry.useMutation({
        onSuccess: async () => {
            await utils.feeding.getFeedingHistory.invalidate({ petId });
            setEditing(false);
            toast.success("Feeding updated");
        },
        onError: (err) => toast.error(err.message),
    });
    const deleteEntry = api.feeding.deleteEntry.useMutation({
        onSuccess: async () => {
            await utils.feeding.getFeedingHistory.invalidate({ petId });
            toast.success("Feeding deleted");
        },
        onError: (err) => toast.error(err.message),
    });

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const qty = Number(grams);
        const food = Number(foodId);
        if (!Number.isFinite(qty) || qty <= 0) return;
        if (!Number.isFinite(food) || food <= 0) return;
        updateEntry.mutate({
            entryId: row.id,
            foodId: food,
            quantityGrams: Math.round(qty),
            fedAt: fedAt ? new Date(fedAt) : undefined,
        });
    }

    if (!canEdit) return null;

    return (
        <>
            <div className="flex items-center gap-1">
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(true)}
                    aria-label="Edit feeding"
                >
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={deleteEntry.isPending}
                    onClick={() => {
                        if (!confirm("Delete this feeding?")) return;
                        deleteEntry.mutate({ entryId: row.id });
                    }}
                    aria-label="Delete feeding"
                    className="text-destructive hover:text-destructive"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>

            <Dialog open={editing} onOpenChange={setEditing}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit feeding</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-feeding-food">Food</Label>
                            <select
                                id="edit-feeding-food"
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
                            <Label htmlFor="edit-feeding-grams">Grams</Label>
                            <Input
                                id="edit-feeding-grams"
                                type="number"
                                step="1"
                                min="1"
                                required
                                value={grams}
                                onChange={(e) => setGrams(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-feeding-when">When</Label>
                            <Input
                                id="edit-feeding-when"
                                type="datetime-local"
                                value={fedAt}
                                onChange={(e) => setFedAt(e.target.value)}
                                max={new Date().toISOString().slice(0, 16)}
                            />
                        </div>
                        {updateEntry.error && (
                            <p className="text-sm text-destructive">
                                {updateEntry.error.message}
                            </p>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditing(false)}
                                disabled={updateEntry.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateEntry.isPending}>
                                {updateEntry.isPending ? "Saving…" : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
