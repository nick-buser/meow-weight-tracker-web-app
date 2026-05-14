"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
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
    DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

const CONFIRM_PHRASE = "DELETE";

export function DeleteAccountCard() {
    const router = useRouter();
    const { signOut } = useClerk();
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    const deleteAccount = api.account.deleteAccount.useMutation({
        onSuccess: async () => {
            toast.success("Account deleted");
            await signOut();
            router.push("/");
        },
        onError: (err) => toast.error(err.message),
    });

    const canDelete =
        confirmText === CONFIRM_PHRASE && !deleteAccount.isPending;

    return (
        <Card className="border-destructive/40">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Danger zone
                </CardTitle>
                <CardDescription>
                    Deleting your account removes your preferences and your
                    access to every pet. Pets you solely own are deleted; pets
                    shared with others are left for them. This cannot be
                    undone.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog
                    open={open}
                    onOpenChange={(next) => {
                        setOpen(next);
                        if (!next) setConfirmText("");
                    }}
                >
                    <DialogTrigger asChild>
                        <Button type="button" variant="destructive" size="sm">
                            Delete account
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete your account?</DialogTitle>
                            <DialogDescription>
                                This permanently deletes your preferences,
                                your pet memberships, and any pet you solely
                                own. Type{" "}
                                <span className="font-mono font-semibold">
                                    {CONFIRM_PHRASE}
                                </span>{" "}
                                to confirm.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-1">
                            <Label htmlFor="confirm-delete">Confirmation</Label>
                            <Input
                                id="confirm-delete"
                                value={confirmText}
                                onChange={(e) =>
                                    setConfirmText(e.target.value)
                                }
                                placeholder={CONFIRM_PHRASE}
                                autoComplete="off"
                            />
                        </div>
                        {deleteAccount.error && (
                            <p className="text-sm text-destructive">
                                {deleteAccount.error.message}
                            </p>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={deleteAccount.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={!canDelete}
                                onClick={() => deleteAccount.mutate()}
                            >
                                {deleteAccount.isPending
                                    ? "Deleting…"
                                    : "Delete account"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
