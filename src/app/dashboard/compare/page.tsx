import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Button } from "~/components/ui/button";
import { WeightComparison } from "~/app/dashboard/_components/lazy-charts";

export default function ComparePage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link href="/dashboard">
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Dashboard
                    </Link>
                </Button>
            </div>
            <div>
                <h1 className="text-lg font-semibold">Compare weights</h1>
                <p className="text-sm text-muted-foreground">
                    Overlay every pet&apos;s weight history on one chart.
                </p>
            </div>
            <WeightComparison />
        </div>
    );
}
