import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { TRPCError } from "@trpc/server";

import { Button } from "~/components/ui/button";
import { PeopleManager } from "~/app/dashboard/pets/[id]/people/_components/people-manager";
import { api } from "~/trpc/server";

export default async function PeoplePage({
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
                    <Link href={`/dashboard/pets/${pet.id}`}>
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Back to {pet.name}
                    </Link>
                </Button>
            </div>
            <PeopleManager petId={pet.id} petName={pet.name} role={pet.role} />
        </div>
    );
}
