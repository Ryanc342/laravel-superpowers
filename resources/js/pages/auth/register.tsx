import { Head } from '@inertiajs/react';
import PasswordField from '@/components/shared/password-field';
import StackedForm from '@/components/shared/stacked-form';
import SubmitButton from '@/components/shared/submit-button';
import TextField from '@/components/shared/text-field';
import TextLink from '@/components/text-link';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

export default function Register({ passwordRules }: Props) {
    return (
        <>
            <Head title="Register" />
            <StackedForm
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                wideButtons
            >
                {({ errors }) => (
                    <>
                        <TextField
                            id="name"
                            label="Name"
                            type="text"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="name"
                            name="name"
                            error={errors.name}
                        />

                        <TextField
                            id="email"
                            label="Email address"
                            type="email"
                            required
                            tabIndex={2}
                            autoComplete="email"
                            name="email"
                            error={errors.email}
                        />

                        <PasswordField
                            id="password"
                            label="Password"
                            required
                            tabIndex={3}
                            autoComplete="new-password"
                            name="password"
                            passwordrules={passwordRules}
                            error={errors.password}
                        />

                        <PasswordField
                            id="password_confirmation"
                            label="Confirm password"
                            required
                            tabIndex={4}
                            autoComplete="new-password"
                            name="password_confirmation"
                            passwordrules={passwordRules}
                            error={errors.password_confirmation}
                        />

                        <SubmitButton
                            tabIndex={5}
                            data-test="register-user-button"
                        >
                            Create account
                        </SubmitButton>

                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink href={login()} tabIndex={6}>
                                Log in
                            </TextLink>
                        </p>
                    </>
                )}
            </StackedForm>
        </>
    );
}

Register.layout = {
    title: 'Create an account',
    description: 'Enter your details below to create your account',
};
