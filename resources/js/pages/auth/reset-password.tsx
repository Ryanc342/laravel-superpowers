import { Head } from '@inertiajs/react';
import PasswordField from '@/components/shared/password-field';
import StackedForm from '@/components/shared/stacked-form';
import SubmitButton from '@/components/shared/submit-button';
import TextField from '@/components/shared/text-field';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email, passwordRules }: Props) {
    return (
        <>
            <Head title="Reset password" />

            <StackedForm
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={['password', 'password_confirmation']}
                wideButtons
            >
                {({ errors }) => (
                    <>
                        <TextField
                            id="email"
                            label="Email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={email}
                            readOnly
                            error={errors.email}
                        />

                        <PasswordField
                            id="password"
                            label="Password"
                            name="password"
                            autoComplete="new-password"
                            autoFocus
                            passwordrules={passwordRules}
                            error={errors.password}
                        />

                        <PasswordField
                            id="password_confirmation"
                            label="Confirm password"
                            name="password_confirmation"
                            autoComplete="new-password"
                            passwordrules={passwordRules}
                            error={errors.password_confirmation}
                        />

                        <SubmitButton data-test="reset-password-button">
                            Reset password
                        </SubmitButton>
                    </>
                )}
            </StackedForm>
        </>
    );
}

ResetPassword.layout = {
    title: 'Reset password',
    description: 'Please enter your new password below',
};
