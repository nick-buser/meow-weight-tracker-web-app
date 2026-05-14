"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Images, Star, Trash2 } from "lucide-react";
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
import { api } from "~/trpc/react";

export function PhotoGalleryCard({
    petId,
    canEdit,
    primaryUrl,
}: {
    petId: number;
    canEdit: boolean;
    primaryUrl: string | null;
}) {
    const router = useRouter();
    const utils = api.useUtils();
    const { data, isLoading } = api.photos.list.useQuery({ petId });

    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [caption, setCaption] = useState("");
    const [takenAt, setTakenAt] = useState("");
    const [uploading, setUploading] = useState(false);

    const add = api.photos.add.useMutation({
        onSuccess: async () => {
            await utils.photos.list.invalidate({ petId });
            setOpen(false);
            setFile(null);
            setCaption("");
            setTakenAt("");
            toast.success("Photo added");
        },
        onError: (err) => toast.error(err.message),
    });
    const setPrimary = api.photos.setPrimary.useMutation({
        onSuccess: async () => {
            await utils.photos.list.invalidate({ petId });
            router.refresh();
            toast.success("Primary photo updated");
        },
        onError: (err) => toast.error(err.message),
    });
    const remove = api.photos.remove.useMutation({
        onSuccess: async () => {
            await utils.photos.list.invalidate({ petId });
            router.refresh();
            toast.success("Photo deleted");
        },
        onError: (err) => toast.error(err.message),
    });

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!file) {
            toast.error("Choose an image first");
            return;
        }
        setUploading(true);
        try {
            const form = new FormData();
            form.set("file", file);
            form.set("petId", String(petId));
            const res = await fetch(`/api/pets/${petId}/photo`, {
                method: "POST",
                body: form,
            });
            if (!res.ok) {
                toast.error((await res.text()) || "Upload failed");
                return;
            }
            const uploaded = (await res.json()) as { url: string };
            add.mutate({
                petId,
                url: uploaded.url,
                ...(caption.trim() ? { caption: caption.trim() } : {}),
                ...(takenAt ? { takenAt: new Date(takenAt) } : {}),
            });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    }

    const busy = uploading || add.isPending;

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Images className="h-4 w-4" />
                        Photos
                    </CardTitle>
                    <CardDescription>
                        A visual history, newest first.
                    </CardDescription>
                </div>
                {canEdit && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button type="button" size="sm" variant="outline">
                                <ImagePlus className="mr-1 h-3.5 w-3.5" />
                                Add photo
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add photo</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={onSubmit} className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="pg-file">Image</Label>
                                    <input
                                        id="pg-file"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={(e) =>
                                            setFile(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="pg-caption">Caption</Label>
                                    <Input
                                        id="pg-caption"
                                        value={caption}
                                        onChange={(e) =>
                                            setCaption(e.target.value)
                                        }
                                        placeholder="Napping in the sun"
                                        maxLength={256}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="pg-when">Taken on</Label>
                                    <Input
                                        id="pg-when"
                                        type="datetime-local"
                                        value={takenAt}
                                        onChange={(e) =>
                                            setTakenAt(e.target.value)
                                        }
                                        max={new Date()
                                            .toISOString()
                                            .slice(0, 16)}
                                    />
                                </div>
                                {add.error && (
                                    <p className="text-sm text-destructive">
                                        {add.error.message}
                                    </p>
                                )}
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setOpen(false)}
                                        disabled={busy}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={busy}>
                                        {busy ? "Saving…" : "Save"}
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
                        icon={Images}
                        title="No photos yet"
                        description="Upload photos to build a visual history of your pet."
                    />
                ) : (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {data.map((photo) => {
                            const isPrimary =
                                primaryUrl !== null &&
                                photo.url === primaryUrl;
                            return (
                                <li
                                    key={photo.id}
                                    className="group relative overflow-hidden rounded-lg border"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={photo.url}
                                        alt={photo.caption ?? ""}
                                        className="aspect-square w-full object-cover"
                                    />
                                    {isPrimary && (
                                        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium">
                                            <Star className="h-3 w-3 fill-current" />
                                            Primary
                                        </span>
                                    )}
                                    {canEdit && (
                                        <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                                            {!isPrimary && (
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="secondary"
                                                    className="h-7 w-7"
                                                    disabled={
                                                        setPrimary.isPending
                                                    }
                                                    aria-label="Set as primary photo"
                                                    onClick={() =>
                                                        setPrimary.mutate({
                                                            photoId: photo.id,
                                                        })
                                                    }
                                                >
                                                    <Star className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="secondary"
                                                className="h-7 w-7 text-destructive"
                                                disabled={remove.isPending}
                                                aria-label="Delete photo"
                                                onClick={() => {
                                                    if (
                                                        !confirm(
                                                            "Delete this photo?",
                                                        )
                                                    )
                                                        return;
                                                    remove.mutate({
                                                        photoId: photo.id,
                                                    });
                                                }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                    <div className="space-y-0.5 p-2">
                                        {photo.caption && (
                                            <p className="truncate text-xs font-medium">
                                                {photo.caption}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-muted-foreground">
                                            {photo.takenAt.toLocaleDateString()}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
