"use client";

import { useState, type FormEvent } from "react";
import { HeartPulse, Plus, Trash2 } from "lucide-react";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

const EVENT_TYPES = [
    "Vet visit",
    "Medication",
    "Vaccination",
    "Symptom",
    "Surgery",
    "Other",
];

export function HealthEventsCard({
    petId,
    canEdit,
}: {
    petId: number;
    canEdit: boolean;
}) {
    const utils = api.useUtils();
    const { data, isLoading } = api.health.getHistory.useQuery({ petId });
    const [open, setOpen] = useState(false);
    const [eventType, setEventType] = useState("Vet visit");
    const [title, setTitle] = useState("");
    const [occurredAt, setOccurredAt] = useState("");
    const [notes, setNotes] = useState("");

    const record = api.health.record.useMutation({
        onSuccess: async () => {
            await utils.health.getHistory.invalidate({ petId });
            setOpen(false);
            setTitle("");
            setOccurredAt("");
            setNotes("");
            toast.success("Health event added");
        },
        onError: (err) => toast.error(err.message),
    });
    const deleteEntry = api.health.deleteEntry.useMutation({
        onSuccess: async () => {
            await utils.health.getHistory.invalidate({ petId });
            toast.success("Event deleted");
        },
        onError: (err) => toast.error(err.message),
    });

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        record.mutate({
            petId,
            eventType,
            title: title.trim(),
            ...(occurredAt ? { occurredAt: new Date(occurredAt) } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
        });
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <HeartPulse className="h-4 w-4" />
                        Health events
                    </CardTitle>
                    <CardDescription>
                        Vet visits, medications, symptoms.
                    </CardDescription>
                </div>
                {canEdit && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button type="button" size="sm" variant="outline">
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Add event
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add health event</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={onSubmit} className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="he-type">Type</Label>
                                    <select
                                        id="he-type"
                                        value={eventType}
                                        onChange={(e) => setEventType(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        {EVENT_TYPES.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="he-title">Title</Label>
                                    <Input
                                        id="he-title"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Annual checkup"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="he-when">When</Label>
                                    <Input
                                        id="he-when"
                                        type="datetime-local"
                                        value={occurredAt}
                                        onChange={(e) => setOccurredAt(e.target.value)}
                                        max={new Date().toISOString().slice(0, 16)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="he-notes">Notes</Label>
                                    <Input
                                        id="he-notes"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="All clear, next visit in 6 months"
                                    />
                                </div>
                                {record.error && (
                                    <p className="text-sm text-destructive">
                                        {record.error.message}
                                    </p>
                                )}
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setOpen(false)}
                                        disabled={record.isPending}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={record.isPending}>
                                        {record.isPending ? "Saving…" : "Save"}
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
                    <p className="text-sm text-muted-foreground">
                        No health events logged yet.
                    </p>
                ) : (
                    <ul className="divide-y">
                        {data.map((row) => (
                            <li
                                key={row.id}
                                className="flex items-start justify-between gap-3 py-3 text-sm"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                                            {row.eventType}
                                        </span>
                                        <span className="font-medium">{row.title}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {row.occurredAt.toLocaleString()}
                                    </div>
                                    {row.notes && (
                                        <p className="mt-1 text-xs">{row.notes}</p>
                                    )}
                                </div>
                                {canEdit && (
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        disabled={deleteEntry.isPending}
                                        onClick={() => {
                                            if (!confirm("Delete this event?")) return;
                                            deleteEntry.mutate({ entryId: row.id });
                                        }}
                                        aria-label="Delete event"
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
