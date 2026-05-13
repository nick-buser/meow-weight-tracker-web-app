import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { TRPCError } from "@trpc/server";

import { Button } from "~/components/ui/button";
import { PetEditCard } from "~/app/dashboard/pets/[id]/_components/pet-edit-card";
import { FeedingHistoryList } from "~/app/dashboard/pets/[id]/_components/feeding-history-list";
import { DeletePetCard } from "~/app/dashboard/pets/[id]/_components/delete-pet-card";
import { WeightChart } from "~/app/dashboard/_components/weight-chart";
import { api } from "~/trpc/server";

export default async function PetDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const petId = Number(params.id);
    if (!Number.isFinite(petId) || petId <= 0) notFound();

    let pet;
    try {
        pet = await api.pet.getPet({ petId });
    } catch (err) {
        if (err instanceof TRPCError && err.code === "FORBIDDEN") notFound();
        if (err instanceof TRPCError && err.code === "NOT_FOUND") notFound();
        throw err;
    }

    return (
        <div className="space-y-6">
            <div>
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link href="/dashboard">
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Dashboard
                    </Link>
                </Button>
            </div>
            <PetEditCard pet={pet} />
            <WeightChart
                petId={pet.id}
                petName={pet.name}
                goalWeight={pet.goalWeight}
            />
            <FeedingHistoryList petId={pet.id} />
            <DeletePetCard petId={pet.id} petName={pet.name} role={pet.role} />
        </div>
    );
}
