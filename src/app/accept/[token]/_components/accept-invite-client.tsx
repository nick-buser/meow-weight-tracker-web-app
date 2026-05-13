"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/react";

export function AcceptInviteClient({ token }: { token: string }) {
    const router = useRouter();
    const tried = useRef(false);

    const accept = api.pet.acceptInvite.useMutation({
        onSuccess: ({ petId }) => {
            toast.success("Invite accepted");
            router.push(`/dashboard/pets/${petId}`);
            router.refresh();
        },
        onError: (err) => toast.error(err.message),
    });

    useEffect(() => {
        if (tried.current) return;
        tried.current = true;
        accept.mutate({ token });
    }, [accept, token]);

    return (
        <div className="container mx-auto max-w-md py-12">
            <Card>
                <CardHeader>
                    <CardTitle>Joining…</CardTitle>
                    <CardDescription>
                        {accept.error
                            ? accept.error.message
                            : "Accepting your invite."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {accept.error && (
                        <p className="text-sm text-destructive">
                            {accept.error.message}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
