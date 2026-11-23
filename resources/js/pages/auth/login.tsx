import { Head } from '@inertiajs/react';
import CheckboxField from '@/components/shared/checkbox-field';
import PasswordField from '@/components/shared/password-field';
import StackedForm from '@/components/shared/stacked-form';
import StatusMessage from '@/components/shared/status-message';
import SubmitButton from '@/components/shared/submit-button';
import TextField from '@/components/shared/text-field';
import TextLink from '@/components/text-link';
/* @chisel-registration */
import { register } from '@/routes';
/* @end-chisel-registration */
import { store } from '@/routes/login';
import { request } from '@/routes/password';
/* @chisel-passkeys */
import PasskeyVerify from '@/components/passkey-verify';
/* @end-chisel-passkeys */

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Log in" />

            {/* @chisel-passkeys */}
            <PasskeyVerify />
            {/* @end-chisel-passkeys */}

            <StackedForm
                {...store.form()}
                resetOnSuccess={['password']}
                wideButtons
            >
                {({ errors }) => (
                    <>
                        <TextField
                            id="email"
                            label="Email address"
                            type="email"
                            name="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            error={errors.email}
                        />

                        <PasswordField
                            id="password"
                            label="Password"
                            name="password"
                            required
                            tabIndex={2}
                            autoComplete="current-password"
                            error={errors.password}
                        />

                        <div className="flex items-center justify-between gap-4">
                            <CheckboxField
                                id="remember"
                                label="Remember me"
                                name="remember"
                                tabIndex={3}
                            />
                            {canResetPassword && (
                                <TextLink
                                    href={request()}
                                    className="text-sm"
                                    tabIndex={5}
                                >
                                    Forgot your password?
                                </TextLink>
                            )}
                        </div>

                        <SubmitButton tabIndex={4} data-test="login-button">
                            Log in
                        </SubmitButton>

                        {/* @chisel-registration */}
                        <p className="text-center text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <TextLink href={register()} tabIndex={5}>
                                Sign up
                            </TextLink>
                        </p>
                        {/* @end-chisel-registration */}
                    </>
                )}
            </StackedForm>

            <StatusMessage message={status} />
        </>
    );
}

Login.layout = {
    title: 'Log in to your account',
    description: 'Enter your email and password below to log in',
};
