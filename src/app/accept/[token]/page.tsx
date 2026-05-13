import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AcceptInviteClient } from "~/app/accept/[token]/_components/accept-invite-client";

export default function AcceptInvitePage({
    params,
}: {
    params: { token: string };
}) {
    const { userId } = auth();
    if (!userId) {
        const search = new URLSearchParams({
            redirect_url: `/accept/${params.token}`,
        });
        redirect(`/sign-in?${search.toString()}`);
    }
    return <AcceptInviteClient token={params.token} />;
}
