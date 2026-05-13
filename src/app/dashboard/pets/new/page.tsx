import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { NewPetForm } from "~/app/dashboard/pets/new/_components/new-pet-form";

export default function NewPetPage() {
    return (
        <div className="mx-auto max-w-md">
            <Card>
                <CardHeader>
                    <CardTitle>Add a cat</CardTitle>
                    <CardDescription>
                        We&apos;ll use this to track weight, feedings, and habits.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <NewPetForm />
                </CardContent>
            </Card>
        </div>
    );
}
