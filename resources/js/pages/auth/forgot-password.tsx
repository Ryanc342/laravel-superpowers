import { Head } from '@inertiajs/react';
import StackedForm from '@/components/shared/stacked-form';
import StatusMessage from '@/components/shared/status-message';
import SubmitButton from '@/components/shared/submit-button';
import TextField from '@/components/shared/text-field';
import TextLink from '@/components/text-link';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Forgot password" />

            <div className="grid gap-6">
                <StatusMessage message={status} />

                <StackedForm {...email.form()} wideButtons>
                    {({ errors }) => (
                        <>
                            <TextField
                                id="email"
                                label="Email address"
                                type="email"
                                name="email"
                                autoComplete="off"
                                autoFocus
                                error={errors.email}
                            />

                            <SubmitButton data-test="email-password-reset-link-button">
                                Email password reset link
                            </SubmitButton>
                        </>
                    )}
                </StackedForm>

                <p className="space-x-1 text-center text-sm text-muted-foreground">
                    <span>Or, return to</span>
                    <TextLink href={login()}>log in</TextLink>
                </p>
            </div>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Forgot password',
    description: 'Enter your email to receive a password reset link',
};
