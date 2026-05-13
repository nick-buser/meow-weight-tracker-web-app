import { Download } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";

export function ExportCard({ petId }: { petId: number }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Export</CardTitle>
                <CardDescription>
                    Download this pet&apos;s data as CSV.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                    <a href={`/api/pets/${petId}/export?kind=weight`} download>
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Weight CSV
                    </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                    <a href={`/api/pets/${petId}/export?kind=feeding`} download>
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Feeding CSV
                    </a>
                </Button>
            </CardContent>
        </Card>
    );
}
