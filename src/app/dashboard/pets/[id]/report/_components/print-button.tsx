"use client";

import { Printer } from "lucide-react";

import { Button } from "~/components/ui/button";

export function PrintButton() {
    return (
        <Button
            type="button"
            size="sm"
            onClick={() => window.print()}
            className="print:hidden"
        >
            <Printer className="mr-1 h-3.5 w-3.5" />
            Print / Save as PDF
        </Button>
    );
}
