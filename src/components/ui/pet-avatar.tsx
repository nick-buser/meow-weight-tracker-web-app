import { cn } from "~/lib/utils";

export function PetAvatar({
    name,
    photoUrl,
    size = "md",
}: {
    name: string;
    photoUrl: string | null;
    size?: "sm" | "md" | "lg";
}) {
    const dims = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-16 w-16" : "h-10 w-10";
    const text = size === "sm" ? "text-xs" : size === "lg" ? "text-xl" : "text-base";
    if (photoUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={photoUrl}
                alt=""
                className={cn(dims, "rounded-full object-cover")}
            />
        );
    }
    return (
        <div
            className={cn(
                dims,
                text,
                "flex items-center justify-center rounded-full bg-muted font-semibold",
            )}
        >
            {name.charAt(0).toUpperCase()}
        </div>
    );
}
