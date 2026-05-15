"use client";

import { useState, type FormEvent } from "react";
import {
    Ban,
    CalendarClock,
    CheckCircle2,
    MapPin,
    Pencil,
    Plus,
    RotateCcw,
    Trash2,
} from "lucide-react";
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
import { ListSkeleton } from "~/components/ui/list-skeleton";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api, type RouterOutputs } from "~/trpc/react";

type Appointment = RouterOutputs["appointments"]["list"][number];

const APPOINTMENT_TYPES = [
    "Vet visit",
    "Vaccination",
    "Grooming",
    "Dental cleaning",
    "Checkup",
    "Surgery",
    "Other",
];

// Convert a Date to the `YYYY-MM-DDTHH:mm` string a datetime-local input
// expects, in the viewer's local timezone.
function toLocalInput(d: Date): string {
    const offsetMs = d.getTimezoneOffset() * 60_000;
    return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function AppointmentsCard({
    petId,
    canEdit,
}: {
    petId: number;
    canEdit: boolean;
}) {
    const { data, isLoading } = api.appointments.list.useQuery({ petId });

    const now = Date.now();
    const all = data ?? [];
    const upcoming = all
        .filter(
            (a) => a.status === "Scheduled" && a.scheduledFor.getTime() >= now,
        )
        .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
    const past = all.filter(
        (a) => !(a.status === "Scheduled" && a.scheduledFor.getTime() >= now),
    );

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" />
                        Appointments
                    </CardTitle>
                    <CardDescription>
                        Upcoming vet &amp; grooming visits.
                    </CardDescription>
                </div>
                {canEdit && <AppointmentFormDialog petId={petId} />}
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <ListSkeleton />
                ) : all.length === 0 ? (
                    <EmptyState
                        icon={CalendarClock}
                        title="No appointments yet"
                        description="Schedule vet visits, grooming, and checkups."
                    />
                ) : (
                    <div className="space-y-5">
                        {upcoming.length > 0 && (
                            <div>
                                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Upcoming
                                </h3>
                                <ul className="divide-y">
                                    {upcoming.map((a) => (
                                        <AppointmentRow
                                            key={a.id}
                                            appointment={a}
                                            canEdit={canEdit}
                                        />
                                    ))}
                                </ul>
                            </div>
                        )}
                        {past.length > 0 && (
                            <div>
                                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Past &amp; closed
                                </h3>
                                <ul className="divide-y">
                                    {past.map((a) => (
                                        <AppointmentRow
                                            key={a.id}
                                            appointment={a}
                                            canEdit={canEdit}
                                        />
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function AppointmentRow({
    appointment,
    canEdit,
}: {
    appointment: Appointment;
    canEdit: boolean;
}) {
    const utils = api.useUtils();
    const petId = appointment.petId;

    const setStatus = api.appointments.setStatus.useMutation({
        onSuccess: async () => {
            await utils.appointments.list.invalidate({ petId });
        },
        onError: (err) => toast.error(err.message),
    });
    const remove = api.appointments.deleteEntry.useMutation({
        onSuccess: async () => {
            await utils.appointments.list.invalidate({ petId });
            toast.success("Appointment deleted");
        },
        onError: (err) => toast.error(err.message),
    });

    const busy = setStatus.isPending || remove.isPending;
    const isScheduled = appointment.status === "Scheduled";
    const isCancelled = appointment.status === "Cancelled";
    const isOverdue =
        isScheduled && appointment.scheduledFor.getTime() < Date.now();

    return (
        <li className="flex items-start justify-between gap-3 py-3 text-sm">
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {appointment.appointmentType}
                    </span>
                    <span
                        className={
                            isCancelled
                                ? "font-medium text-muted-foreground line-through"
                                : "font-medium"
                        }
                    >
                        {appointment.title}
                    </span>
                    {appointment.status === "Completed" && (
                        <span className="text-[10px] font-medium uppercase text-green-600 dark:text-green-500">
                            Completed
                        </span>
                    )}
                    {isCancelled && (
                        <span className="text-[10px] font-medium uppercase text-muted-foreground">
                            Cancelled
                        </span>
                    )}
                    {isOverdue && (
                        <span className="text-[10px] font-medium uppercase text-amber-600 dark:text-amber-500">
                            Overdue
                        </span>
                    )}
                </div>
                <div className="text-xs text-muted-foreground">
                    {appointment.scheduledFor.toLocaleString()}
                </div>
                {appointment.location && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="min-w-0 truncate">
                            {appointment.location}
                        </span>
                    </div>
                )}
                {appointment.notes && (
                    <p className="mt-1 text-xs">{appointment.notes}</p>
                )}
            </div>
            {canEdit && (
                <div className="flex shrink-0 items-center gap-0.5">
                    {isScheduled ? (
                        <>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                disabled={busy}
                                aria-label="Mark as completed"
                                title="Mark as completed"
                                onClick={() =>
                                    setStatus.mutate({
                                        appointmentId: appointment.id,
                                        status: "Completed",
                                    })
                                }
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                disabled={busy}
                                aria-label="Cancel appointment"
                                title="Cancel appointment"
                                onClick={() =>
                                    setStatus.mutate({
                                        appointmentId: appointment.id,
                                        status: "Cancelled",
                                    })
                                }
                            >
                                <Ban className="h-3.5 w-3.5" />
                            </Button>
                        </>
                    ) : (
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={busy}
                            aria-label="Reopen appointment"
                            title="Reopen appointment"
                            onClick={() =>
                                setStatus.mutate({
                                    appointmentId: appointment.id,
                                    status: "Scheduled",
                                })
                            }
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <AppointmentFormDialog
                        petId={petId}
                        appointment={appointment}
                    />
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={busy}
                        aria-label="Delete appointment"
                        title="Delete appointment"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                            if (!confirm("Delete this appointment?")) return;
                            remove.mutate({ appointmentId: appointment.id });
                        }}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}
        </li>
    );
}

function AppointmentFormDialog({
    petId,
    appointment,
}: {
    petId: number;
    appointment?: Appointment;
}) {
    const isEdit = appointment !== undefined;
    const utils = api.useUtils();
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(appointment?.title ?? "");
    const [type, setType] = useState(
        appointment?.appointmentType ?? "Vet visit",
    );
    const [scheduledFor, setScheduledFor] = useState(
        appointment ? toLocalInput(appointment.scheduledFor) : "",
    );
    const [location, setLocation] = useState(appointment?.location ?? "");
    const [notes, setNotes] = useState(appointment?.notes ?? "");

    const create = api.appointments.create.useMutation({
        onSuccess: async () => {
            await utils.appointments.list.invalidate({ petId });
            setOpen(false);
            setTitle("");
            setType("Vet visit");
            setScheduledFor("");
            setLocation("");
            setNotes("");
            toast.success("Appointment scheduled");
        },
        onError: (err) => toast.error(err.message),
    });
    const update = api.appointments.updateEntry.useMutation({
        onSuccess: async () => {
            await utils.appointments.list.invalidate({ petId });
            setOpen(false);
            toast.success("Appointment updated");
        },
        onError: (err) => toast.error(err.message),
    });
    const pending = create.isPending || update.isPending;

    // Re-seed the form from the latest data each time an edit dialog opens.
    function handleOpenChange(next: boolean) {
        if (next && appointment) {
            setTitle(appointment.title);
            setType(appointment.appointmentType);
            setScheduledFor(toLocalInput(appointment.scheduledFor));
            setLocation(appointment.location ?? "");
            setNotes(appointment.notes ?? "");
        }
        setOpen(next);
    }

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!scheduledFor) {
            toast.error("Pick a date and time");
            return;
        }
        const when = new Date(scheduledFor);
        if (appointment) {
            update.mutate({
                appointmentId: appointment.id,
                title: title.trim(),
                appointmentType: type,
                scheduledFor: when,
                location: location.trim() ? location.trim() : null,
                notes: notes.trim() ? notes.trim() : null,
            });
        } else {
            create.mutate({
                petId,
                title: title.trim(),
                appointmentType: type,
                scheduledFor: when,
                ...(location.trim() ? { location: location.trim() } : {}),
                ...(notes.trim() ? { notes: notes.trim() } : {}),
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {isEdit ? (
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Edit appointment"
                        title="Edit appointment"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                ) : (
                    <Button type="button" size="sm" variant="outline">
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add appointment
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? "Edit appointment" : "Add appointment"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-3">
                    <div className="space-y-1">
                        <Label htmlFor="ap-title">Title</Label>
                        <Input
                            id="ap-title"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Annual checkup"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="ap-type">Type</Label>
                        <select
                            id="ap-type"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            {APPOINTMENT_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="ap-when">When</Label>
                        <Input
                            id="ap-when"
                            type="datetime-local"
                            required
                            value={scheduledFor}
                            onChange={(e) => setScheduledFor(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="ap-location">Location</Label>
                        <Input
                            id="ap-location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Downtown Vet Clinic"
                            maxLength={256}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="ap-notes">Notes</Label>
                        <Input
                            id="ap-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Bring vaccination records"
                            maxLength={2048}
                        />
                    </div>
                    {(create.error ?? update.error) && (
                        <p className="text-sm text-destructive">
                            {(create.error ?? update.error)?.message}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={pending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={pending}>
                            {pending
                                ? "Saving…"
                                : isEdit
                                  ? "Save"
                                  : "Schedule"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
