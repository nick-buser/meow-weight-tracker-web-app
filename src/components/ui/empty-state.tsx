import { type LucideIcon } from "lucide-react";

import { cn } from "~/lib/utils";

/**
 * Consistent empty-state block: a muted icon chip, a short title, and an
 * optional description. Pass children for a call-to-action button.
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    className,
    children,
}: {
    icon?: LucideIcon;
    title: string;
    description?: string;
    className?: string;
    children?: React.ReactNode;
}) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-2 px-4 py-8 text-center",
                className,
            )}
        >
            {Icon && (
                <div className="rounded-full bg-muted p-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
            )}
            <div className="space-y-0.5">
                <p className="text-sm font-medium">{title}</p>
                {description && (
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
}
