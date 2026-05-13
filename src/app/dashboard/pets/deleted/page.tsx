import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { DeletedList } from "~/app/dashboard/pets/deleted/_components/deleted-list";
import { api } from "~/trpc/server";

export default async function DeletedPetsPage() {
    const pets = await api.pet.listDeleted();
    return (
        <div className="space-y-4">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
                <Link href="/dashboard">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Dashboard
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Deleted pets</CardTitle>
                    <CardDescription>
                        Only pets you own appear here. Restoring brings the pet
                        and its history back to the dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {pets.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No deleted pets.
                        </p>
                    ) : (
                        <DeletedList pets={pets} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
