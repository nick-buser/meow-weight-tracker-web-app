"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";

export function DeletePetCard({
    petId,
    petName,
    role,
}: {
    petId: number;
    petName: string;
    role: "Owner" | "Editor" | "Viewer";
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const utils = api.useUtils();

    const deletePet = api.pet.deletePet.useMutation({
        onSuccess: async () => {
            await utils.pet.getPets.invalidate();
            router.push("/dashboard");
            router.refresh();
            toast.success(`${petName} deleted`);
        },
        onError: (err) => toast.error(err.message),
    });

    if (role !== "Owner") return null;

    return (
        <Card className="border-destructive/40">
            <CardHeader>
                <CardTitle className="text-destructive">Danger zone</CardTitle>
                <CardDescription>
                    Deleting hides {petName} and their history from the dashboard. The
                    data is kept and can be restored by a maintainer.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog open={open} onOpenChange={setOpen}>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete {petName}
                    </Button>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete {petName}?</DialogTitle>
                            <DialogDescription>
                                This hides {petName} and all related weight and feeding
                                history from your dashboard. The records are soft-deleted
                                and recoverable by a maintainer.
                            </DialogDescription>
                        </DialogHeader>
                        {deletePet.error && (
                            <p className="text-sm text-destructive">
                                {deletePet.error.message}
                            </p>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={deletePet.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => deletePet.mutate({ petId })}
                                disabled={deletePet.isPending}
                            >
                                {deletePet.isPending ? "Deleting…" : "Delete"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
