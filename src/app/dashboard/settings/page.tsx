import { SettingsForm } from "~/app/dashboard/settings/_components/settings-form";

export const metadata = {
    title: "Settings",
};

export default function SettingsPage() {
    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Settings</h1>
                <p className="text-sm text-muted-foreground">
                    Preferences apply to your account across every pet.
                </p>
            </div>
            <SettingsForm />
        </div>
    );
}
