import { router } from '@inertiajs/react';
import PasskeyItem from '@/components/passkey-item';
import PasskeyRegistration from '@/components/passkey-register';
import EmptyState from '@/components/shared/empty-state';
import Section from '@/components/shared/section';
import type { Passkey } from '@/types/auth';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

export default function ManagePasskeys(props: Props) {
    const passkeys = props.passkeys ?? [];

    const handleRegisterSuccess = () => {
        router.reload();
    };

    if (!(props.canManagePasskeys ?? false)) {
        return null;
    }

    return (
        <Section title="Passkeys">
            <p className="text-sm text-muted-foreground">
                Manage your passkeys for passwordless sign-in
            </p>

            <div className="overflow-hidden rounded-lg border border-border">
                {passkeys.length > 0 ? (
                    passkeys.map((passkey) => (
                        <PasskeyItem key={passkey.id} passkey={passkey} />
                    ))
                ) : (
                    <div className="p-8">
                        <EmptyState message="No passkeys yet" />
                    </div>
                )}
            </div>

            <PasskeyRegistration onSuccess={handleRegisterSuccess} />
        </Section>
    );
}
