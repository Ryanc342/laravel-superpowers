import { Head } from '@inertiajs/react';
import PasswordField from '@/components/shared/password-field';
import StackedForm from '@/components/shared/stacked-form';
import SubmitButton from '@/components/shared/submit-button';
import { store } from '@/routes/password/confirm';
/* @chisel-passkeys */
import {
    index as confirmOptions,
    store as confirmStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';
import PasskeyVerify from '@/components/passkey-verify';
/* @end-chisel-passkeys */

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Confirm password" />

            {/* @chisel-passkeys */}
            <PasskeyVerify
                routes={{
                    options: confirmOptions(),
                    submit: confirmStore(),
                }}
                label="Confirm with passkey"
                loadingLabel="Confirming..."
                separator="Or confirm with password"
            />
            {/* @end-chisel-passkeys */}

            <StackedForm
                {...store.form()}
                resetOnSuccess={['password']}
                wideButtons
            >
                {({ errors }) => (
                    <>
                        <PasswordField
                            id="password"
                            label="Password"
                            name="password"
                            autoComplete="current-password"
                            autoFocus
                            error={errors.password}
                        />

                        <SubmitButton data-test="confirm-password-button">
                            Confirm password
                        </SubmitButton>
                    </>
                )}
            </StackedForm>
        </>
    );
}

ConfirmPassword.layout = {
    title: 'Confirm password',
    description:
        'This is a secure area of the application. Please confirm your password before continuing.',
};
