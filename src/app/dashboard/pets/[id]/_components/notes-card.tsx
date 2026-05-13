"use client";

import { useState, type FormEvent } from "react";
import { NotebookPen, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/react";

export function NotesCard({
    petId,
    canEdit,
}: {
    petId: number;
    canEdit: boolean;
}) {
    const utils = api.useUtils();
    const [body, setBody] = useState("");
    const { data, isLoading } = api.notes.getNotes.useQuery({ petId });

    const record = api.notes.record.useMutation({
        onSuccess: async () => {
            await utils.notes.getNotes.invalidate({ petId });
            setBody("");
            toast.success("Note added");
        },
        onError: (err) => toast.error(err.message),
    });
    const deleteEntry = api.notes.deleteEntry.useMutation({
        onSuccess: async () => {
            await utils.notes.getNotes.invalidate({ petId });
            toast.success("Note deleted");
        },
        onError: (err) => toast.error(err.message),
    });

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const trimmed = body.trim();
        if (!trimmed) return;
        record.mutate({ petId, body: trimmed });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <NotebookPen className="h-4 w-4" />
                    Journal
                </CardTitle>
                <CardDescription>
                    Free-form notes — milestones, habits, vet calls.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {canEdit && (
                    <form onSubmit={onSubmit} className="space-y-2">
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={3}
                            maxLength={4096}
                            placeholder="Loves the new toy. Snoring less."
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                size="sm"
                                disabled={record.isPending || !body.trim()}
                            >
                                {record.isPending ? "Saving…" : "Add note"}
                            </Button>
                        </div>
                    </form>
                )}
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : !data || data.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No notes yet.
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {data.map((row) => (
                            <li
                                key={row.id}
                                className="rounded-md border bg-card px-3 py-2 text-sm"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className="whitespace-pre-wrap">{row.body}</p>
                                    {canEdit && (
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            disabled={deleteEntry.isPending}
                                            onClick={() => {
                                                if (!confirm("Delete this note?"))
                                                    return;
                                                deleteEntry.mutate({
                                                    entryId: row.id,
                                                });
                                            }}
                                            aria-label="Delete note"
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    {row.writtenAt.toLocaleString()}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
