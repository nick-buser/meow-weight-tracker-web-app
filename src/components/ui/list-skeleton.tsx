import { Skeleton } from "~/components/ui/skeleton";

/**
 * Loading placeholder for list and table cards: a few full-width
 * skeleton rows. role="status" + an sr-only label keeps the loading
 * state announced to screen readers, which a bare skeleton would not.
 */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div role="status" className="space-y-2">
            <span className="sr-only">Loading…</span>
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton
                    key={i}
                    className="h-10 w-full"
                    aria-hidden="true"
                />
            ))}
        </div>
    );
}
