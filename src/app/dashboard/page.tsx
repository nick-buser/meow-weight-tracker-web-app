import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { PetPicker } from "~/app/dashboard/_components/pet-picker";
import { api } from "~/trpc/server";

export default async function DashboardPage() {
    const pets = await api.pet.getPets();

    if (pets.length === 0) {
        return (
            <div className="mx-auto max-w-md">
                <Card>
                    <CardHeader>
                        <CardTitle>No cats yet</CardTitle>
                        <CardDescription>
                            Add your first cat to start tracking weight and feedings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/dashboard/pets/new">Add a cat</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PetPicker pets={pets} />
            <QuickLogPlaceholders />
        </div>
    );
}

function QuickLogPlaceholders() {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Card aria-disabled className="opacity-60">
                <CardHeader>
                    <CardTitle>Log weight</CardTitle>
                    <CardDescription>
                        Coming next: one tap, one number, done.
                    </CardDescription>
                </CardHeader>
            </Card>
            <Card aria-disabled className="opacity-60">
                <CardHeader>
                    <CardTitle>Log feeding</CardTitle>
                    <CardDescription>
                        Coming soon: pick a food, enter grams, done.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
