"use client";

import { useState, type FormEvent } from "react";
import { PlayCircle } from "lucide-react";

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

const ACTIVITY_TYPES = [
    "Play",
    "Walk",
    "Exercise",
    "Training",
    "Grooming",
    "Other",
];

export function RecordActivityDialog({ pet }: { pet: Pet }) {
    const [open, setOpen] = useState(false);
    const [activityType, setActivityType] = useState("Play");
    const [duration, setDuration] = useState("");
    const [performedAt, setPerformedAt] = useState("");
    const [notes, setNotes] = useState("");

    const utils = api.useUtils();
    const recordActivity = api.activity.record.useMutation({
        onSuccess: async () => {
            await utils.activity.getHistory.invalidate({ petId: pet.id });
            setOpen(false);
            setDuration("");
            setPerformedAt("");
            setNotes("");
        },
    });

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const mins = Number(duration);
        if (!Number.isFinite(mins) || mins <= 0) return;
        recordActivity.mutate({
            petId: pet.id,
            activityType,
            durationMinutes: Math.round(mins),
            ...(performedAt ? { performedAt: new Date(performedAt) } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Card className="cursor-pointer transition-colors hover:bg-accent">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PlayCircle className="h-4 w-4" />
                            Log activity
                        </CardTitle>
                        <CardDescription>
                            Track playtime, walks, training.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log activity for {pet.name}</DialogTitle>
                    <DialogDescription>
                        Pick a type, enter minutes, save.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="act-type">Type</Label>
                        <select
                            id="act-type"
                            value={activityType}
                            onChange={(e) => setActivityType(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            {ACTIVITY_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="act-duration">Duration (minutes)</Label>
                        <Input
                            id="act-duration"
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="1"
                            required
                            autoFocus
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            placeholder="15"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="act-when">When (optional)</Label>
                        <Input
                            id="act-when"
                            type="datetime-local"
                            value={performedAt}
                            onChange={(e) => setPerformedAt(e.target.value)}
                            max={new Date().toISOString().slice(0, 16)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="act-notes">Notes (optional)</Label>
                        <Input
                            id="act-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Laser pointer, jumping around"
                        />
                    </div>
                    {recordActivity.error && (
                        <p className="text-sm text-destructive">
                            {recordActivity.error.message}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={recordActivity.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={recordActivity.isPending}>
                            {recordActivity.isPending ? "Saving…" : "Save"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
