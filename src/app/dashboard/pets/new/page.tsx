import Link from "next/link";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";

export default function NewPetPage() {
    return (
        <div className="mx-auto max-w-md">
            <Card>
                <CardHeader>
                    <CardTitle>Add a cat</CardTitle>
                    <CardDescription>
                        The form lands in the next stack. For now this is a placeholder.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild variant="outline">
                        <Link href="/dashboard">Back to dashboard</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
