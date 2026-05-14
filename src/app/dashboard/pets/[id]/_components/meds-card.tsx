"use client";

import { useState, type FormEvent } from "react";
import { Check, Pill, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/ui/dialog";
import { EmptyState } from "~/components/ui/empty-state";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { isMedDue, nextDueAt } from "~/lib/meds-due";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export function MedsCard({
    petId,
    canEdit,
}: {
    petId: number;
    canEdit: boolean;
}) {
    const utils = api.useUtils();
    const { data, isLoading } = api.meds.list.useQuery({ petId });
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [dosage, setDosage] = useState("");
    const [frequencyHours, setFrequencyHours] = useState("12");
    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");
    const [notes, setNotes] = useState("");

    const create = api.meds.create.useMutation({
        onSuccess: async () => {
            await utils.meds.list.invalidate({ petId });
            setOpen(false);
            setName("");
            setDosage("");
            setEndsAt("");
            setNotes("");
            toast.success("Medication added");
        },
        onError: (err) => toast.error(err.message),
    });
    const markGiven = api.meds.markGiven.useMutation({
        onSuccess: async () => {
            await utils.meds.list.invalidate({ petId });
            toast.success("Marked given");
        },
        onError: (err) => toast.error(err.message),
    });
    const deleteEntry = api.meds.deleteEntry.useMutation({
        onSuccess: async () => {
            await utils.meds.list.invalidate({ petId });
            toast.success("Medication removed");
        },
        onError: (err) => toast.error(err.message),
    });

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const freq = Number(frequencyHours);
        if (!Number.isFinite(freq) || freq <= 0) return;
        const sa = startsAt ? new Date(startsAt) : new Date();
        create.mutate({
            petId,
            name: name.trim(),
            frequencyHours: Math.round(freq),
            startsAt: sa,
            ...(dosage.trim() ? { dosage: dosage.trim() } : {}),
            ...(endsAt ? { endsAt: new Date(endsAt) } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
        });
    }

    const dueCount = (data ?? []).filter((m) =>
        isMedDue({
            startsAt: m.startsAt,
            endsAt: m.endsAt,
            lastGivenAt: m.lastGivenAt,
            frequencyHours: m.frequencyHours,
        }),
    ).length;

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Pill className="h-4 w-4" />
                        Medications
                        {dueCount > 0 && (
                            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
                                {dueCount} due
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Recurring doses with a next-due reminder.
                    </CardDescription>
                </div>
                {canEdit && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button type="button" size="sm" variant="outline">
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Add med
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add medication</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={onSubmit} className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="med-name">Name</Label>
                                    <Input
                                        id="med-name"
                                        required
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        placeholder="Methimazole"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="med-dosage">
                                            Dosage
                                        </Label>
                                        <Input
                                            id="med-dosage"
                                            value={dosage}
                                            onChange={(e) =>
                                                setDosage(e.target.value)
                                            }
                                            placeholder="2.5 mg"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="med-freq">
                                            Every (hours)
                                        </Label>
                                        <Input
                                            id="med-freq"
                                            type="number"
                                            min="1"
                                            max="1440"
                                            required
                                            value={frequencyHours}
                                            onChange={(e) =>
                                                setFrequencyHours(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="med-starts">
                                            Starts
                                        </Label>
                                        <Input
                                            id="med-starts"
                                            type="datetime-local"
                                            value={startsAt}
                                            onChange={(e) =>
                                                setStartsAt(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="med-ends">
                                            Ends (optional)
                                        </Label>
                                        <Input
                                            id="med-ends"
                                            type="datetime-local"
                                            value={endsAt}
                                            onChange={(e) =>
                                                setEndsAt(e.target.value)
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="med-notes">Notes</Label>
                                    <Input
                                        id="med-notes"
                                        value={notes}
                                        onChange={(e) =>
                                            setNotes(e.target.value)
                                        }
                                        placeholder="With food"
                                    />
                                </div>
                                {create.error && (
                                    <p className="text-sm text-destructive">
                                        {create.error.message}
                                    </p>
                                )}
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setOpen(false)}
                                        disabled={create.isPending}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={create.isPending}
                                    >
                                        {create.isPending ? "Saving…" : "Save"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : !data || data.length === 0 ? (
                    <EmptyState
                        icon={Pill}
                        title="No medications yet"
                        description="Add a recurring med to track doses and due times."
                    />
                ) : (
                    <ul className="divide-y">
                        {data.map((m) => {
                            const due = isMedDue({
                                startsAt: m.startsAt,
                                endsAt: m.endsAt,
                                lastGivenAt: m.lastGivenAt,
                                frequencyHours: m.frequencyHours,
                            });
                            const next = nextDueAt({
                                startsAt: m.startsAt,
                                endsAt: m.endsAt,
                                lastGivenAt: m.lastGivenAt,
                                frequencyHours: m.frequencyHours,
                            });
                            return (
                                <li
                                    key={m.id}
                                    className={cn(
                                        "flex items-start justify-between gap-3 py-2 text-sm",
                                        due && "bg-destructive/5",
                                    )}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                                {m.name}
                                            </span>
                                            {due && (
                                                <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] uppercase text-destructive">
                                                    Due
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {m.dosage ? `${m.dosage} · ` : ""}
                                            every {m.frequencyHours}h
                                            {next
                                                ? ` · next ${next.toLocaleString()}`
                                                : " · ended"}
                                        </div>
                                        {m.notes && (
                                            <p className="mt-1 text-xs">
                                                {m.notes}
                                            </p>
                                        )}
                                    </div>
                                    {canEdit && (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={due ? "default" : "outline"}
                                                disabled={markGiven.isPending}
                                                onClick={() =>
                                                    markGiven.mutate({
                                                        medId: m.id,
                                                    })
                                                }
                                            >
                                                <Check className="mr-1 h-3.5 w-3.5" />
                                                Given
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                disabled={
                                                    deleteEntry.isPending
                                                }
                                                onClick={() => {
                                                    if (
                                                        !confirm(
                                                            `Remove ${m.name}?`,
                                                        )
                                                    )
                                                        return;
                                                    deleteEntry.mutate({
                                                        medId: m.id,
                                                    });
                                                }}
                                                aria-label="Remove med"
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
