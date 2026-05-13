"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { PetAvatar } from "~/components/ui/pet-avatar";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/react";

type Pet = RouterOutputs["pet"]["listDeleted"][number];

export function DeletedList({ pets }: { pets: Pet[] }) {
    const router = useRouter();
    const utils = api.useUtils();
    const restorePet = api.pet.restorePet.useMutation({
        onSuccess: async () => {
            await Promise.all([
                utils.pet.getPets.invalidate(),
                utils.pet.listDeleted.invalidate(),
            ]);
            router.refresh();
            toast.success("Pet restored");
        },
        onError: (err) => toast.error(err.message),
    });

    return (
        <ul className="divide-y">
            {pets.map((p) => (
                <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-3"
                >
                    <div className="flex items-center gap-3">
                        <PetAvatar name={p.name} photoUrl={p.photoUrl} />
                        <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground">
                                {p.species} · deleted{" "}
                                {p.deletedAt?.toLocaleDateString() ?? "—"}
                            </div>
                        </div>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => restorePet.mutate({ petId: p.id })}
                        disabled={restorePet.isPending}
                    >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Restore
                    </Button>
                </li>
            ))}
        </ul>
    );
}
