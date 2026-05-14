"use client";

import { useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";

type Role = "Owner" | "Editor" | "Viewer";

export function PeopleManager({
    petId,
    petName,
    role,
}: {
    petId: number;
    petName: string;
    role: Role;
}) {
    const utils = api.useUtils();
    const people = api.pet.listPeople.useQuery({ petId });
    const invites = api.pet.listInvites.useQuery(
        { petId },
        { enabled: role === "Owner" },
    );
    const [inviteRole, setInviteRole] = useState<Role>("Editor");
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);

    const createInvite = api.pet.createInvite.useMutation({
        onSuccess: async (invite) => {
            const url = `${window.location.origin}/accept/${invite.token}`;
            setInviteUrl(url);
            await utils.pet.listInvites.invalidate({ petId });
            toast.success("Invite link generated");
        },
        onError: (err) => toast.error(err.message),
    });
    const revokeInvite = api.pet.revokeInvite.useMutation({
        onSuccess: async () => {
            await utils.pet.listInvites.invalidate({ petId });
            toast.success("Invite revoked");
        },
        onError: (err) => toast.error(err.message),
    });
    const removePerson = api.pet.removePerson.useMutation({
        onSuccess: async () => {
            await utils.pet.listPeople.invalidate({ petId });
            toast.success("Person removed");
        },
        onError: (err) => toast.error(err.message),
    });

    const canManage = role === "Owner";

    async function copyToClipboard() {
        if (!inviteUrl) return;
        try {
            await navigator.clipboard.writeText(inviteUrl);
            toast.success("Link copied");
        } catch {
            toast.error("Couldn't copy — select and copy the link manually.");
        }
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>People with access to {petName}</CardTitle>
                    <CardDescription>
                        Owners can manage people. Editors can record entries.
                        Viewers can only read.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {people.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : !people.data || people.data.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No one yet.
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {people.data.map((p) => {
                                const profile = p.profile;
                                const fullName = profile
                                    ? [profile.firstName, profile.lastName]
                                          .filter(Boolean)
                                          .join(" ")
                                    : "";
                                const displayName =
                                    fullName.length > 0
                                        ? fullName
                                        : profile?.email && profile.email.length > 0
                                          ? profile.email
                                          : p.userId;
                                return (
                                <li
                                    key={p.userId}
                                    className="flex items-center justify-between gap-3 py-2 text-sm"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        {profile?.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={profile.imageUrl}
                                                alt=""
                                                className="h-8 w-8 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                                {displayName
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="truncate font-medium">
                                                {displayName}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {p.role}
                                                {profile?.email &&
                                                displayName !== profile.email
                                                    ? ` · ${profile.email}`
                                                    : ""}
                                                {" · added "}
                                                {p.addedAt.toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    {canManage && (
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            disabled={removePerson.isPending}
                                            onClick={() => {
                                                if (
                                                    !confirm(
                                                        `Remove this person from ${petName}?`,
                                                    )
                                                )
                                                    return;
                                                removePerson.mutate({
                                                    petId,
                                                    userId: p.userId,
                                                });
                                            }}
                                            aria-label="Remove person"
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>

            {canManage && (
                <Card>
                    <CardHeader>
                        <CardTitle>Invite a co-owner</CardTitle>
                        <CardDescription>
                            Generate a single-use link. Whoever opens it signs in
                            and joins {petName} at the chosen role.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-1">
                            <Label htmlFor="invite-role">Role</Label>
                            <select
                                id="invite-role"
                                value={inviteRole}
                                onChange={(e) =>
                                    setInviteRole(e.target.value as Role)
                                }
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="Editor">Editor</option>
                                <option value="Viewer">Viewer</option>
                            </select>
                        </div>
                        <Button
                            type="button"
                            disabled={createInvite.isPending}
                            onClick={() =>
                                createInvite.mutate({ petId, role: inviteRole })
                            }
                        >
                            {createInvite.isPending
                                ? "Generating…"
                                : "Generate link"}
                        </Button>
                        {inviteUrl && (
                            <div className="space-y-2 rounded-md border bg-muted p-3 text-sm">
                                <div className="break-all font-mono text-xs">
                                    {inviteUrl}
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={copyToClipboard}
                                >
                                    <Copy className="mr-1 h-3.5 w-3.5" />
                                    Copy link
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {canManage && invites.data && invites.data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pending invites</CardTitle>
                        <CardDescription>
                            7-day expiry. Revoke to invalidate immediately.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="divide-y">
                            {invites.data.map((inv) => {
                                const status =
                                    inv.acceptedAt !== null
                                        ? `accepted ${inv.acceptedAt.toLocaleDateString()}`
                                        : inv.revokedAt !== null
                                          ? "revoked"
                                          : inv.expiresAt &&
                                              inv.expiresAt.getTime() < Date.now()
                                            ? "expired"
                                            : inv.expiresAt
                                              ? `expires ${inv.expiresAt.toLocaleDateString()}`
                                              : "active";
                                const active =
                                    inv.acceptedAt === null &&
                                    inv.revokedAt === null &&
                                    (!inv.expiresAt ||
                                        inv.expiresAt.getTime() >= Date.now());
                                return (
                                    <li
                                        key={inv.token}
                                        className="flex items-center justify-between gap-3 py-2 text-sm"
                                    >
                                        <div className="min-w-0">
                                            <div className="font-medium">
                                                {inv.role}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {status}
                                            </div>
                                        </div>
                                        {active && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={revokeInvite.isPending}
                                                onClick={() => {
                                                    if (
                                                        !confirm(
                                                            "Revoke this invite?",
                                                        )
                                                    )
                                                        return;
                                                    revokeInvite.mutate({
                                                        token: inv.token,
                                                    });
                                                }}
                                            >
                                                Revoke
                                            </Button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
