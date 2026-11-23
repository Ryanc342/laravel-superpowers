import { Head } from '@inertiajs/react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import Actions from '@/components/shared/actions';
import PasswordField from '@/components/shared/password-field';
import Section from '@/components/shared/section';
import StackedForm from '@/components/shared/stacked-form';
import SubmitButton from '@/components/shared/submit-button';
import { edit } from '@/routes/security';
/* @chisel-passkeys */
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
/* @end-chisel-passkeys */
/* @chisel-2fa */
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
/* @end-chisel-2fa */

// oxfmt-ignore
type Props = {
    passwordRules: string;
} /* @chisel-passkeys */ & ManagePasskeysProps /* @end-chisel-passkeys */ /* @chisel-2fa */ &
    ManageTwoFactorProps; /* @end-chisel-2fa */

export default function Security(props: Props) {
    return (
        <>
            <Head title="Security settings" />

            <Section title="Update password">
                <p className="text-sm text-muted-foreground">
                    Ensure your account is using a long, random password to stay
                    secure
                </p>

                <StackedForm
                    {...SecurityController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                >
                    {({ errors }) => (
                        <>
                            <PasswordField
                                id="current_password"
                                label="Current password"
                                name="current_password"
                                autoComplete="current-password"
                                error={errors.current_password}
                            />

                            <PasswordField
                                id="password"
                                label="New password"
                                name="password"
                                autoComplete="new-password"
                                passwordrules={props.passwordRules}
                                error={errors.password}
                            />

                            <PasswordField
                                id="password_confirmation"
                                label="Confirm password"
                                name="password_confirmation"
                                autoComplete="new-password"
                                passwordrules={props.passwordRules}
                                error={errors.password_confirmation}
                            />

                            <Actions>
                                <SubmitButton data-test="update-password-button">
                                    Save
                                </SubmitButton>
                            </Actions>
                        </>
                    )}
                </StackedForm>
            </Section>

            {/* @chisel-2fa */}
            <ManageTwoFactor
                canManageTwoFactor={props.canManageTwoFactor}
                requiresConfirmation={props.requiresConfirmation}
                twoFactorEnabled={props.twoFactorEnabled}
            />
            {/* @end-chisel-2fa */}

            {/* @chisel-passkeys */}
            <ManagePasskeys
                canManagePasskeys={props.canManagePasskeys}
                passkeys={props.passkeys}
            />
            {/* @end-chisel-passkeys */}
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'Security settings',
            href: edit(),
        },
    ],
};
