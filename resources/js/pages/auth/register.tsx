import { Head, Link } from '@inertiajs/react';
import { Button, Flex, Form, Input, Typography } from 'antd';
import FormAlerts from '@/components/auth/form-alerts';
import { msg, t } from '@/lib/i18n';
import { login } from '@/routes';
import { store } from '@/routes/register';
import { useInertiaForm } from '@/ui/form';

export default function Register({ passwordRules }: { passwordRules: string }) {
    const { formProps, processing, unplacedErrors } = useInertiaForm(
        store(),
        { name: '', email: '', password: '', password_confirmation: '' },
        {
            precognitive: false,
            resetOnSuccess: ['password', 'password_confirmation'],
        },
    );

    return (
        <>
            <Head title={t('Register')} />

            <FormAlerts errors={unplacedErrors} />

            <Form {...formProps}>
                <Form.Item label={t('Name')} name="name" required>
                    <Input
                        name="name"
                        // oxlint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        autoComplete="name"
                    />
                </Form.Item>

                <Form.Item label={t('Email address')} name="email" required>
                    <Input name="email" type="email" autoComplete="email" />
                </Form.Item>

                <Form.Item label={t('Password')} name="password" required>
                    <Input.Password
                        name="password"
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
                        data-test="register-user-button"
                    >
                        {t('Create account')}
                    </Button>
                </Form.Item>

                <Flex justify="center" gap="small">
                    <Typography.Text type="secondary">
                        {t('Already have an account?')}
                    </Typography.Text>
                    <Link as={Typography.Link} href={login()}>
                        {t('Log in')}
                    </Link>
                </Flex>
            </Form>
        </>
    );
}

Register.layout = { title: msg('Create an account') };
