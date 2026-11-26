import { Head } from '@inertiajs/react';
import { Button, Form, Input } from 'antd';
import FormAlerts from '@/components/auth/form-alerts';
import { msg, t } from '@/lib/i18n';
import { update } from '@/routes/password';
import { useInertiaForm } from '@/ui/form';

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email, passwordRules }: Props) {
    // The token has no field. It goes to the server with the form's values.
    const { formProps, processing, unplacedErrors } = useInertiaForm(
        update(),
        { token, email, password: '', password_confirmation: '' },
        {
            precognitive: false,
            resetOnSuccess: ['password', 'password_confirmation'],
        },
    );

    return (
        <>
            <Head title={t('Reset password')} />

            <FormAlerts errors={unplacedErrors} />

            <Form {...formProps} noValidate>
                <Form.Item label={t('Email address')} name="email">
                    <Input
                        name="email"
                        type="email"
                        autoComplete="email"
                        readOnly
                    />
                </Form.Item>

                <Form.Item label={t('Password')} name="password" required>
                    <Input.Password
                        name="password"
                        autoFocus
                        autoComplete="new-password"
                        passwordrules={passwordRules}
                    />
                </Form.Item>

                <Form.Item
                    label={t('Confirm password')}
                    name="password_confirmation"
                    required
                >
                    <Input.Password
                        name="password_confirmation"
                        autoComplete="new-password"
                        passwordrules={passwordRules}
                    />
                </Form.Item>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={processing}
                        data-test="reset-password-button"
                    >
                        {t('Reset password')}
                    </Button>
                </Form.Item>
            </Form>
        </>
    );
}

ResetPassword.layout = { title: msg('Reset password') };
