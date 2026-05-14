import { DashboardContent } from "~/app/dashboard/_components/dashboard-content";
import { OnboardingWelcome } from "~/app/dashboard/_components/onboarding-welcome";
import { api } from "~/trpc/server";

export default async function DashboardPage() {
    const pets = await api.pet.getPets();

    if (pets.length === 0) {
        return <OnboardingWelcome />;
    }

    return <DashboardContent pets={pets} />;
}
