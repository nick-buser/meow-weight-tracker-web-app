import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Users } from "lucide-react";
import { TRPCError } from "@trpc/server";

import { Button } from "~/components/ui/button";
import { PetEditCard } from "~/app/dashboard/pets/[id]/_components/pet-edit-card";
import { PhotoGalleryCard } from "~/app/dashboard/pets/[id]/_components/photo-gallery-card";
import { FeedingHistoryList } from "~/app/dashboard/pets/[id]/_components/feeding-history-list";
import { WeightHistoryList } from "~/app/dashboard/pets/[id]/_components/weight-history-list";
import { ExportCard } from "~/app/dashboard/pets/[id]/_components/export-card";
import { FeedingHeatmapCard } from "~/app/dashboard/pets/[id]/_components/feeding-heatmap-card";
import { HealthEventsCard } from "~/app/dashboard/pets/[id]/_components/health-events-card";
import { AppointmentsCard } from "~/app/dashboard/pets/[id]/_components/appointments-card";
import { MedsCard } from "~/app/dashboard/pets/[id]/_components/meds-card";
import { NotesCard } from "~/app/dashboard/pets/[id]/_components/notes-card";
import { TimelineCard } from "~/app/dashboard/pets/[id]/_components/timeline-card";
import { ImportWeightCard } from "~/app/dashboard/pets/[id]/_components/import-weight-card";
import { DeletePetCard } from "~/app/dashboard/pets/[id]/_components/delete-pet-card";
import { PetAlerts } from "~/app/dashboard/_components/pet-alerts";
import {
    WeightChart,
    WeightStatsCard,
} from "~/app/dashboard/_components/lazy-charts";
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
            <h1 className="sr-only">{pet.name}</h1>
            <div className="flex items-center justify-between">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link href="/dashboard">
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Dashboard
                    </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/pets/${pet.id}/people`}>
                        <Users className="mr-1 h-3.5 w-3.5" />
                        People
                    </Link>
                </Button>
            </div>
            <PetAlerts petId={pet.id} petName={pet.name} />
            <PetEditCard pet={pet} />
            <PhotoGalleryCard
                petId={pet.id}
                canEdit={pet.role !== "Viewer"}
                primaryUrl={pet.photoUrl}
            />
            <WeightStatsCard
                petId={pet.id}
                petName={pet.name}
                goalWeight={pet.goalWeight}
            />
            <WeightChart
                petId={pet.id}
                petName={pet.name}
                goalWeight={pet.goalWeight}
            />
            <WeightHistoryList petId={pet.id} canEdit={pet.role !== "Viewer"} />
            <FeedingHeatmapCard petId={pet.id} />
            <FeedingHistoryList petId={pet.id} canEdit={pet.role !== "Viewer"} />
            <HealthEventsCard petId={pet.id} canEdit={pet.role !== "Viewer"} />
            <AppointmentsCard petId={pet.id} canEdit={pet.role !== "Viewer"} />
            <MedsCard petId={pet.id} canEdit={pet.role !== "Viewer"} />
            <NotesCard petId={pet.id} canEdit={pet.role !== "Viewer"} />
            <TimelineCard petId={pet.id} />
            <ImportWeightCard
                petId={pet.id}
                canEdit={pet.role !== "Viewer"}
            />
            <ExportCard petId={pet.id} />
            <DeletePetCard petId={pet.id} petName={pet.name} role={pet.role} />
        </div>
    );
}
