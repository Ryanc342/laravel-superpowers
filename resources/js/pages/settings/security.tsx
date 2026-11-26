import { Head } from '@inertiajs/react';
import { Flex } from 'antd';
import PasswordForm from '@/components/settings/password-form';
import Passkeys from '@/components/settings/passkeys';
import TwoFactor from '@/components/settings/two-factor';
import { t } from '@/lib/i18n';
import type { Passkey } from '@/types/auth';

type Props = {
    passwordRules: string;
    canManageTwoFactor: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
    canManagePasskeys: boolean;
    passkeys: Passkey[];
};

/** A feature that is off has no section: the controller says which are on. */
export default function Security({
    passwordRules,
    canManageTwoFactor,
    requiresConfirmation = false,
    twoFactorEnabled = false,
    canManagePasskeys,
    passkeys,
}: Props) {
    return (
        <>
            <Head title={t('Security')} />

            <Flex vertical gap="middle">
                <PasswordForm passwordRules={passwordRules} />

                {canManageTwoFactor && (
                    <TwoFactor
                        requiresConfirmation={requiresConfirmation}
                        twoFactorEnabled={twoFactorEnabled}
                    />
                )}

                {canManagePasskeys && <Passkeys passkeys={passkeys} />}
            </Flex>
        </>
    );
}
