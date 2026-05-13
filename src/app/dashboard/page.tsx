import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { DashboardContent } from "~/app/dashboard/_components/dashboard-content";
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

    return <DashboardContent pets={pets} />;
}
