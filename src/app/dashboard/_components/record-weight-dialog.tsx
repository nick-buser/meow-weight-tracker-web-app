"use client";

import { useState, type FormEvent } from "react";
import { Scale } from "lucide-react";
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
import { useWeightUnit } from "~/hooks/use-weight-unit";
import { toKg } from "~/lib/units";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/react";

type Pet = RouterOutputs["pet"]["getPets"][number];

export function RecordWeightDialog({ pet }: { pet: Pet }) {
    const unit = useWeightUnit();
    const [open, setOpen] = useState(false);
    const [weight, setWeight] = useState("");
    const [recordedAt, setRecordedAt] = useState("");

    const utils = api.useUtils();
    const recordWeight = api.weight.recordWeight.useMutation({
        onMutate: async (vars) => {
            await utils.weight.getWeightHistory.cancel({ petId: pet.id });
            const previous = utils.weight.getWeightHistory.getData({
                petId: pet.id,
            });
            const at = vars.recordedAt ?? new Date();
            const tempId = -Date.now();
            utils.weight.getWeightHistory.setData(
                { petId: pet.id },
                (rows) =>
                    [
                        ...(rows ?? []),
                        {
                            id: tempId,
                            petId: pet.id,
                            weight: vars.weight,
                            weighedAt: at,
                            createdAt: at,
                            updatedAt: at,
                        },
                    ].sort(
                        (a, b) =>
                            a.weighedAt.getTime() - b.weighedAt.getTime(),
                    ),
            );
            return { previous };
        },
        onError: (err, _vars, ctx) => {
            if (ctx?.previous) {
                utils.weight.getWeightHistory.setData(
                    { petId: pet.id },
                    ctx.previous,
                );
            }
            toast.error(err.message);
        },
        onSuccess: () => {
            setOpen(false);
            setWeight("");
            setRecordedAt("");
            toast.success(`Weight saved for ${pet.name}`);
        },
        onSettled: () => {
            void utils.weight.getWeightHistory.invalidate({ petId: pet.id });
        },
    });

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const numeric = Number(weight);
        if (!Number.isFinite(numeric) || numeric <= 0) return;
        recordWeight.mutate({
            petId: pet.id,
            // Stored canonically as kg; the form collects the chosen unit.
            weight: toKg(numeric, unit),
            ...(recordedAt ? { recordedAt: new Date(recordedAt) } : {}),
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Card className="cursor-pointer transition-colors hover:bg-accent">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Scale className="h-4 w-4" />
                            Log weight
                        </CardTitle>
                        <CardDescription>
                            Record a new weight for {pet.name}.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={onSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Log weight for {pet.name}</DialogTitle>
                        <DialogDescription>
                            Enter the latest weight reading. Defaults to right now.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="weight">Weight ({unit})</Label>
                        <Input
                            id="weight"
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            required
                            autoFocus
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder={unit === "lb" ? "11.9" : "5.4"}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="recordedAt">When (optional)</Label>
                        <Input
                            id="recordedAt"
                            type="datetime-local"
                            value={recordedAt}
                            onChange={(e) => setRecordedAt(e.target.value)}
                            max={new Date().toISOString().slice(0, 16)}
                        />
                    </div>

                    {recordWeight.error && (
                        <p className="text-sm text-destructive">
                            {recordWeight.error.message}
                        </p>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={recordWeight.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={recordWeight.isPending}>
                            {recordWeight.isPending ? "Saving…" : "Save weight"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
